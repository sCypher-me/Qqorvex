import type { FormulaContext, FormulaValue } from "./formula";
import type { BlockType, EditableBlockType, PageProperty } from "./types";

/** Rótulos em pt-BR dos tipos de bloco editáveis na v1 — usados no menu "/" e no dropdown de trocar tipo. */
export const BLOCK_TYPE_LABELS: Record<EditableBlockType, string> = {
  texto: "Texto",
  titulo1: "Título 1",
  titulo2: "Título 2",
  titulo3: "Título 3",
  lista: "Lista",
  checklist: "Checklist",
  citacao: "Citação",
  callout: "Callout",
  codigo: "Código",
  divisor: "Divisor",
  toggle: "Toggle",
  imagem: "Imagem",
  arquivo: "Arquivo",
  link: "Link",
  referencia_pagina: "Referência de Página",
  tabela: "Tabela",
  equacao: "Equação",
  referencia_entidade: "Referência de Entidade",
  embed: "Embed",
};

/** Conteúdo inicial de um bloco novo (ou de um bloco que acabou de trocar de tipo) — cada forma bate com a interface homônima em `types.ts`. */
export function defaultContentForBlockType(blockType: BlockType): Record<string, unknown> {
  switch (blockType) {
    case "checklist":
      return { text: "", checked: false };
    case "codigo":
      return { text: "", language: undefined };
    case "toggle":
      return { summary: "", details: "" };
    case "divisor":
      return {};
    case "imagem":
    case "arquivo":
      return { documentId: null };
    case "link":
      return { url: "" };
    case "referencia_pagina":
      return { pageId: null };
    case "tabela":
      return {
        columns: ["Coluna 1", "Coluna 2"],
        rows: [
          ["", ""],
          ["", ""],
        ],
      };
    case "equacao":
      return { latex: "" };
    case "referencia_entidade":
      return { entityType: null, entityId: null };
    case "embed":
      return { url: "" };
    default:
      return { text: "" };
  }
}

/**
 * Nunca renderiza um iframe de URL arbitrária — risco de segurança real (clickjacking, phishing
 * disfarçado de embed), não só técnico. Só URLs que batem com um provedor conhecido são
 * convertidas pra sua URL de embed oficial; qualquer outra retorna `null` e a UI mostra "Esse
 * link não é suportado" em vez de tentar embutir.
 */
export function resolveEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (host === "youtu.be") {
    const videoId = url.pathname.slice(1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (host === "vimeo.com") {
    const videoId = url.pathname.slice(1);
    return /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null;
  }
  if (host === "open.spotify.com") {
    return `https://open.spotify.com/embed${url.pathname}`;
  }
  if (host === "figma.com") {
    return `https://www.figma.com/embed?embed_host=qqorvex&url=${encodeURIComponent(url.toString())}`;
  }
  if (host === "codepen.io") {
    const match = url.pathname.match(/^\/([^/]+)\/pen\/([^/]+)/);
    return match ? `https://codepen.io/${match[1]}/embed/${match[2]}` : null;
  }
  return null;
}

export function buildFormulaContext(properties: PageProperty[]): FormulaContext {
  const context: FormulaContext = {};
  for (const property of properties) {
    context[property.key] = property.value as FormulaValue;
  }
  return context;
}

export const DAILY_NOTE_PAGE_TYPE = "nota_do_dia";

/** "Nota do Dia" — o título é a própria data ISO, usado como chave de busca/idempotência. */
export function formatDailyNoteTitle(date: Date): string {
  return date.toISOString().slice(0, 10);
}
