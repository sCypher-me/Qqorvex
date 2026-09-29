import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { CodeIcon, ListBulletsIcon, ListNumbersIcon, QuotesIcon, TextBIcon, TextHIcon, TextItalicIcon } from "@phosphor-icons/react";
import { Button, Markdown, Segmented } from "@qqorvex/ui";
import type { Topic } from "../types";

type MarkupAction = { icon: ReactNode; before: string; after?: string; placeholder: string; title: string };

const MARKUP_ACTIONS: MarkupAction[] = [
  { icon: <TextHIcon />, before: "## ", placeholder: "Título da seção", title: "Título de seção" },
  { icon: <TextBIcon />, before: "**", after: "**", placeholder: "texto em destaque", title: "Negrito (Ctrl+B)" },
  { icon: <TextItalicIcon />, before: "*", after: "*", placeholder: "texto em itálico", title: "Itálico (Ctrl+I)" },
  { icon: <ListBulletsIcon />, before: "- ", placeholder: "item da lista", title: "Lista" },
  { icon: <ListNumbersIcon />, before: "1. ", placeholder: "primeiro passo", title: "Lista numerada" },
  { icon: <QuotesIcon />, before: "> ", placeholder: "uma ideia importante", title: "Citação" },
  { icon: <CodeIcon />, before: "```\n", after: "\n```", placeholder: "código", title: "Bloco de código" },
];

/** Conteúdo de um resumo formatado (markdown). */
export function SummaryMarkdown({ content }: { content: string }) {
  if (!content.trim()) return <p className="text-[14px] text-fg-4">Este resumo ainda não tem conteúdo.</p>;
  return <Markdown text={content} className="text-[15px] leading-[1.75]" />;
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
  const [view, setView] = useState<"escrever" | "visualizar">("escrever");
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  function insertMarkup(action: MarkupAction) {
    const field = textareaRef.current;
    const start = field?.selectionStart ?? content.length;
    const end = field?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || action.placeholder;
    const next = `${content.slice(0, start)}${action.before}${selected}${action.after ?? ""}${content.slice(end)}`;
    setContent(next);
    setView("escrever");
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
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Título do resumo"
        aria-label="Título do resumo"
        maxLength={120}
        autoFocus={mode === "create"}
        required
        className="w-full bg-transparent font-display text-[24px] font-semibold text-fg outline-none placeholder:text-fg-4"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select value={topicId} onChange={(event) => setTopicId(event.target.value)} aria-label="Tópico" data-size="sm" className="q-input w-auto">
          <option value="">Sem tópico</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
        <span className="flex-1" />
        <Segmented
          label="Modo do editor"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "escrever", label: "Escrever" },
            { value: "visualizar", label: "Visualizar" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-field focus-within:border-gold-line">
        {view === "escrever" && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-line-soft px-2 py-1.5" role="toolbar" aria-label="Formatação">
            {MARKUP_ACTIONS.map((action) => (
              <button key={action.title} type="button" title={action.title} aria-label={action.title} onClick={() => insertMarkup(action)} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg [&_svg]:size-4">
                {action.icon}
              </button>
            ))}
            <span className="ml-auto pr-1 text-[11px] tabular-nums text-fg-4">
              {words} {words === 1 ? "palavra" : "palavras"}
            </span>
          </div>
        )}
        {view === "visualizar" ? (
          <div className="min-h-[320px] p-5" aria-label="Prévia formatada">
            <SummaryMarkdown content={content} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            aria-label="Conteúdo do resumo"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (!(event.ctrlKey || event.metaKey)) return;
              const key = event.key.toLowerCase();
              if (key === "s" || key === "enter") {
                event.preventDefault();
                formRef.current?.requestSubmit();
              } else if (key === "b") {
                event.preventDefault();
                insertMarkup(MARKUP_ACTIONS[1]!);
              } else if (key === "i") {
                event.preventDefault();
                insertMarkup(MARKUP_ACTIONS[2]!);
              }
            }}
            placeholder={"Registre conceitos, exemplos e conexões…\n\nUse ## para seções, - para listas e **negrito** para destacar."}
            rows={14}
            className="block min-h-[320px] w-full resize-y bg-transparent px-4 py-3 text-[14.5px] leading-7 text-fg outline-none placeholder:text-fg-4"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-fg-4">Ctrl + S salva</span>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!title.trim()} loading={isSaving}>
          {mode === "edit" ? "Salvar alterações" : "Salvar resumo"}
        </Button>
      </div>
    </form>
  );
}
