import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Card, Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useGoals } from "@qqorvex/module-metas-habitos";
import { useLinkGoalToPlan, usePlanGoalRelations, useUnlinkGoalFromPlan } from "../hooks/useVidaPessoal";
import { computePlanLabel } from "../service";
import type { Plan, PlanStatus } from "../types";

const STATUS_LABEL: Record<PlanStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  ativo: "success",
  concluido: "info",
  arquivado: "warning",
};

/** Um Plano agrupa Metas já existentes por referência — nunca duplica a Meta. */
export function PlanCard({
  client,
  plan,
  onChangeStatus,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  plan: Plan;
  onChangeStatus: (status: PlanStatus) => void;
  onDelete: () => void;
}) {
  const { goals } = useGoals(client);
  const { relations } = usePlanGoalRelations(client);
  const linkGoal = useLinkGoalToPlan(client);
  const unlinkGoal = useUnlinkGoalFromPlan(client);

  const linkedGoalIds = new Set(relations.filter((r) => r.plan_id === plan.id).map((r) => r.goal_id));
  const linkedGoals = goals.filter((g) => linkedGoalIds.has(g.id));
  const linkableGoals = goals.filter((g) => !linkedGoalIds.has(g.id));
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold text-text-primary">{plan.title}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
            <span className="font-sans text-xs text-text-secondary-warm">{computePlanLabel(plan)}</span>
          </div>
        </div>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={`Excluir "${plan.title}"?`}
          description="Essa ação não pode ser desfeita."
          onConfirm={() => {
            setConfirmOpen(false);
            onDelete();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {plan.status === "ativo" && (
          <StatusButton label="Concluir" onClick={() => onChangeStatus("concluido")} />
        )}
        {plan.status !== "arquivado" && <StatusButton label="Arquivar" onClick={() => onChangeStatus("arquivado")} />}
        {plan.status !== "ativo" && <StatusButton label="Reativar" onClick={() => onChangeStatus("ativo")} />}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-xs text-text-secondary-warm">Metas vinculadas</p>
        {linkedGoals.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary-warm">Nenhuma meta vinculada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {linkedGoals.map((goal) => (
              <li key={goal.id} className="flex items-center justify-between gap-2 text-sm text-text-primary">
                <span>{goal.title}</span>
                <Button type="button" variant="chip" onClick={() => unlinkGoal.mutate({ planId: plan.id, goalId: goal.id })}>
                  Desvincular
                </Button>
              </li>
            ))}
          </ul>
        )}

        {linkableGoals.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              linkGoal.mutate({ planId: plan.id, goalId: e.target.value });
              e.target.value = "";
            }}
            className="mt-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Vincular uma meta...</option>
            {linkableGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
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
