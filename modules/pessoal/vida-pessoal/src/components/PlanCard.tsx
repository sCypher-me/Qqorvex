import { useState } from "react";
import { ArchiveIcon, ArrowCounterClockwiseIcon, CaretDownIcon, CheckCircleIcon, PencilSimpleIcon, TargetIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, ConfirmDialog, IconButton, ProgressBar, cx, type BadgeTone } from "@qqorvex/ui";
import { useGoals } from "@qqorvex/module-metas-habitos";
import { useLinkGoalToPlan, usePlanGoalRelations, useUnlinkGoalFromPlan } from "../hooks/useVidaPessoal";
import { computePlanLabel } from "../service";
import type { Plan, PlanStatus, PlanType } from "../types";
import { KebabMenu } from "./PanelShell";

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { ativo: "Ativo", concluido: "Concluído", arquivado: "Arquivado" };
export const PLAN_STATUS_TONE: Record<PlanStatus, BadgeTone> = { ativo: "gold", concluido: "success", arquivado: "neutral" };
const PLAN_TYPE_LABEL: Record<PlanType, string> = { mensal: "Mensal", anual: "Anual", quinquenal: "5 anos" };

export function statusMenu(status: PlanStatus, onChange: (status: PlanStatus) => void, onDelete: () => void, onEdit?: () => void) {
  return [
    ...(onEdit ? [{ label: "Editar", icon: <PencilSimpleIcon />, onSelect: onEdit }] : []),
    ...(status === "ativo" ? [{ label: "Marcar como concluído", icon: <CheckCircleIcon />, onSelect: () => onChange("concluido") }] : []),
    ...(status !== "arquivado" ? [{ label: "Arquivar", icon: <ArchiveIcon />, onSelect: () => onChange("arquivado") }] : []),
    ...(status !== "ativo" ? [{ label: "Reativar", icon: <ArrowCounterClockwiseIcon />, onSelect: () => onChange("ativo") }] : []),
    "separator" as const,
    { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: onDelete },
  ];
}

/** Um Plano agrupa Metas já existentes por referência — nunca duplica a Meta. */
export function PlanCard({
  client,
  plan,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  plan: Plan;
  onChangeStatus: (status: PlanStatus) => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const { goals } = useGoals(client);
  const { relations } = usePlanGoalRelations(client);
  const linkGoal = useLinkGoalToPlan(client);
  const unlinkGoal = useUnlinkGoalFromPlan(client);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const linkedGoalIds = new Set(relations.filter((r) => r.plan_id === plan.id).map((r) => r.goal_id));
  const linkedGoals = goals.filter((g) => linkedGoalIds.has(g.id));
  const linkableGoals = goals.filter((g) => !linkedGoalIds.has(g.id));
  const averageProgress = linkedGoals.length
    ? Math.round(linkedGoals.reduce((sum, goal) => sum + (goal.status === "concluida" ? 100 : goal.progress_percent ?? 0), 0) / linkedGoals.length)
    : null;

  return (
    <article className={cx("min-w-0 rounded-xl border border-line bg-surface", plan.status !== "ativo" && "opacity-75")}>
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-fg-3">
            {PLAN_TYPE_LABEL[plan.plan_type]} · {computePlanLabel(plan)}
          </p>
          <h3 className="mt-0.5 text-[14.5px] font-semibold leading-snug text-fg">{plan.title}</h3>
          {plan.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-2">{plan.description}</p>}
        </div>
        {plan.status !== "ativo" && <Badge tone={PLAN_STATUS_TONE[plan.status]}>{PLAN_STATUS_LABEL[plan.status]}</Badge>}
        <KebabMenu label={`Ações para ${plan.title}`} items={statusMenu(plan.status, onChangeStatus, () => setConfirmOpen(true), onEdit)} />
      </div>

      <button type="button" onClick={() => setGoalsOpen((value) => !value)} aria-expanded={goalsOpen} className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-2.5 text-left hover:bg-hover">
        <TargetIcon size={15} className="shrink-0 text-fg-3" />
        <span className="shrink-0 text-xs text-fg-2">{linkedGoals.length ? `${linkedGoals.length} ${linkedGoals.length === 1 ? "meta" : "metas"}` : "Vincular metas"}</span>
        {averageProgress !== null ? (
          <>
            <ProgressBar value={averageProgress} height={4} className="flex-1" label="Progresso médio das metas" />
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-fg-2">{averageProgress}%</span>
          </>
        ) : (
          <span className="flex-1" />
        )}
        <CaretDownIcon size={12} className={cx("shrink-0 text-fg-4 transition-transform", !goalsOpen && "-rotate-90")} />
      </button>

      {goalsOpen && (
        <div className="flex flex-col gap-2 border-t border-line-soft bg-canvas/40 px-4 py-3">
          {linkedGoals.length === 0 ? (
            <p className="text-[13px] text-fg-3">Um plano ganha forma com metas concretas. Vincule as que levam até ele.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {linkedGoals.map((goal) => {
                const percent = goal.status === "concluida" ? 100 : goal.progress_percent ?? 0;
                return (
                  <li key={goal.id} className="group flex items-center gap-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{goal.title}</span>
                    <ProgressBar value={percent} height={3} className="w-16 shrink-0" tone={percent >= 100 ? "success" : "gold"} />
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-fg-3">{percent}%</span>
                    <IconButton label={`Desvincular ${goal.title}`} variant="ghost" size="xs" onClick={() => unlinkGoal.mutate({ planId: plan.id, goalId: goal.id })}>
                      <XIcon />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
          {linkableGoals.length > 0 && (
            <select
              value=""
              aria-label="Vincular uma meta"
              onChange={(event) => {
                if (event.target.value) linkGoal.mutate({ planId: plan.id, goalId: event.target.value });
              }}
              data-size="sm"
              className="q-input"
            >
              <option value="">+ Vincular uma meta…</option>
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
        description="As metas vinculadas continuam existindo em Metas & Hábitos."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
