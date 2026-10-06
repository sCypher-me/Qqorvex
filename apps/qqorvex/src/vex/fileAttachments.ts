import type { ChatMessage } from "@qqorvex/vex";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_TEXT_CHARS = 60_000;
const MAX_PDF_PAGES = 120;
const MAX_DOCX_EXPANDED_BYTES = 64 * 1024 * 1024;
const ATTACHMENT_MARKER = "\u001eQQORVEX_ATTACHMENT_V1:";

export interface ExtractedVexFile {
  fileName: string;
  mimeType: string;
  text: string;
}

export interface VexFileMessage {
  prompt: string;
  file: ExtractedVexFile;
}

type FileSelection = Pick<File, "name" | "size">;

export function validateVexFileSelection(file: FileSelection): string | null {
  const extension = file.name.toLocaleLowerCase("en-US").match(/\.([^.]+)$/)?.[1];
  if (!extension || !["txt", "pdf", "docx"].includes(extension)) {
    return "Envie um arquivo .txt, .pdf ou .docx do Word.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return "O arquivo está vazio.";
  if (file.size > MAX_FILE_BYTES) return "O limite para arquivos enviados à Vex é 10 MB.";
  return null;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeTextFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
  }
  const payload = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  return new TextDecoder("utf-8", { fatal: true }).decode(payload);
}

function validateDocxArchive(buffer: ArrayBuffer): void {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const start = Math.max(0, bytes.length - 65_557);
  let endRecord = -1;
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      endRecord = index;
      break;
    }
  }
  if (endRecord < 0) throw new Error("Este arquivo Word não parece ser um .docx válido.");

  const entryCount = view.getUint16(endRecord + 10, true);
  const centralDirectoryOffset = view.getUint32(endRecord + 16, true);
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("Este arquivo Word usa um formato compactado que ainda não é aceito.");
  }

  let offset = centralDirectoryOffset;
  let expandedBytes = 0;
  let hasMainDocument = false;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  for (let entry = 0; entry < entryCount; entry += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Não consegui validar o conteúdo compactado deste arquivo Word.");
    }
    const uncompressedBytes = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const entryEnd = offset + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > bytes.length || uncompressedBytes === 0xffffffff) {
      throw new Error("Este arquivo Word usa um formato compactado que ainda não é aceito.");
    }
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    expandedBytes += uncompressedBytes;
    if (expandedBytes > MAX_DOCX_EXPANDED_BYTES) {
      throw new Error("O conteúdo descompactado do arquivo Word ultrapassa o limite seguro de 64 MB.");
    }
    if (name === "word/document.xml") hasMainDocument = true;
    offset = entryEnd;
  }
  if (!hasMainDocument) throw new Error("Não encontrei o texto principal neste arquivo Word.");
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("Este arquivo não parece ser um PDF válido.");
  }

  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`O limite atual é de ${MAX_PDF_PAGES} páginas por arquivo.`);
    }
    const pages: string[] = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "")
        .join("");
      length += pageText.length;
      if (length > MAX_FILE_TEXT_CHARS) {
        throw new Error(`O arquivo tem mais de ${MAX_FILE_TEXT_CHARS.toLocaleString("pt-BR")} caracteres. Envie uma versão menor para a Vex conseguir considerar o conteúdo inteiro.`);
      }
      pages.push(pageText);
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("Este arquivo Word não parece ser um .docx válido.");
  }
  validateDocxArchive(buffer);
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export async function extractVexFile(file: File): Promise<ExtractedVexFile> {
  const validationError = validateVexFileSelection(file);
  if (validationError) throw new Error(validationError);
  const extension = file.name.toLocaleLowerCase("en-US").split(".").pop();
  const buffer = await file.arrayBuffer();
  let extracted = "";
  let mimeType = "";

  if (extension === "txt") {
    mimeType = "text/plain";
    try {
      extracted = decodeTextFile(buffer);
    } catch {
      throw new Error("Não consegui ler este .txt como texto UTF-8 ou UTF-16.");
    }
  } else if (extension === "pdf") {
    mimeType = "application/pdf";
    extracted = await extractPdfText(buffer);
  } else if (extension === "docx") {
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    try {
      extracted = await extractDocxText(buffer);
    } catch (error) {
      if (error instanceof Error && error.message) throw error;
      throw new Error("Não consegui extrair o texto deste arquivo Word.");
    }
  } else {
    throw new Error("Envie um arquivo .txt, .pdf ou .docx do Word.");
  }

  const text = normalizeExtractedText(extracted);
  if (!text) {
    throw new Error(extension === "pdf"
      ? "Não encontrei texto selecionável neste PDF. PDFs que são apenas imagens precisam de OCR antes de serem enviados à Vex."
      : "Não encontrei texto legível neste arquivo.");
  }
  if (text.length > MAX_FILE_TEXT_CHARS) {
    throw new Error(`O arquivo tem mais de ${MAX_FILE_TEXT_CHARS.toLocaleString("pt-BR")} caracteres. Envie uma versão menor para a Vex conseguir considerar o conteúdo inteiro.`);
  }

  return {
    fileName: file.name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180) || "arquivo enviado",
    mimeType,
    text,
  };
}

export function encodeVexAttachmentMessage(prompt: string, file: ExtractedVexFile): string {
  // Store one JSON payload after the marker. JSON escapes control characters in the
  // extracted text, so a document containing the marker cannot forge a second attachment.
  return `${ATTACHMENT_MARKER}${JSON.stringify({ version: 1, prompt: prompt.trim(), file })}`;
}

export function decodeVexAttachmentMessage(content: string): VexFileMessage | null {
  if (!content.startsWith(ATTACHMENT_MARKER)) return null;
  try {
    const payload = JSON.parse(content.slice(ATTACHMENT_MARKER.length)) as Record<string, unknown>;
    const file = payload.file as Record<string, unknown> | undefined;
    if (
      payload.version !== 1
      || typeof payload.prompt !== "string"
      || !file
      || typeof file.fileName !== "string"
      || typeof file.mimeType !== "string"
      || typeof file.text !== "string"
      || file.text.length <= 0
      || file.text.length > MAX_FILE_TEXT_CHARS
    ) return null;
    return {
      prompt: payload.prompt,
      file: { fileName: file.fileName, mimeType: file.mimeType, text: file.text },
    };
  } catch {
    return null;
  }
}

export function splitVexAttachmentText(file: ExtractedVexFile, chunkSize = 9_000): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < file.text.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, file.text.length);
    chunks.push(`Arquivo anexado: ${file.fileName} (${file.mimeType}). Parte ${chunks.length + 1}.\n${file.text.slice(offset, end)}`);
  }
  return chunks;
}

export function buildVexAttachmentChatMessages(prompt: string, file: ExtractedVexFile): ChatMessage[] {
  return [
    { role: "user", content: prompt || "Leia o arquivo anexado e me pergunte o que eu gostaria de fazer com ele." },
    ...splitVexAttachmentText(file).map((content) => ({ role: "tool" as const, toolName: "arquivo_enviado", content })),
  ];
}

export const VEX_FILE_LIMIT_BYTES = MAX_FILE_BYTES;
