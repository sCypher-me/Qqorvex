/**
 * Documentos — OCR (docs/decisions/documentos-ocr-design.md). Tesseract.js roda 100% no
 * navegador (WebAssembly + dados de treinamento baixados sob demanda pela própria lib) — sem
 * chave, sem Edge Function, sem custo, mesmo espírito das outras integrações client-side deste
 * projeto. Import dinâmico porque a lib é pesada e só interessa a quem realmente clicar em
 * "Extrair texto" num documento de imagem.
 */
export async function extractTextFromImage(imageUrl: string, onProgress?: (percent: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", undefined, {
    logger: (message) => {
      if (message.status === "recognizing text" && onProgress) {
        onProgress(Math.round(message.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(imageUrl);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}
