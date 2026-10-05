import { useEffect, useRef, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowClockwiseIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  ChecksIcon,
  CopyIcon,
  GraduationCapIcon,
  HeartIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  NotebookIcon,
  SunHorizonIcon,
  TargetIcon,
  WalletIcon,
  WarningCircleIcon,
  XCircleIcon,
  type IconProps,
} from "@phosphor-icons/react";
import { createBlock, createPage } from "@qqorvex/module-segundo-cerebro";
import { Button, ButtonLink, IconButton, Markdown, Notice, VexAvatar, cx, markdownToPlainText, useToast } from "@qqorvex/ui";
import type { VexActionPreview, VexStep } from "@qqorvex/vex";
import { supabase } from "../app/supabase";
import type { ActionStatus, DisplayMessage, PendingAction, ProviderIssue, VexNotice } from "./useVexChat";

type Icon = ComponentType<IconProps>;

export interface Starter {
  label: string;
  prompt: string;
  icon: Icon;
}

const STARTERS: Record<string, Starter[]> = {
  hoje: [
    { label: "Organize meu dia", prompt: "Organize meu dia de hoje com horários realistas, considerando compromissos, prazos e hábitos.", icon: SunHorizonIcon },
    { label: "O que está atrasado?", prompt: "O que está atrasado nas minhas tarefas? Sugira o que fazer primeiro.", icon: ChecksIcon },
    { label: "Minha semana", prompt: "Resuma os meus compromissos e prazos desta semana.", icon: CalendarBlankIcon },
    { label: "Gastos do mês", prompt: "Como estão meus gastos este mês? Onde estou gastando mais?", icon: WalletIcon },
  ],
  tarefas: [
    { label: "O que fazer primeiro?", prompt: "Olhando minhas tarefas, o que devo fazer primeiro hoje e por quê?", icon: ChecksIcon },
    { label: "Tarefas atrasadas", prompt: "Quais tarefas estão atrasadas? Me ajude a reagendar.", icon: CalendarBlankIcon },
    { label: "Organize meu dia", prompt: "Organize meu dia de hoje com horários realistas.", icon: SunHorizonIcon },
  ],
  agenda: [
    { label: "Minha semana", prompt: "O que tenho na agenda nos próximos 7 dias?", icon: CalendarBlankIcon },
    { label: "Tempo livre amanhã", prompt: "Tenho tempo livre amanhã? Em quais horários?", icon: SunHorizonIcon },
    { label: "Marcar compromisso", prompt: "Quero marcar um compromisso.", icon: LightningIcon },
  ],
  metas: [
    { label: "Hábitos de hoje", prompt: "Como estão meus hábitos hoje?", icon: TargetIcon },
    { label: "Minhas metas", prompt: "Quais são minhas metas ativas e como posso avançar nelas esta semana?", icon: TargetIcon },
    { label: "Organize meu dia", prompt: "Organize meu dia de hoje com horários realistas.", icon: SunHorizonIcon },
  ],
  financas: [
    { label: "Gastos do mês", prompt: "Como estão meus gastos este mês? Compare com o mês passado.", icon: WalletIcon },
    { label: "Contas a vencer", prompt: "Quais contas vencem nos próximos 14 dias?", icon: CalendarBlankIcon },
    { label: "Registrar um gasto", prompt: "Quero registrar um gasto.", icon: LightningIcon },
  ],
  conhecimento: [
    { label: "Revisões pendentes", prompt: "Quais flashcards estão para revisar hoje?", icon: GraduationCapIcon },
    { label: "Criar uma nota", prompt: "Quero criar uma nota.", icon: NotebookIcon },
    { label: "Minha biblioteca", prompt: "O que estou lendo ou assistindo agora?", icon: NotebookIcon },
  ],
  vida: [
    { label: "Lista de compras", prompt: "O que tem na minha lista de compras?", icon: HeartIcon },
    { label: "Check-in de hoje", prompt: "Quero registrar meu check-in de hoje.", icon: HeartIcon },
    { label: "Contas a vencer", prompt: "Quais contas vencem nos próximos 14 dias?", icon: WalletIcon },
  ],
};

export function startersFor(pathname: string): Starter[] {
  if (pathname.startsWith("/planejar/tarefas")) return STARTERS.tarefas!;
  if (pathname.startsWith("/planejar/agenda")) return STARTERS.agenda!;
  if (pathname.startsWith("/planejar/metas")) return STARTERS.metas!;
  if (pathname.startsWith("/vida/financas")) return STARTERS.financas!;
  if (pathname.startsWith("/conhecimento")) return STARTERS.conhecimento!;
  if (pathname.startsWith("/vida")) return STARTERS.vida!;
  return STARTERS.hoje!;
}

function greeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const period = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return firstName ? `${period}, ${firstName}.` : `${period}.`;
}

export function VexWelcome({ variant, firstName, starters, onPick }: { variant: "panel" | "page"; firstName: string | null; starters: Starter[]; onPick: (prompt: string) => void }) {
  if (variant === "panel") {
    return (
      <div className="flex flex-col gap-4 px-1 pt-2">
        <div className="flex flex-col gap-1">
          <div>
            <p className="font-display text-[17px] font-semibold leading-tight text-fg">{greeting(firstName)}</p>
            <p className="text-[13px] text-fg-3">Como posso ajudar?</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {starters.map((starter) => (
            <button
              key={starter.label}
              type="button"
              onClick={() => onPick(starter.prompt)}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-[13px] text-fg-2 transition-colors hover:border-ai-line hover:bg-ai-soft hover:text-fg"
            >
              <starter.icon size={16} className="shrink-0 text-ai-fg" />
              {starter.label}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-fg-4">Eu consulto suas tarefas, agenda, hábitos e finanças, e crio ou altero coisas sempre com a sua confirmação.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-1 pt-[4vh] text-center sm:px-2 sm:pt-[8vh]">
      <VexAvatar size={60} />
      <h1 className="mt-4 font-display text-[26px] font-semibold leading-tight tracking-tight text-fg sm:mt-5 sm:text-[32px]">{greeting(firstName)}</h1>
      <p className="mt-1.5 text-[15px] text-fg-3">Como posso ajudar hoje?</p>
      <div className="mt-6 grid w-full gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-2.5">
        {starters.map((starter) => (
          <button
            key={starter.label}
            type="button"
            onClick={() => onPick(starter.prompt)}
            className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-ai-line hover:bg-raised sm:items-start sm:p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai-fg">
              <starter.icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium text-fg">{starter.label}</span>
              <span className="mt-0.5 line-clamp-2 hidden text-xs leading-relaxed text-fg-3 sm:block">{starter.prompt}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 max-w-md text-xs leading-relaxed text-fg-4">A Vex consulta seus dados no Qqorvex para responder e só cria, altera ou apaga algo depois da sua confirmação.</p>
    </div>
  );
}

function StepsLine({ steps }: { steps: VexStep[] }) {
  if (steps.length === 0) return null;
  const labels = [...new Set(steps.map((step) => step.label))];
  const failed = steps.some((step) => !step.ok);
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-xs text-fg-4">
      <MagnifyingGlassIcon size={13} className="shrink-0" />
      <span className="truncate">
        Consultou {labels.join(", ")}
        {failed && " · uma consulta falhou"}
      </span>
    </p>
  );
}

function AssistantMessage({ content, steps, variant }: { content: string; steps?: VexStep[]; variant: "panel" | "page" }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdownToPlainText(content));
      toast({ title: "Resposta copiada", tone: "success", duration: 2000 });
    } catch {
      toast({ title: "Não foi possível copiar", tone: "danger" });
    }
  }

  async function saveAsNote() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const plain = markdownToPlainText(content);
    const heading = /^\s{0,3}#{1,6}\s+(.+)$/m.exec(content)?.[1];
    const firstLine = (heading ?? plain.split("\n").find((line) => line.trim()) ?? "Resposta da Vex").replace(/[*_`#]/g, "").trim();
    const title = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
    try {
      const page = await createPage(supabase, user.id, { title });
      await createBlock(supabase, page.id, "texto", { text: plain }, 0);
      toast({ title: "Salvo em Notas", description: title, tone: "success", action: { label: "Abrir", onClick: () => navigate(`/conhecimento/notas/${page.id}`) } });
    } catch {
      toast({ title: "Não foi possível salvar a nota", tone: "danger" });
    }
  }

  return (
    <div className="group flex gap-3">
      <VexAvatar size={variant === "page" ? 30 : 26} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        {steps && <StepsLine steps={steps} />}
        <Markdown text={content} className={variant === "page" ? "text-[15px]" : "text-[14px]"} />
        <div className="mt-1.5 flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <IconButton label="Copiar resposta" size="sm" onClick={() => void copy()}>
            <CopyIcon />
          </IconButton>
          <IconButton label="Salvar em Notas" size="sm" onClick={() => void saveAsNote()}>
            <NotebookIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

const ACTION_STATUS: Record<ActionStatus, { label: string; icon: Icon; className: string }> = {
  done: { label: "Feito", icon: CheckCircleIcon, className: "text-success" },
  cancelled: { label: "Cancelado", icon: XCircleIcon, className: "text-fg-4" },
  failed: { label: "Não concluído", icon: WarningCircleIcon, className: "text-danger" },
};

function ActionReceipt({ action, status }: { action: VexActionPreview; status: ActionStatus }) {
  const meta = ACTION_STATUS[status];
  const subject = action.fields[0]?.value;
  return (
    <div className="ml-9 flex items-center gap-2 rounded-lg border border-line-soft bg-surface/60 px-3 py-2 text-[13px]">
      <meta.icon size={16} weight="fill" className={cx("shrink-0", meta.className)} />
      <span className={cx("min-w-0 flex-1 truncate", status === "cancelled" ? "text-fg-3 line-through decoration-fg-4" : "text-fg-2")}>
        {action.title}
        {subject && <span className="text-fg-3"> · {subject}</span>}
      </span>
      <span className={cx("shrink-0 text-xs", meta.className)}>{meta.label}</span>
    </div>
  );
}

function ConfirmCard({ pending, busy, onConfirm, onCancel }: { pending: PendingAction; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus({ preventScroll: true });
  }, [pending]);
  return (
    <div className="ml-9 overflow-hidden rounded-xl border border-ai-line bg-surface shadow-sm animate-pop-in" role="group" aria-label={`Confirmar: ${pending.action.title}`}>
      <div className="flex items-center gap-2 border-b border-line-soft bg-ai-soft px-4 py-2.5">
        <LightningIcon size={15} weight="fill" className="text-ai-fg" />
        <p className="text-[13px] font-semibold text-fg">{pending.action.title}</p>
        <span className="ml-auto text-[11px] text-fg-3">Aguardando sua confirmação</span>
      </div>
      {pending.action.fields.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 py-3 text-[13.5px]">
          {pending.action.fields.map((field) => (
            <div key={field.label} className="contents">
              <dt className="text-fg-3">{field.label}</dt>
              <dd className="min-w-0 whitespace-pre-line break-words text-fg">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {pending.action.note && <p className="px-4 pb-2 text-xs text-warning">{pending.action.note}</p>}
      <div className="flex justify-end gap-2 border-t border-line-soft px-3 py-2.5">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button ref={confirmRef} size="sm" onClick={onConfirm} loading={busy}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}

function Thinking({ liveStep, variant }: { liveStep: string | null; variant: "panel" | "page" }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <VexAvatar size={variant === "page" ? 30 : 26} status="thinking" />
      <span className="flex items-center gap-2 text-[13px] text-fg-3">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className="h-1.5 w-1.5 animate-typing rounded-full bg-ai" style={{ animationDelay: `${index * 150}ms` }} />
          ))}
        </span>
        {liveStep ? `Consultando ${liveStep}…` : "Pensando…"}
      </span>
    </div>
  );
}

export interface VexThreadProps {
  variant: "panel" | "page";
  messages: DisplayMessage[];
  busy: boolean;
  liveStep: string | null;
  pending: PendingAction | null;
  notice: VexNotice | null;
  providerIssue: ProviderIssue | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismissIssue: () => void;
}

/** Lista de mensagens: pergunta, resposta formatada, ações confirmadas e o cartão de confirmação. */
export function VexThread({ variant, messages, busy, liveStep, pending, notice, providerIssue, onConfirm, onCancel, onRetry, onDismissIssue }: VexThreadProps) {
  return (
    <div className={cx("flex flex-col", variant === "page" ? "gap-6" : "gap-5")}>
      {messages.map((message) => {
        if (message.role === "user") {
          return (
            <div key={message.id} className="flex justify-end">
              <div className={cx("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-line bg-raised px-4 py-2.5 text-fg", variant === "page" ? "text-[15px]" : "text-[14px]")}>{message.content}</div>
            </div>
          );
        }
        if (message.role === "action") return <ActionReceipt key={message.id} action={message.action} status={message.status} />;
        return <AssistantMessage key={message.id} content={message.content} steps={message.steps} variant={variant} />;
      })}

      {pending && (
        <div className="flex flex-col gap-2">
          {pending.steps.length > 0 && (
            <div className="ml-9">
              <StepsLine steps={pending.steps} />
            </div>
          )}
          <ConfirmCard pending={pending} busy={busy} onConfirm={onConfirm} onCancel={onCancel} />
        </div>
      )}

      {busy && !pending && <Thinking liveStep={liveStep} variant={variant} />}

      {providerIssue && (
        <Notice
          tone="warning"
          compact
          title={providerIssue.quota ? "Limite mensal da Vex atingido" : "A Vex está em modo básico"}
          actions={
            providerIssue.quota ? (
              <ButtonLink to="/assinatura" size="sm" variant="primary">
                Conhecer o Plus
              </ButtonLink>
            ) : (
              <Button size="sm" variant="ghost" onClick={onDismissIssue}>
                Entendi
              </Button>
            )
          }
        >
          {providerIssue.quota
            ? providerIssue.message
            : "Não consegui falar com o serviço de IA, então por enquanto entendo só comandos simples (como “criar tarefa: …”). Tente de novo em instantes."}
        </Notice>
      )}

      {notice && (
        <Notice
          tone={notice.tone === "error" ? "error" : "info"}
          compact
          actions={
            notice.retry ? (
              <Button size="sm" variant="secondary" leadingIcon={<ArrowClockwiseIcon size={14} />} onClick={onRetry}>
                Tentar de novo
              </Button>
            ) : undefined
          }
        >
          {notice.text}
        </Notice>
      )}
    </div>
  );
}
