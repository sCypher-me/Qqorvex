import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarBlankIcon, ClockIcon, CurrencyCircleDollarIcon, FlagIcon, HashIcon, PlusIcon } from "@phosphor-icons/react";
import { HOJE_REGISTRY_CHANGE_EVENT } from "@qqorvex/module-hoje";
import { addDaysToKey, createTask, localDateKey } from "@qqorvex/module-tarefas";
import { createEvent } from "@qqorvex/module-agenda";
import { createTransaction } from "@qqorvex/module-financas";
import { createPage } from "@qqorvex/module-segundo-cerebro";
import { createIdea, createShoppingListItem } from "@qqorvex/module-vida-pessoal";
import { billingLimitMessage } from "@qqorvex/database";
import { Button, cx, useToast } from "@qqorvex/ui";
import { useAccount } from "../account";
import { supabase } from "../supabase";
import { CAPTURE_KINDS, captureKindInfo, parseQuickCapture, type CaptureKind, type QuickCapture } from "./quickCapture";

function dateLabel(key: string, today: string): string {
  if (key === today) return "Hoje";
  if (key === addDaysToKey(today, 1)) return "Amanhã";
  if (key === addDaysToKey(today, -1)) return "Ontem";
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "");
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** O que falta para salvar, ou null quando dá para confirmar. */
function missing(capture: QuickCapture): string | null {
  if (!capture.title) return "Escreva um nome.";
  if ((capture.kind === "expense" || capture.kind === "income") && !capture.amount) return "Falta o valor (ex.: 40 ou R$ 40,00).";
  return null;
}

/**
 * Captura rápida em linguagem natural. Enquanto a pessoa escreve, mostra o tipo, o destino e o que
 * foi entendido; dá para trocar o tipo com um toque. Só salva no botão (ou Enter), e o rascunho
 * fica no campo se algo falhar.
 */
export function QuickCaptureBar({
  defaultTaskDate,
  placeholder = "Escreva do seu jeito — ex.: Dentista sexta às 15h",
  autoFocus,
  onDone,
}: {
  /** Prazo usado quando uma tarefa não diz a data (no Hoje: hoje). */
  defaultTaskDate?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const { userId } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [forcedKind, setForcedKind] = useState<CaptureKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDateKey();

  const capture = useMemo(() => {
    const parsed = parseQuickCapture(value, today, forcedKind ?? undefined);
    return parsed.kind === "task" && !parsed.date && defaultTaskDate ? { ...parsed, date: defaultTaskDate } : parsed;
  }, [defaultTaskDate, forcedKind, today, value]);
  const info = captureKindInfo(capture.kind);
  const problem = value.trim() ? missing(capture) : null;
  const canSubmit = value.trim().length > 0 && !problem && !saving;

  async function save(): Promise<{ title: string; open: () => void }> {
    const { kind, title } = capture;
    if (kind === "task") {
      const task = await createTask(supabase, userId, { title, dueDate: capture.date, priority: capture.priority, tags: capture.tags, estimatedMinutes: capture.estimatedMinutes });
      return { title, open: () => navigate(`/planejar/tarefas?tarefa=${task.id}`) };
    }
    if (kind === "event") {
      const [y = 0, mo = 1, d = 1] = capture.date!.split("-").map(Number);
      const [sh = 0, sm = 0] = (capture.start ?? "00:00").split(":").map(Number);
      const [eh = 23, em = 59] = (capture.end ?? "23:59").split(":").map(Number);
      await createEvent(supabase, userId, { title, startAt: new Date(y, mo - 1, d, sh, sm).toISOString(), endAt: new Date(y, mo - 1, d, eh, em).toISOString(), isAllDay: !capture.start });
      return { title, open: () => navigate("/planejar/agenda") };
    }
    if (kind === "expense" || kind === "income") {
      await createTransaction(supabase, userId, { name: title, amount: capture.amount!, transactionType: kind === "income" ? "entrada" : "saida", date: capture.date! });
      return { title: `${title} · ${money(capture.amount!)}`, open: () => navigate("/vida/financas") };
    }
    if (kind === "note") {
      const page = await createPage(supabase, userId, { title });
      return { title, open: () => navigate(`/conhecimento/notas/${page.id}`) };
    }
    if (kind === "idea") {
      await createIdea(supabase, userId, { title });
      return { title, open: () => navigate("/vida/pessoal") };
    }
    await createShoppingListItem(supabase, userId, { name: title });
    return { title, open: () => navigate("/vida/pessoal?aba=pratica") };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await save();
      void queryClient.invalidateQueries();
      window.dispatchEvent(new Event(HOJE_REGISTRY_CHANGE_EVENT));
      toast({ title: `${info.done} em ${info.destination}`, description: saved.title, tone: "success", action: { label: "Abrir", onClick: saved.open } });
      setValue("");
      setForcedKind(null);
      onDone?.();
    } catch (caught) {
      setError(billingLimitMessage(caught) ?? (caught instanceof Error ? caught.message : "Não foi possível salvar. Tente de novo."));
    } finally {
      setSaving(false);
    }
  }

  const details: Array<{ icon: ReactNode; label: string }> = [];
  if (capture.date) details.push({ icon: <CalendarBlankIcon size={12} weight="bold" />, label: dateLabel(capture.date, today) });
  if (capture.kind === "event") details.push({ icon: <ClockIcon size={12} weight="bold" />, label: capture.start ? `${capture.start}–${capture.end}` : "Dia inteiro" });
  if (capture.amount && (capture.kind === "expense" || capture.kind === "income")) details.push({ icon: <CurrencyCircleDollarIcon size={12} weight="bold" />, label: money(capture.amount) });
  if (capture.kind === "task" && capture.priority) details.push({ icon: <FlagIcon size={12} weight="fill" />, label: capture.priority === "alta" ? "Alta" : capture.priority === "media" ? "Média" : "Baixa" });
  if (capture.kind === "task" && capture.estimatedMinutes) details.push({ icon: <ClockIcon size={12} weight="bold" />, label: `${capture.estimatedMinutes} min` });
  if (capture.kind === "task") capture.tags.forEach((tag) => details.push({ icon: <HashIcon size={12} weight="bold" />, label: tag }));

  return (
    <form onSubmit={submit} className="group rounded-xl border border-line bg-surface transition-[border-color,box-shadow] focus-within:border-gold-line focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--q-gold)_12%,transparent)]">
      <div className="flex items-center gap-2.5 px-3.5">
        <PlusIcon size={18} className="shrink-0 text-fg-4 group-focus-within:text-gold-fg" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            if (!event.target.value.trim()) setForcedKind(null);
          }}
          placeholder={placeholder}
          aria-label="Captura rápida"
          autoFocus={autoFocus}
          data-autofocus={autoFocus || undefined}
          maxLength={300}
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-4"
        />
        {value.trim() ? (
          <Button type="submit" size="sm" disabled={!canSubmit} loading={saving} aria-label={info.action}>
            <span className="sm:hidden">Salvar</span>
            <span className="hidden sm:inline">{info.action}</span>
          </Button>
        ) : (
          <kbd className="q-kbd hidden sm:inline-flex">↵</kbd>
        )}
      </div>
      {value.trim() && (
        <div className="flex flex-col gap-2 border-t border-line-soft px-3.5 py-2.5" aria-live="polite">
          <div className="flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="text-fg-4">Vai para</span>
            <span className="font-semibold text-fg-2">{info.destination}</span>
            {details.map((detail) => (
              <span key={detail.label} className="inline-flex h-5 items-center gap-1 rounded-md bg-gold-soft px-1.5 font-medium text-gold-fg">
                {detail.icon}
                {detail.label}
              </span>
            ))}
            {capture.title && <span className="min-w-0 truncate text-fg-3">· {capture.title}</span>}
          </div>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo do item">
            {CAPTURE_KINDS.map((option) => (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={capture.kind === option.kind}
                onClick={() => setForcedKind(option.kind)}
                className={cx(
                  "rounded-md px-2 py-0.5 text-xs transition-colors",
                  capture.kind === option.kind ? "bg-gold-soft font-medium text-gold-fg" : "text-fg-3 hover:bg-hover hover:text-fg",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {(problem || error) && <p className="text-xs text-danger">{error ?? problem}</p>}
        </div>
      )}
    </form>
  );
}
