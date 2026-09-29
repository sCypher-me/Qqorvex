/**
 * Markdown mínimo para as respostas da Vex: o modelo escreve listas, negrito e títulos, e mostrar
 * isso cru ("**9h** - reunião") deixa a conversa com cara de protótipo. O parser gera uma árvore
 * simples que vira elementos React — nunca HTML em string, então conteúdo do modelo não injeta
 * marcação. Cobre só o que a Vex usa: parágrafos, títulos, listas (com um nível de aninhamento),
 * citações, blocos de código, tabelas, separadores, **negrito**, *itálico*, `código` e links http(s).
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export interface ListItem {
  c: Inline[];
  children?: Block;
}

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: 3 | 4; c: Inline[] }
  | { t: "ul"; items: ListItem[] }
  | { t: "ol"; items: ListItem[]; start: number }
  | { t: "quote"; c: Inline[] }
  | { t: "pre"; v: string }
  | { t: "hr" }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] };

const WORD = /[\p{L}\p{N}]/u;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ t: "text", v: buffer });
    buffer = "";
  };

  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const previous = i > 0 ? source[i - 1]! : "";
    let match: RegExpExecArray | null;

    if (rest[0] === "`" && (match = /^`([^`\n]+)`/.exec(rest))) {
      flush();
      out.push({ t: "code", v: match[1]! });
      i += match[0].length;
      continue;
    }
    if ((match = /^\*\*(?=\S)([\s\S]+?)\*\*/.exec(rest)) || (match = /^__(?=\S)([\s\S]+?)__/.exec(rest))) {
      flush();
      out.push({ t: "strong", c: parseInline(match[1]!) });
      i += match[0].length;
      continue;
    }
    if (rest[0] === "*" && (match = /^\*([^*\s](?:[^*]*[^*\s])?)\*/.exec(rest))) {
      flush();
      out.push({ t: "em", c: parseInline(match[1]!) });
      i += match[0].length;
      continue;
    }
    if (rest[0] === "_" && !WORD.test(previous) && (match = /^_([^_\s](?:[^_]*[^_\s])?)_/.exec(rest)) && !WORD.test(source[i + match[0].length] ?? "")) {
      flush();
      out.push({ t: "em", c: parseInline(match[1]!) });
      i += match[0].length;
      continue;
    }
    if (rest[0] === "[" && (match = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/.exec(rest))) {
      flush();
      out.push({ t: "link", href: match[2]!, c: parseInline(match[1]!) });
      i += match[0].length;
      continue;
    }
    buffer += source[i];
    i += 1;
  }
  flush();
  return out;
}

function joinLines(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((line, index) => {
    if (index > 0) out.push({ t: "br" });
    out.push(...parseInline(line.trim()));
  });
  return out;
}

interface ListLine {
  indent: number;
  ordered: boolean;
  text: string;
  number: number;
}

function listLine(line: string): ListLine | null {
  const unordered = /^(\s*)[-*+•]\s+(.*)$/.exec(line);
  if (unordered) return { indent: unordered[1]!.length, ordered: false, text: unordered[2]!, number: 1 };
  const ordered = /^(\s*)(\d{1,3})[.)]\s+(.*)$/.exec(line);
  if (ordered) return { indent: ordered[1]!.length, ordered: true, text: ordered[3]!, number: Number(ordered[2]) };
  return null;
}

function buildList(lines: string[]): Block {
  const first = listLine(lines[0]!)!;
  const base = first.indent;
  const items: ListItem[] = [];
  let k = 0;
  while (k < lines.length) {
    const item = listLine(lines[k]!);
    if (item && item.indent <= base + 1) {
      items.push({ c: parseInline(item.text) });
      k += 1;
      continue;
    }
    const nested: string[] = [];
    while (k < lines.length) {
      const candidate = listLine(lines[k]!);
      if (candidate && candidate.indent <= base + 1) break;
      nested.push(lines[k]!);
      k += 1;
    }
    const last = items.at(-1);
    if (!last) continue;
    const continuation: string[] = [];
    while (nested.length && !listLine(nested[0]!)) continuation.push(nested.shift()!);
    if (continuation.length) last.c.push({ t: "br" }, ...joinLines(continuation));
    if (nested.length) last.children = buildList(nested);
  }
  return first.ordered ? { t: "ol", items, start: first.number } : { t: "ul", items };
}

function splitRow(line: string): Inline[][] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => parseInline(cell.trim()));
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ t: "p", c: joinLines(paragraph) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;

    if (/^\s*```/.test(line)) {
      flushParagraph();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i]!)) {
        code.push(lines[i]!);
        i += 1;
      }
      blocks.push({ t: "pre", v: code.join("\n") });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ t: "h", level: heading[1]!.length <= 3 ? 3 : 4, c: parseInline(heading[2]!) });
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ t: "hr" });
      continue;
    }
    if (/^\s*>/.test(line)) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) {
        quote.push(lines[i]!.replace(/^\s*>\s?/, ""));
        i += 1;
      }
      i -= 1;
      blocks.push({ t: "quote", c: joinLines(quote) });
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]!)) {
      flushParagraph();
      const head = splitRow(line);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i]!)) {
        rows.push(splitRow(lines[i]!));
        i += 1;
      }
      i -= 1;
      blocks.push({ t: "table", head, rows });
      continue;
    }
    if (listLine(line)) {
      flushParagraph();
      const collected: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!;
        if (listLine(current)) {
          collected.push(current);
          i += 1;
          continue;
        }
        if (!current.trim()) {
          let next = i + 1;
          while (next < lines.length && !lines[next]!.trim()) next += 1;
          if (next < lines.length && listLine(lines[next]!)) {
            i = next;
            continue;
          }
          break;
        }
        if (/^\s{2,}\S/.test(current)) {
          collected.push(current);
          i += 1;
          continue;
        }
        break;
      }
      i -= 1;
      blocks.push(buildList(collected));
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

/** Texto puro (para copiar, títulos de nota e prévias). */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .trim();
}
