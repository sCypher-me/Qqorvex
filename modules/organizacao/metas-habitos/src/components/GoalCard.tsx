import { useState } from "react";
import { CheckCircleIcon, CheckIcon, DotsThreeIcon, FlagIcon, PauseIcon, PencilSimpleIcon, PlayIcon, TrashIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import { Badge, Button, Checkbox, DropdownMenu, IconButton, ProgressBar, cx, type BadgeTone } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useAccounts, useTransactions, computeAccountBalance } from "@qqorvex/module-financas";
import {
  useCreateMilestone,
  useCreateCheckin,
  useDeleteMilestone,
  useGoalCheckins,
  useGoalHabitRelations,
  useLinkGoalHabit,
  useMilestones,
  useToggleMilestone,
  useUnlinkGoalHabit,
  useUpdateGoalProgressSource,
  useUpdateMilestone,
} from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { computeDerivedProgress, computeMilestoneProgress, localDateKey } from "../service";
import type { Goal, GoalMilestone, GoalStatus } from "../types";

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  planejada: { label: "Planejada", tone: "neutral" },
  ativa: { label: "Ativa", tone: "info" },
  pausada: { label: "Pausada", tone: "warning" },
  concluida: { label: "Concluída", tone: "success" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(isoDate: string) {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", ...(y === new Date().getFullYear() ? {} : { year: "numeric" }) });
}

function daysUntil(isoDate: string): number {
  const [y = 0, m = 1, d = 1] = isoDate.split("-").map(Number);
  const today = new Date();
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
}

/** Progresso real da meta (marcos, saldo de uma conta ou percentual manual) — nunca inventado. */
function useGoalProgress(client: SupabaseClient<Database>, goal: Goal) {
  const { milestones } = useMilestones(client, goal.id);
  const { accounts } = useAccounts(client);
  const { transactions } = useTransactions(client);
  const milestoneProgress = goal.progress_type === "marcos" ? computeMilestoneProgress(milestones) : null;
  const linkedAccount = accounts.find((account) => account.id === goal.progress_source_account_id);
  const derived =
    goal.progress_type === "derivado" && linkedAccount && goal.progress_numeric_target
      ? (() => {
          const currentBalance = computeAccountBalance(transactions, linkedAccount.id);
          return { account: linkedAccount, currentBalance, targetAmount: goal.progress_numeric_target, percent: computeDerivedProgress(currentBalance, goal.progress_numeric_target) };
        })()
      : null;
  const percent = derived?.percent ?? milestoneProgress ?? (goal.progress_type === "percentual_manual" ? goal.progress_percent : null) ?? (goal.status === "concluida" ? 100 : null);
  const milestonesDone = milestones.filter((milestone) => milestone.is_done).length;
  return { milestones, milestonesDone, derived, percent, accounts };
}

export interface GoalCardProps {
  client: SupabaseClient<Database>;
  goal: Goal;
  onOpen: () => void;
  onChangeStatus: (status: GoalStatus) => void;
  onEdit?: () => void;
  onDelete: () => void;
}

/** Resumo da meta: prazo, progresso e o próximo passo. Clique abre os detalhes. */
export function GoalCard({ client, goal, onOpen, onChangeStatus, onEdit, onDelete }: GoalCardProps) {
  const { percent, milestones, milestonesDone, derived } = useGoalProgress(client, goal);
  const status = GOAL_STATUS[goal.status];
  const days = goal.due_date ? daysUntil(goal.due_date) : null;
  const overdue = days !== null && days < 0 && goal.status !== "concluida" && goal.status !== "cancelada";
  const nextMilestone = milestones.find((milestone) => !milestone.is_done);

  return (
    <article className={cx("group relative flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong", (goal.status === "cancelada" || goal.status === "concluida") && "opacity-75")}>
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-['']">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-fg">{goal.title}</h3>
        </button>
        {goal.status !== "ativa" && <Badge tone={status.tone}>{status.label}</Badge>}
        <div className="relative z-[1]">
          <DropdownMenu
            label={`Ações para ${goal.title}`}
            items={[
              ...(onEdit ? [{ label: "Editar", icon: <PencilSimpleIcon />, onSelect: onEdit }] : []),
              ...(goal.status === "planejada" || goal.status === "pausada" ? [{ label: goal.status === "planejada" ? "Ativar" : "Retomar", icon: <PlayIcon />, onSelect: () => onChangeStatus("ativa") }] : []),
              ...(goal.status === "ativa" ? [{ label: "Pausar", icon: <PauseIcon />, onSelect: () => onChangeStatus("pausada") }] : []),
              ...(goal.status !== "concluida" ? [{ label: "Marcar como concluída", icon: <CheckCircleIcon />, onSelect: () => onChangeStatus("concluida") }] : []),
              ...(goal.status !== "cancelada" && goal.status !== "concluida" ? [{ label: "Cancelar meta", icon: <XCircleIcon />, onSelect: () => onChangeStatus("cancelada") }] : []),
              "separator",
              { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
            ]}
            trigger={(props) => (
              <button type="button" {...props} aria-label={`Ações para ${goal.title}`} className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-fg-4 hover:bg-hover hover:text-fg">
                <DotsThreeIcon size={18} weight="bold" />
              </button>
            )}
          />
        </div>
      </div>

      {(goal.category || goal.due_date) && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-3">
          {goal.category && <span className="rounded-full bg-hover px-2 py-0.5 text-fg-2">{goal.category}</span>}
          {goal.due_date && (
            <span className={cx("inline-flex items-center gap-1", overdue && "text-danger")}>
              <FlagIcon size={12} />
              {formatDate(goal.due_date)}
              {days !== null && goal.status !== "concluida" && goal.status !== "cancelada" && <span className="text-fg-4">· {days < 0 ? `${-days} d atrasada` : days === 0 ? "hoje" : `faltam ${days} d`}</span>}
            </span>
          )}
        </div>
      )}

      {percent !== null ? (
        <div className="mt-auto">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-fg-3">{derived ? `${formatCurrency(derived.currentBalance)} de ${formatCurrency(derived.targetAmount)}` : goal.progress_type === "marcos" ? `${milestonesDone} de ${milestones.length} marcos` : "Progresso"}</span>
            <span className="font-semibold tabular-nums text-fg">{Math.round(percent)}%</span>
          </div>
          <ProgressBar value={percent} tone={goal.status === "concluida" ? "success" : goal.status === "pausada" ? "warning" : "gold"} height={6} label={`Progresso de ${goal.title}`} />
        </div>
      ) : (
        <p className="mt-auto text-xs text-fg-4">Sem medida de progresso — adicione marcos ou ligue a uma conta.</p>
      )}

      {nextMilestone && goal.status === "ativa" && (
        <p className="truncate border-t border-line-soft pt-2.5 text-xs text-fg-3">
          Próximo marco: <span className="text-fg-2">{nextMilestone.title}</span>
        </p>
      )}
    </article>
  );
}

/** Detalhes da meta (painel lateral): motivação, atualizações, marcos, progresso financeiro e hábitos. */
/** Marco com edição no lugar: lápis troca o texto por um campo (Enter salva, Esc cancela). */
function MilestoneItem({
  milestone,
  onToggle,
  onRename,
  onDelete,
}: {
  milestone: GoalMilestone;
  onToggle: (isDone: boolean) => void;
  onRename: (title: string) => Promise<unknown>;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null) {
    const save = async () => {
      const title = draft.trim();
      if (title && title !== milestone.title) await onRename(title);
      setDraft(null);
    };
    return (
      <li>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                // Esc cancela só a edição do marco, sem fechar o painel da meta (<dialog> nativo).
                event.preventDefault();
                setDraft(null);
              }
            }}
            aria-label="Texto do marco"
            maxLength={200}
            autoFocus
            data-size="sm"
            className="q-input flex-1"
          />
          <IconButton label="Salvar marco" size="sm" type="submit" disabled={!draft.trim()}>
            <CheckIcon />
          </IconButton>
          <IconButton label="Cancelar edição" size="sm" onClick={() => setDraft(null)}>
            <XIcon />
          </IconButton>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-1">
      <Checkbox label={milestone.title} checked={milestone.is_done} onChange={(event) => onToggle(event.target.checked)} className={cx("min-w-0 flex-1", milestone.is_done && "[&_span]:text-fg-3 [&_span]:line-through")} />
      <span className="flex shrink-0 gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <IconButton label={`Editar marco ${milestone.title}`} size="sm" onClick={() => setDraft(milestone.title)}>
          <PencilSimpleIcon />
        </IconButton>
        <IconButton label={`Excluir marco ${milestone.title}`} size="sm" variant="danger" onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </span>
    </li>
  );
}

export function GoalDetails({ client, goal }: { client: SupabaseClient<Database>; goal: Goal }) {
  const { milestones, milestonesDone, derived, percent, accounts } = useGoalProgress(client, goal);
  const createMilestone = useCreateMilestone(client, goal.id);
  const toggleMilestone = useToggleMilestone(client, goal.id);
  const updateMilestone = useUpdateMilestone(client, goal.id);
  const deleteMilestone = useDeleteMilestone(client, goal.id);
  const createCheckin = useCreateCheckin(client, goal.id);
  const { checkins } = useGoalCheckins(client, goal.id, true);
  const { habits } = useHabits(client);
  const { relations } = useGoalHabitRelations(client);
  const linkHabit = useLinkGoalHabit(client);
  const unlinkHabit = useUnlinkGoalHabit(client);
  const updateProgressSource = useUpdateGoalProgressSource(client);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const linkedHabitIds = new Set(relations.filter((relation) => relation.goal_id === goal.id).map((relation) => relation.habit_id));
  const linkedHabits = habits.filter((habit) => linkedHabitIds.has(habit.id));
  const linkableHabits = habits.filter((habit) => !linkedHabitIds.has(habit.id) && habit.status !== "arquivado");
  const sectionTitle = "mb-2 text-[13px] font-semibold text-fg";

  return (
    <div className="flex flex-col gap-6">
      {percent !== null && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] text-fg-3">Progresso</span>
            <span className="font-display text-[22px] font-semibold tabular-nums text-fg">{Math.round(percent)}%</span>
          </div>
          <ProgressBar value={percent} height={8} label="Progresso da meta" />
        </div>
      )}

      {goal.motivation_note && <blockquote className="border-l-2 border-gold-line pl-3 text-[13.5px] italic leading-relaxed text-fg-2">{goal.motivation_note}</blockquote>}
      {goal.description && <p className="text-[13.5px] leading-relaxed text-fg-2">{goal.description}</p>}

      <section>
        <h3 className={sectionTitle}>
          Marcos {milestones.length > 0 && <span className="font-normal text-fg-3">· {milestonesDone} de {milestones.length}</span>}
        </h3>
        {milestones.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1">
            {milestones.map((milestone) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                onToggle={(isDone) => toggleMilestone.mutate({ milestoneId: milestone.id, isDone })}
                onRename={(title) => updateMilestone.mutateAsync({ milestoneId: milestone.id, title })}
                onDelete={() => deleteMilestone.mutate(milestone.id)}
              />
            ))}
          </ul>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!milestoneTitle.trim()) return;
            createMilestone.mutate(milestoneTitle.trim(), { onSuccess: () => setMilestoneTitle("") });
          }}
        >
          <input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Novo marco + Enter" aria-label="Novo marco" data-size="sm" className="q-input" />
        </form>
        {goal.progress_type !== "marcos" && milestones.length > 0 && <p className="mt-1.5 text-[11px] text-fg-4">O progresso desta meta vem de outra fonte; os marcos servem como checklist.</p>}
      </section>

      <section>
        <h3 className={sectionTitle}>Atualizações</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!checkinNote.trim()) return;
            createCheckin.mutate({ note: checkinNote.trim(), progressPercentSnapshot: percent ?? undefined }, { onSuccess: () => setCheckinNote("") });
          }}
          className="flex gap-2"
        >
          <input value={checkinNote} onChange={(event) => setCheckinNote(event.target.value)} placeholder="O que avançou?" aria-label="Nova atualização" maxLength={300} data-size="sm" className="q-input flex-1" />
          <Button type="submit" size="sm" variant="secondary" disabled={!checkinNote.trim()} loading={createCheckin.isPending}>
            Registrar
          </Button>
        </form>
        {checkins.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-2 border-l border-line pl-3">
            {checkins.slice(0, 6).map((checkin) => (
              <li key={checkin.id} className="text-[13px]">
                <p className="text-fg-2">{checkin.note || "Atualização registrada"}</p>
                <p className="text-[11px] text-fg-4">
                  {formatDate(checkin.checkin_date)}
                  {checkin.progress_percent_snapshot !== null ? ` · ${Math.round(checkin.progress_percent_snapshot)}%` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-fg-4">Registre pequenos avanços para enxergar a jornada.</p>
        )}
      </section>

      <section>
        <h3 className={sectionTitle}>Progresso por saldo</h3>
        {derived ? (
          <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1 truncate text-fg-2">
              {derived.account.name}: <span className="tabular-nums text-fg">{formatCurrency(derived.currentBalance)}</span> de {formatCurrency(derived.targetAmount)}
            </span>
            <Button size="xs" variant="ghost" onClick={() => updateProgressSource.mutate({ goalId: goal.id, source: null })}>
              Desvincular
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-fg-4">Crie uma conta em Finanças para acompanhar metas de dinheiro pelo saldo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Conta" data-size="sm" className="q-input min-w-[140px] flex-1">
              <option value="">Conta de referência…</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input type="number" min={1} value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="Valor alvo" aria-label="Valor alvo" data-size="sm" className="q-input w-32" />
            <Button
              size="sm"
              variant="secondary"
              disabled={!accountId || !(Number(targetAmount) > 0)}
              onClick={() => updateProgressSource.mutate({ goalId: goal.id, source: { accountId, targetAmount: Number(targetAmount) } }, { onSuccess: () => { setAccountId(""); setTargetAmount(""); } })}
            >
              Vincular
            </Button>
          </div>
        )}
      </section>

      <section>
        <h3 className={sectionTitle}>Hábitos que ajudam</h3>
        {linkedHabits.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {linkedHabits.map((habit) => (
              <li key={habit.id} className="inline-flex items-center gap-1 rounded-full bg-hover py-0.5 pl-2.5 pr-1 text-xs text-fg-2">
                {habit.name}
                <button type="button" aria-label={`Desvincular ${habit.name}`} onClick={() => unlinkHabit.mutate({ goalId: goal.id, habitId: habit.id })} className="rounded-full p-0.5 text-fg-4 hover:bg-selected hover:text-fg">
                  <XCircleIcon size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {linkableHabits.length > 0 ? (
          <select
            value=""
            aria-label="Vincular um hábito"
            onChange={(event) => {
              if (event.target.value) linkHabit.mutate({ goalId: goal.id, habitId: event.target.value });
            }}
            data-size="sm"
            className="q-input"
          >
            <option value="">Vincular um hábito…</option>
            {linkableHabits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
        ) : (
          linkedHabits.length === 0 && <p className="text-xs text-fg-4">Crie hábitos para ligá-los a esta meta.</p>
        )}
      </section>

      <p className="text-[11px] text-fg-4">Criada em {formatDate(goal.created_at.slice(0, 10))}{goal.due_date ? ` · prazo ${formatDate(goal.due_date)}` : ""} · hoje {formatDate(localDateKey())}</p>
    </div>
  );
}
