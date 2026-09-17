import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useGoals } from "@qqorvex/module-metas-habitos";
import { useLinkGoalToPlan, usePlanGoalRelations, useUnlinkGoalFromPlan } from "../hooks/useVidaPessoal";
import { computePlanLabel } from "../service";
import type { Plan, PlanStatus, PlanType } from "../types";

const STATUS_LABEL: Record<PlanStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

/** ativo = em andamento (cyan) · arquivado = parado (âmbar) · concluído = sucesso (verde). */
const STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  ativo: "info",
  concluido: "success",
  arquivado: "warning",
};

const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  mensal: "Mensal",
  anual: "Anual",
  quinquenal: "Quinquenal",
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
  const [goalsOpen, setGoalsOpen] = useState(false);

  return (
    <div className="qv-card p-4 flex flex-col gap-[9px]">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-[1.35] text-text-primary">{plan.title}</span>
        <button
          type="button"
          className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
          aria-label={`Excluir "${plan.title}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>
      <span className="text-[13px] leading-normal text-text-secondary">
        {PLAN_TYPE_LABEL[plan.plan_type]} · <span className="font-mono text-xs">{computePlanLabel(plan)}</span>
        {plan.description && <> · {plan.description}</>}
      </span>
      <Badge tone={STATUS_TONE[plan.status]} className="self-start">
        {STATUS_LABEL[plan.status]}
      </Badge>

      <div className="qv-row-top pt-[9px] flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant="ghost" size="xs" aria-expanded={goalsOpen} onClick={() => setGoalsOpen((v) => !v)}>
          Metas <span className="font-mono text-text-muted">{linkedGoals.length}</span>
          <span aria-hidden>{goalsOpen ? "‹" : "›"}</span>
        </Button>
        <span className="flex-1" />
        {plan.status === "ativo" && <StatusButton label="Concluir" onClick={() => onChangeStatus("concluido")} />}
        {plan.status !== "arquivado" && <StatusButton label="Arquivar" onClick={() => onChangeStatus("arquivado")} />}
        {plan.status !== "ativo" && <StatusButton label="Reativar" onClick={() => onChangeStatus("ativo")} />}
      </div>

      {goalsOpen && (
        <div className="flex flex-col gap-2">
          <span className="qv-eyebrow">Metas vinculadas</span>
          {linkedGoals.length === 0 ? (
            <p className="text-[13px] text-text-secondary">Nenhuma meta vinculada ainda.</p>
          ) : (
            <ul className="flex flex-col">
              {linkedGoals.map((goal) => (
                <li key={goal.id} className="qv-row flex items-center gap-2 py-1.5 text-[13px] text-text-primary">
                  <span className="flex-1 min-w-0">{goal.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => unlinkGoal.mutate({ planId: plan.id, goalId: goal.id })}
                  >
                    Desvincular
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {linkableGoals.length > 0 && (
            <select
              defaultValue=""
              aria-label="Vincular uma meta"
              onChange={(e) => {
                if (!e.target.value) return;
                linkGoal.mutate({ planId: plan.id, goalId: e.target.value });
                e.target.value = "";
              }}
              className="qv-field py-2 text-[13px]"
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
      )}

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
  );
}

function StatusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="quiet" size="xs" onClick={onClick}>
      {label}
    </Button>
  );
}
