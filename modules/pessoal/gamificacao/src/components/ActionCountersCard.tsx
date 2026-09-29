import { ProgressBar } from "@qqorvex/ui";
import { XP_BY_ACTION } from "../service";
import type { GamificationAction, GamificationStats } from "../types";
import { GAMIFICATION_COUNTER_FIELD } from "../types";
import { formatXp } from "./GamificationWidget";

export const ACTION_LABEL: Record<GamificationAction, string> = {
  task_completed: "Tarefas concluídas",
  habit_or_goal_checkin: "Check-ins de hábito ou meta",
  quiz_completed: "Quizzes respondidos",
  library_item_completed: "Itens concluídos na Biblioteca",
};

const ACTIONS = Object.keys(XP_BY_ACTION) as GamificationAction[];

/**
 * De onde vem o XP — um contador real por ação de `gamification_stats`, no estilo das linhas de
 * missão do design. Não há metas diárias/semanais nos dados: a barra mostra a fatia do XP total
 * que veio de cada ação (contador × XP por ação).
 */
export function ActionCountersCard({ stats }: { stats: GamificationStats }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <h3 className="flex-1 text-[14.5px] font-semibold text-fg">De onde vem seu XP</h3>
        <span className="text-xs tabular-nums text-fg-3">{formatXp(stats.xp)} XP total</span>
      </div>
      <div className="flex flex-col">
        {ACTIONS.map((action) => {
          const count = stats[GAMIFICATION_COUNTER_FIELD[action]];
          const earned = count * XP_BY_ACTION[action];
          const share = stats.xp > 0 ? Math.round((earned / stats.xp) * 100) : 0;
          return (
            <div key={action} className="border-t border-line-soft flex flex-col gap-2 py-3">
              <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 text-[13.5px] font-medium text-fg">{ACTION_LABEL[action]}</span>
                <span className="whitespace-nowrap text-xs tabular-nums text-gold-fg">+{XP_BY_ACTION[action]} XP cada</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ProgressBar value={share} height={5} className="flex-1" label={`Parte do XP vinda de ${ACTION_LABEL[action]}`} />
                <span className="whitespace-nowrap text-[11px] tabular-nums text-fg-3">
                  {formatXp(count)} · {formatXp(earned)} XP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
