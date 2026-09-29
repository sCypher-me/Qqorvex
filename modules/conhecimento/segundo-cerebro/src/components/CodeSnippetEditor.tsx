import { useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import type { CodeBlockContent } from "../types";

const LANGUAGES = [
  ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["tsx", "TSX / React"], ["python", "Python"],
  ["json", "JSON"], ["html", "HTML"], ["css", "CSS"], ["sql", "SQL"], ["bash", "Bash"], ["markdown", "Markdown"], ["text", "Texto"],
] as const;

const KEYWORDS = new Set("const let var function return if else for while async await import from export default class extends new this true false null undefined try catch throw interface type public private def in and or not None True False SELECT FROM WHERE INSERT UPDATE DELETE CREATE TABLE JOIN AS ON GROUP BY ORDER LIMIT".split(" "));
const TOKEN_COLORS = {
  comment: "#6f7d8b", string: "#d9b274", number: "#91c7c7", keyword: "#79c7ee", tag: "#67d3d0",
  function: "#cbb4f4", operator: "#c6d0dc", punctuation: "#aab6c3", plain: "#d9e1ea",
} as const;

type TokenKind = keyof typeof TOKEN_COLORS;

function kindForToken(token: string, language: string): TokenKind {
  const trimmed = token.trim();
  if (!trimmed) return "plain";
  if (/^(\/\/|#|--|\/\*)/.test(trimmed)) return "comment";
  if (/^("|'|`)/.test(trimmed)) return "string";
  if (/^\d/.test(trimmed)) return "number";
  if (/^<\/?[\w:.-]+/.test(trimmed) || /^<\/?[!?]/.test(trimmed)) return "tag";
  if (KEYWORDS.has(trimmed.toUpperCase()) || KEYWORDS.has(trimmed)) return "keyword";
  if (/^[a-zA-Z_$][\w$]*(?=\s*\()/.test(trimmed)) return "function";
  if (/^[{}[\]();,.:]$/.test(trimmed)) return "punctuation";
  if (/^[=+*/!<>|&?-]+$/.test(trimmed)) return "operator";
  if (language === "json" && /^[a-zA-Z_$][\w$]*$/.test(trimmed)) return "string";
  return "plain";
}

function highlightLine(line: string, language: string) {
  const pattern = /(\/\/.*|#.*|--.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[\w:.-]+(?:\s[^<>]*?)?\/?>|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|[^\s])/g;
  const output: { token: string; kind: TokenKind }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    const token = match[0];
    output.push({ token, kind: kindForToken(token, language) });
  }
  return output.length === 0 ? [{ token: " ", kind: "plain" as TokenKind }] : output;
}

export function CodeSnippetEditor({
  value,
  inputRef,
  onChange,
  onCommit,
  controls,
}: {
  value: CodeBlockContent;
  inputRef: Ref<HTMLTextAreaElement>;
  onChange: (next: CodeBlockContent) => void;
  onCommit: (next?: CodeBlockContent) => void;
  controls: ReactNode;
}) {
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const code = value.text ?? "";
  const language = value.language || "javascript";
  const lines = useMemo(() => code.split("\n"), [code]);
  const lineTokens = useMemo(() => lines.map((line) => highlightLine(line, language)), [language, lines]);
  const copyTimer = useRef<number | null>(null);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="group/block relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-[#0b1016] shadow-[0_12px_28px_rgb(0_0_0_/_0.16)]">
      <div className="flex min-h-[42px] items-center gap-2 border-b border-line bg-[#111821] px-3">
        <span className="mr-1 flex items-center gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-[#db7777]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d9b274]" /><span className="h-2.5 w-2.5 rounded-full bg-[#6dc8a0]" /></span>
        <select
          value={language}
          onChange={(event) => {
            const next = { ...value, language: event.target.value };
            onChange(next);
            onCommit(next);
          }}
          aria-label="Linguagem do snippet"
          className="h-7 rounded-[8px] border border-line bg-transparent px-2 font-mono text-[11px] text-fg-2 outline-none transition-colors focus:border-gold-line"
        >
          {LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4 ml-1 text-fg-3">snippet</span>
        <span className="flex-1" />
        <span className="hidden font-mono text-[10px] text-fg-3 sm:inline">{lines.length} {lines.length === 1 ? "linha" : "linhas"}</span>
        <button type="button" onClick={copyCode} className="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 text-fg-2 hover:bg-hover hover:text-fg h-7 px-2.5 text-xs font-mono text-[11px]" aria-label="Copiar código">{copied ? "Copiado" : "Copiar"}</button>
        {controls}
      </div>
      <div className="grid min-h-[168px] grid-cols-[44px_minmax(0,1fr)] overflow-hidden">
        <div className="select-none overflow-hidden border-r border-line bg-[#0e141c] py-4 text-right font-mono text-[12px] leading-[1.7] text-[#526172]" aria-hidden="true">
          <div style={{ transform: `translateY(-${scroll.top}px)` }}>{lines.map((_, index) => <div key={index} className="pr-3">{index + 1}</div>)}</div>
        </div>
        <div
          className="relative min-w-0 overflow-auto"
          onScroll={(event) => setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft })}
        >
          <pre aria-hidden="true" className="pointer-events-none absolute left-0 top-0 m-0 min-w-full whitespace-pre px-4 py-4 font-mono text-[13px] leading-[1.7]" style={{ transform: `translate(${-scroll.left}px, -${scroll.top}px)` }}>
            {lineTokens.map((tokens, lineIndex) => <div key={lineIndex}>{tokens.map((item, tokenIndex) => <span key={tokenIndex} style={{ color: TOKEN_COLORS[item.kind] }}>{item.token}</span>)}</div>)}
          </pre>
          <textarea
            ref={inputRef}
            value={code}
            onChange={(event) => onChange({ ...value, text: event.target.value })}
            onBlur={() => onCommit(value)}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                const target = event.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const next = `${code.slice(0, start)}  ${code.slice(end)}`;
                onChange({ ...value, text: next });
                requestAnimationFrame(() => { target.selectionStart = start + 2; target.selectionEnd = start + 2; });
              }
            }}
            rows={Math.max(7, Math.min(18, lines.length + 1))}
            aria-label="Código do snippet"
            spellCheck={false}
            className="relative z-[1] block min-h-[168px] min-w-full resize-y overflow-hidden whitespace-pre bg-transparent px-4 py-4 font-mono text-[13px] leading-[1.7] text-transparent caret-gold outline-none selection:bg-gold/25"
          />
        </div>
      </div>
    </div>
  );
}
