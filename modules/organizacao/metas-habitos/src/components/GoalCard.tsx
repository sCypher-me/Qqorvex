import { useState } from "react";
import { Button, Badge, ConfirmDialog, ProgressBar, type BadgeTone } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useAccounts, useTransactions, computeAccountBalance } from "@qqorvex/module-financas";
import {
  useCreateMilestone,
  useCreateCheckin,
  useGoalCheckins,
  useGoalHabitRelations,
  useLinkGoalHabit,
  useMilestones,
  useToggleMilestone,
  useUnlinkGoalHabit,
  useUpdateGoalProgressSource,
} from "../hooks/useGoals";
import { useHabits } from "../hooks/useHabits";
import { computeDerivedProgress, computeMilestoneProgress } from "../service";
import type { Goal, GoalStatus } from "../types";

const STATUS_LABEL: Record<GoalStatus, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<GoalStatus, BadgeTone> = {
  planejada: "neutral",
  ativa: "info",
  pausada: "warning",
  concluida: "success",
  cancelada: "outline",
};

const PROGRESS_TONE: Record<GoalStatus, "cyan" | "success" | "warning"> = {
  planejada: "cyan",
  ativa: "cyan",
  pausada: "warning",
  concluida: "success",
  cancelada: "cyan",
};

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function GoalCard({
  client,
  goal,
  onChangeStatus,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  goal: Goal;
  onChangeStatus: (status: GoalStatus) => void;
  onDelete: () => void;
}) {
  const { milestones } = useMilestones(client, goal.id);
  const createMilestone = useCreateMilestone(client, goal.id);
  const createCheckin = useCreateCheckin(client, goal.id);
  const toggleMilestone = useToggleMilestone(client, goal.id);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { checkins } = useGoalCheckins(client, goal.id, detailsOpen);

  const { habits } = useHabits(client);
  const { relations } = useGoalHabitRelations(client);
  const linkHabit = useLinkGoalHabit(client);
  const unlinkHabit = useUnlinkGoalHabit(client);

  const { accounts } = useAccounts(client);
  const { transactions } = useTransactions(client);
  const updateProgressSource = useUpdateGoalProgressSource(client);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  const milestoneProgress = goal.progress_type === "marcos" ? computeMilestoneProgress(milestones) : null;

  const linkedAccount = accounts.find((a) => a.id === goal.progress_source_account_id);
  const derivedProgress =
    goal.progress_type === "derivado" && linkedAccount && goal.progress_numeric_target
      ? {
          currentBalance: computeAccountBalance(transactions, linkedAccount.id),
          targetAmount: goal.progress_numeric_target,
          percent: computeDerivedProgress(computeAccountBalance(transactions, linkedAccount.id), goal.progress_numeric_target),
        }
      : null;

  // Percentual só quando existe dado real para ele — nunca inventar progresso.
  const progressPercent =
    derivedProgress?.percent ??
    milestoneProgress ??
    (goal.progress_type === "percentual_manual" ? goal.progress_percent : null) ??
    (goal.status === "concluida" ? 100 : null);

  const metaParts: string[] = [];
  if (goal.due_date) metaParts.push(`Prazo ${formatDate(goal.due_date)}`);
  if (milestoneProgress !== null) {
    const done = milestones.filter((m) => m.is_done).length;
    metaParts.push(`${done} de ${milestones.length} marcos`);
  }
  if (derivedProgress) {
    metaParts.push(`${formatCurrency(derivedProgress.currentBalance)} de ${formatCurrency(derivedProgress.targetAmount)}`);
  }

  function handleLinkAccount() {
    const target = Number(targetAmount);
    if (!selectedAccountId || !(target > 0)) return;
    updateProgressSource.mutate({ goalId: goal.id, source: { accountId: selectedAccountId, targetAmount: target } });
    setSelectedAccountId("");
    setTargetAmount("");
  }

  function handleUnlinkAccount() {
    updateProgressSource.mutate({ goalId: goal.id, source: null });
  }

  const linkedHabitIds = new Set(relations.filter((r) => r.goal_id === goal.id).map((r) => r.habit_id));
  const linkedHabits = habits.filter((h) => linkedHabitIds.has(h.id));
  const linkableHabits = habits.filter((h) => !linkedHabitIds.has(h.id));

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-[18px] flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="text-[15px] font-semibold flex-1 leading-[1.35] text-fg">{goal.title}</span>
        <Badge tone={STATUS_TONE[goal.status]}>{STATUS_LABEL[goal.status]}</Badge>
      </div>

      {goal.description && <p className="text-[13px] leading-relaxed text-fg-2">{goal.description}</p>}

      {metaParts.length > 0 && (
        <span className="text-[13px] text-fg-2 leading-normal">{metaParts.join(" · ")}</span>
      )}

      {goal.category && <Badge tone="neutral">{goal.category}</Badge>}

      {progressPercent !== null && (
        <div className="flex items-center gap-3">
          <ProgressBar value={progressPercent} tone={PROGRESS_TONE[goal.status]} className="flex-1" />
          <span className="font-mono text-xs text-fg-2">{Math.round(progressPercent)}%</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {goal.status === "ativa" && (
          <>
            <StatusButton label="Pausar" onClick={() => onChangeStatus("pausada")} />
            <StatusButton label="Concluir" onClick={() => onChangeStatus("concluida")} />
            <StatusButton label="Cancelar" onClick={() => onChangeStatus("cancelada")} />
          </>
        )}
        {goal.status === "planejada" && <StatusButton label="Ativar" onClick={() => onChangeStatus("ativa")} />}
        {goal.status === "pausada" && <StatusButton label="Retomar" onClick={() => onChangeStatus("ativa")} />}
        <span className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Ocultar detalhes" : "Detalhes ›"}
        </Button>
      </div>

      {detailsOpen && (
        <div className="border-t border-line-soft pt-3.5 flex flex-col gap-4">
          {goal.motivation_note && (
            <blockquote className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 border-l-2 border-gold-line px-3 py-2.5 text-[13px] italic leading-relaxed text-fg-2">
              {goal.motivation_note}
            </blockquote>
          )}

          <section className="flex flex-col gap-2" aria-label="Atualizações da meta">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Atualizações</span>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!checkinNote.trim()) return;
                createCheckin.mutate(
                  { note: checkinNote.trim(), progressPercentSnapshot: progressPercent ?? undefined },
                  { onSuccess: () => setCheckinNote("") },
                );
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={checkinNote}
                onChange={(event) => setCheckinNote(event.target.value)}
                placeholder="O que avançou desde a última atualização?"
                aria-label="Nova atualização da meta"
                maxLength={300}
                className="q-input min-w-0 flex-1 py-2 px-3 text-[13px]"
              />
              <Button type="submit" variant="secondary" size="sm" disabled={!checkinNote.trim() || createCheckin.isPending}>
                {createCheckin.isPending ? "Salvando…" : "Registrar"}
              </Button>
            </form>
            {checkins.length > 0 ? (
              <ol className="flex flex-col">
                {checkins.slice(0, 4).map((checkin) => (
                  <li key={checkin.id} className="border-t border-line-soft flex items-start justify-between gap-3 py-2 text-[12px]">
                    <span className="min-w-0 leading-relaxed text-fg-2">{checkin.note || "Atualização registrada"}</span>
                    <span className="shrink-0 font-mono text-fg-3">
                      {formatDate(checkin.checkin_date)}
                      {checkin.progress_percent_snapshot !== null ? ` · ${Math.round(checkin.progress_percent_snapshot)}%` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-fg-3">Registre pequenos avanços para manter o contexto da sua jornada.</p>
            )}
          </section>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Marcos</span>
            {milestones.map((milestone) => (
              <label key={milestone.id} className="flex items-center gap-2.5 text-[13px] text-fg cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[var(--q-gold)]"
                  checked={milestone.is_done}
                  onChange={(e) => toggleMilestone.mutate({ milestoneId: milestone.id, isDone: e.target.checked })}
                />
                <span className={milestone.is_done ? "line-through text-fg-3" : ""}>{milestone.title}</span>
              </label>
            ))}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!milestoneTitle.trim()) return;
                createMilestone.mutate(milestoneTitle.trim());
                setMilestoneTitle("");
              }}
              className="flex gap-2"
            >
              <input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="Novo marco"
                aria-label="Novo marco"
                className="q-input flex-1 py-2 px-3 text-[13px]"
              />
              <Button type="submit" variant="secondary" size="sm">
                Adicionar marco
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Progresso financeiro</span>
            {derivedProgress && linkedAccount ? (
              <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5 flex items-center justify-between gap-2 text-[13px] text-fg">
                <span>
                  {linkedAccount.name}:{" "}
                  <span className="font-mono">
                    {formatCurrency(derivedProgress.currentBalance)} de {formatCurrency(derivedProgress.targetAmount)} (
                    {derivedProgress.percent}%)
                  </span>
                </span>
                <Button type="button" variant="quiet" size="xs" onClick={handleUnlinkAccount}>
                  Desvincular
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  aria-label="Conta"
                  className="q-input flex-1 min-w-[140px] py-2 px-3 text-[13px]"
                >
                  <option value="">Vincular a uma Conta...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="Valor alvo"
                  aria-label="Valor alvo"
                  className="q-input w-28 py-2 px-3 text-[13px] font-mono"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleLinkAccount}>
                  Vincular
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Hábitos vinculados</span>
            {linkedHabits.length === 0 ? (
              <p className="text-[13px] text-fg-2">Nenhum hábito vinculado ainda.</p>
            ) : (
              <ul className="flex flex-col">
                {linkedHabits.map((habit) => (
                  <li key={habit.id} className="border-b border-line-soft last:border-b-0 flex items-center justify-between gap-2 py-1.5 text-[13px] text-fg">
                    <span>{habit.name}</span>
                    <Button type="button" variant="quiet" size="xs" onClick={() => unlinkHabit.mutate({ goalId: goal.id, habitId: habit.id })}>
                      Desvincular
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {linkableHabits.length > 0 && (
              <select
                defaultValue=""
                aria-label="Vincular um hábito"
                onChange={(e) => {
                  if (!e.target.value) return;
                  linkHabit.mutate({ goalId: goal.id, habitId: e.target.value });
                  e.target.value = "";
                }}
                className="q-input py-2 px-3 text-[13px]"
              >
                <option value="">Vincular um hábito...</option>
                {linkableHabits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="destructive" size="xs" onClick={() => setConfirmOpen(true)}>
              Excluir meta
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${goal.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function StatusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="quiet" size="xs" onClick={onClick}>
      {label}
    </Button>
  );
}
