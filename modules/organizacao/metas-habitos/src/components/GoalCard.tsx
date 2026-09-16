import { useState } from "react";
import { Button, Card, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useAccounts, useTransactions, computeAccountBalance } from "@qqorvex/module-financas";
import {
  useCreateMilestone,
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
  planejada: "info",
  ativa: "warning",
  pausada: "info",
  concluida: "success",
  cancelada: "error",
};

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
  const toggleMilestone = useToggleMilestone(client, goal.id);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold text-text-primary">{goal.title}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={STATUS_TONE[goal.status]}>{STATUS_LABEL[goal.status]}</Badge>
            <span className="font-sans text-xs text-text-secondary-warm">
              {goal.due_date && `prazo ${goal.due_date}`}
              {milestoneProgress !== null && ` · ${milestoneProgress}% dos marcos`}
              {derivedProgress && ` · ${derivedProgress.percent}% (R$ ${derivedProgress.currentBalance.toFixed(2)} de R$ ${derivedProgress.targetAmount.toFixed(2)})`}
            </span>
          </div>
        </div>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
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

      <div className="flex flex-wrap gap-1">
        {goal.status === "ativa" && (
          <>
            <StatusButton label="Pausar" onClick={() => onChangeStatus("pausada")} />
            <StatusButton label="Concluir" onClick={() => onChangeStatus("concluida")} />
            <StatusButton label="Cancelar" onClick={() => onChangeStatus("cancelada")} />
          </>
        )}
        {goal.status === "planejada" && <StatusButton label="Ativar" onClick={() => onChangeStatus("ativa")} />}
        {goal.status === "pausada" && <StatusButton label="Retomar" onClick={() => onChangeStatus("ativa")} />}
      </div>

      <div className="flex flex-col gap-1">
        {milestones.map((milestone) => (
          <label key={milestone.id} className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={milestone.is_done}
              onChange={(e) => toggleMilestone.mutate({ milestoneId: milestone.id, isDone: e.target.checked })}
            />
            <span className={milestone.is_done ? "line-through text-text-secondary-warm" : ""}>
              {milestone.title}
            </span>
          </label>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!milestoneTitle.trim()) return;
            createMilestone.mutate(milestoneTitle.trim());
            setMilestoneTitle("");
          }}
          className="flex gap-2 mt-1"
        >
          <input
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
            placeholder="Novo marco"
            className="flex-1 text-sm rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary outline-none focus:border-brand-cyan"
          />
          <Button type="submit" variant="ghost">
            Adicionar marco
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-xs text-text-secondary-warm">Progresso financeiro</p>
        {derivedProgress && linkedAccount ? (
          <div className="flex items-center justify-between gap-2 text-sm text-text-primary">
            <span>
              {linkedAccount.name}: R$ {derivedProgress.currentBalance.toFixed(2)} de R$ {derivedProgress.targetAmount.toFixed(2)} (
              {derivedProgress.percent}%)
            </span>
            <Button type="button" variant="chip" onClick={handleUnlinkAccount}>
              Desvincular
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="flex-1 text-sm rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary"
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
              className="w-28 text-sm rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary outline-none focus:border-brand-cyan"
            />
            <Button variant="ghost" onClick={handleLinkAccount}>
              Vincular
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-xs text-text-secondary-warm">Hábitos vinculados</p>
        {linkedHabits.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary-warm">Nenhum hábito vinculado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {linkedHabits.map((habit) => (
              <li key={habit.id} className="flex items-center justify-between gap-2 text-sm text-text-primary">
                <span>{habit.name}</span>
                <Button type="button" variant="chip" onClick={() => unlinkHabit.mutate({ goalId: goal.id, habitId: habit.id })}>
                  Desvincular
                </Button>
              </li>
            ))}
          </ul>
        )}

        {linkableHabits.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              linkHabit.mutate({ goalId: goal.id, habitId: e.target.value });
              e.target.value = "";
            }}
            className="mt-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
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
    </Card>
  );
}

function StatusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="chip" onClick={onClick}>
      {label}
    </Button>
  );
}
