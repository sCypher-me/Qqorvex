import { useMemo, useState, type FormEvent, type Ref } from "react";
import { CalendarBlankIcon, FlagIcon, HashIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@qqorvex/ui";
import { parseQuickTask } from "../service";
import type { NewTaskInput } from "../types";

const TOKEN_ICON = {
  date: <CalendarBlankIcon size={12} weight="bold" />,
  priority: <FlagIcon size={12} weight="fill" />,
  tag: <HashIcon size={12} weight="bold" />,
};

/**
 * Campo de adição rápida com linguagem natural: "Pagar luz amanhã !alta #casa". Mostra o que
 * foi entendido antes de salvar; o rascunho só é limpo quando a tarefa é criada com sucesso.
 */
export function SmartAdd({
  onCreate,
  inputRef,
  defaults,
  placeholder = "Adicionar tarefa — ex.: Pagar luz amanhã !alta #casa",
  autoFocus,
}: {
  onCreate: (input: NewTaskInput) => Promise<void>;
  inputRef?: Ref<HTMLInputElement>;
  /** Valores aplicados quando o texto não os define (ex.: prazo "hoje" numa lista filtrada). */
  defaults?: Partial<NewTaskInput>;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => parseQuickTask(value), [value]);
  const canSubmit = parsed.title.length > 0 && !saving;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onCreate({
        ...defaults,
        title: parsed.title,
        dueDate: parsed.dueDate ?? defaults?.dueDate,
        priority: parsed.priority ?? defaults?.priority,
        tags: [...new Set([...(defaults?.tags ?? []), ...parsed.tags])],
      });
      setValue("");
    } catch {
      // Mantém o rascunho para uma nova tentativa.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="group rounded-xl border border-line bg-surface transition-[border-color,box-shadow] focus-within:border-gold-line focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--q-gold)_12%,transparent)]">
      <div className="flex items-center gap-2.5 px-3.5">
        <PlusIcon size={18} className="shrink-0 text-fg-4 group-focus-within:text-gold-fg" aria-hidden="true" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label="Adicionar tarefa"
          autoFocus={autoFocus}
          maxLength={300}
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-4"
        />
        {value.trim() ? (
          <Button type="submit" size="sm" disabled={!canSubmit} loading={saving}>
            Adicionar
          </Button>
        ) : (
          <kbd className="q-kbd hidden sm:inline-flex">↵</kbd>
        )}
      </div>
      {parsed.tokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft px-3.5 py-2" aria-live="polite">
          <span className="text-2xs text-fg-4">Entendi:</span>
          {parsed.tokens.map((token) => (
            <span key={`${token.kind}-${token.label}`} className="inline-flex h-5 items-center gap-1 rounded-md bg-gold-soft px-1.5 text-2xs font-medium text-gold-fg">
              {TOKEN_ICON[token.kind]}
              {token.label}
            </span>
          ))}
        </div>
      )}
    </form>
  );
}
