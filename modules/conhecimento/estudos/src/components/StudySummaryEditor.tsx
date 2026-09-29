import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, Input } from "@qqorvex/ui";
import type { Topic } from "../types";

type MarkupAction = { label: string; before: string; after?: string; placeholder: string; title: string };

const MARKUP_ACTIONS: MarkupAction[] = [
  { label: "H", before: "## ", placeholder: "Título da seção", title: "Título de seção" },
  { label: "B", before: "**", after: "**", placeholder: "texto em destaque", title: "Negrito · Ctrl+B" },
  { label: "I", before: "*", after: "*", placeholder: "texto em itálico", title: "Itálico · Ctrl+I" },
  { label: "• Lista", before: "- ", placeholder: "item da lista", title: "Item de lista" },
  { label: "❝ Citação", before: "> ", placeholder: "uma ideia importante", title: "Citação" },
  { label: "</> Código", before: "```\n", after: "\n```", placeholder: "seu código", title: "Bloco de código" },
];

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  return text.split(tokenPattern).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[var(--qv-surface-panel)] px-1.5 py-0.5 font-mono text-[.9em] text-vex-cyan-bright">{part.slice(1, -1)}</code>;
    return part;
  });
}

function isMarkdownBlockStart(line: string): boolean {
  return /^(#{1,3}\s|[-*]\s|>\s|```)/.test(line);
}

export function SummaryMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) { index += 1; continue; }

    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index++]!);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`} className="overflow-x-auto rounded-xl border border-border bg-[var(--qv-surface-panel)] p-4 text-[13px] leading-relaxed text-text-primary"><code>{code.join("\n")}</code></pre>);
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Heading = heading[1]!.length === 1 ? "h2" : heading[1]!.length === 2 ? "h3" : "h4";
      blocks.push(<Heading key={`heading-${index}`} className="m-0 pt-2 font-display text-lg font-semibold text-text-primary">{renderInlineMarkdown(heading[2]!)}</Heading>);
      index += 1;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s/.test(lines[index]!)) items.push(lines[index++]!.replace(/^[-*]\s/, ""));
      blocks.push(<ul key={`list-${index}`} className="m-0 list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ul>);
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={`quote-${index}`} className="m-0 border-l-2 border-vex-cyan px-4 py-1 text-text-secondary">{renderInlineMarkdown(line.slice(2))}</blockquote>);
      index += 1;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index]!.trim() && !isMarkdownBlockStart(lines[index]!)) paragraph.push(lines[index++]!);
    blocks.push(<p key={`paragraph-${index}`} className="m-0 whitespace-pre-line">{paragraph.map(renderInlineMarkdown).map((parts, partIndex) => <span key={partIndex}>{partIndex > 0 && <br />}{parts}</span>)}</p>);
  }

  return <div className="flex flex-col gap-4 text-[15px] leading-[1.75] text-text-secondary">{blocks.length ? blocks : <p className="m-0 text-text-muted">Adicione conteúdo para visualizar o resumo.</p>}</div>;
}

export function StudySummaryEditor({
  initialTitle = "",
  initialContent = "",
  initialTopicId = "",
  topics,
  mode,
  isSaving,
  onSave,
  onCancel,
}: {
  initialTitle?: string;
  initialContent?: string;
  initialTopicId?: string | null;
  topics: Topic[];
  mode: "create" | "edit";
  isSaving: boolean;
  onSave: (input: { title: string; content: string; topicId?: string }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [topicId, setTopicId] = useState(initialTopicId ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  function insertMarkup(action: MarkupAction) {
    const field = textareaRef.current;
    const start = field?.selectionStart ?? content.length;
    const end = field?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || action.placeholder;
    const replacement = `${action.before}${selected}${action.after ?? ""}`;
    const next = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
    setContent(next);
    setIsPreview(false);
    window.requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + action.before.length, start + action.before.length + selected.length);
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), content: content.trim(), topicId: topicId || undefined });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_230px] gap-3">
        <Input label="Título do resumo" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Princípios fundamentais" maxLength={120} autoFocus required />
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-secondary">
          Tópico
          <select className="qv-field" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            <option value="">Sem tópico</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-[var(--qv-surface-panel)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Formatação do resumo">
            {MARKUP_ACTIONS.map((action) => <button key={action.title} type="button" title={action.title} aria-label={action.title} onClick={() => insertMarkup(action)} className="qv-btn qv-btn-quiet min-h-8 px-2.5 text-xs">{action.label}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-text-muted">{words} {words === 1 ? "palavra" : "palavras"}</span>
            <button type="button" aria-pressed={isPreview} onClick={() => setIsPreview((value) => !value)} className="qv-btn qv-btn-quiet min-h-8 px-2.5 text-xs">{isPreview ? "Editar" : "Visualizar"}</button>
          </div>
        </div>
        {isPreview ? (
          <div className="min-h-[260px] p-4 sm:p-5" aria-label="Prévia formatada"><SummaryMarkdown content={content} /></div>
        ) : (
          <textarea
            ref={textareaRef}
            aria-label="Conteúdo do resumo"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (!(event.ctrlKey || event.metaKey)) return;
              if (event.key.toLowerCase() === "s" || event.key === "Enter") { event.preventDefault(); formRef.current?.requestSubmit(); return; }
              if (event.key.toLowerCase() === "b") { event.preventDefault(); insertMarkup(MARKUP_ACTIONS[1]!); }
              if (event.key.toLowerCase() === "i") { event.preventDefault(); insertMarkup(MARKUP_ACTIONS[2]!); }
            }}
            placeholder="Registre conceitos, exemplos e conexões…\n\nDica: use os controles acima para organizar suas ideias."
            rows={12}
            className="qv-field min-h-[260px] resize-y rounded-none border-0 bg-transparent leading-7 focus:ring-0"
          />
        )}
      </div>

      <p className="m-0 text-xs text-text-muted">O conteúdo fica neste caderno. Use a visualização para conferir a formatação antes de salvar.</p>
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>Cancelar</Button>}
        <Button type="submit" variant="primary" size="sm" disabled={isSaving || !title.trim()}>{isSaving ? "Salvando…" : mode === "edit" ? "Salvar alterações" : "Salvar resumo"}</Button>
      </div>
    </form>
  );
}
