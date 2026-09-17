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
    <div className="qv-card p-5 flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="font-display text-[17px] font-semibold flex-1">De onde vem seu XP</span>
        <span className="font-mono text-xs text-text-muted">{formatXp(stats.xp)} XP total</span>
      </div>
      <div className="flex flex-col">
        {ACTIONS.map((action) => {
          const count = stats[GAMIFICATION_COUNTER_FIELD[action]];
          const earned = count * XP_BY_ACTION[action];
          const share = stats.xp > 0 ? Math.round((earned / stats.xp) * 100) : 0;
          return (
            <div key={action} className="qv-row-top flex flex-col gap-2 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex-1 min-w-0 text-sm font-medium">{ACTION_LABEL[action]}</span>
                <span className="font-mono text-xs whitespace-nowrap text-vex-gold-bright">+{XP_BY_ACTION[action]} XP cada</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="qv-progress flex-1" style={{ height: 5 }}>
                  <span style={{ width: `${share}%` }} />
                </div>
                <span className="font-mono text-[11px] text-text-muted whitespace-nowrap">
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
