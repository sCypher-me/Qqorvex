import type { SupabaseClient, Database } from "@qqorvex/database";
import type { HojeItem } from "@qqorvex/module-hoje";
import { listGoals, listHabits } from "./repository";
import type { Habit, HabitFrequencyConfig } from "./types";

const WEEKDAY_CODES = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

/**
 * "Hábitos previstos para hoje" só é bem definido para frequências diárias ou de dias
 * específicos; frequências por cota semanal/mensal ficam de fora do Hoje por enquanto — decidir
 * "previsto hoje" ali exigiria inferir distribuição não especificada no Xmind.
 */
function isHabitDueToday(habit: Habit, today: Date): boolean {
  if (habit.status !== "ativo") return false;
  if (habit.frequency_type === "diaria") return true;
  if (habit.frequency_type === "dias_especificos") {
    const config = habit.frequency_config as HabitFrequencyConfig;
    const todayCode = WEEKDAY_CODES[today.getDay()] ?? "dom";
    return (config.days ?? []).includes(todayCode);
  }
  return false;
}

/**
 * "Hoje pode mostrar card compacto: meta em destaque, hábitos previstos para hoje, check-in
 * pendente, revisão semanal." v1 cobre meta com prazo próximo + hábitos previstos para hoje.
 * Hoje nunca calcula progresso próprio — só exibe o que este provider já resolveu.
 */
export function createGoalsHabitsHojeProvider(client: SupabaseClient<Database>) {
  return async function goalsHabitsHojeProvider(): Promise<HojeItem[]> {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const soonThreshold = new Date(today);
    soonThreshold.setDate(soonThreshold.getDate() + 7);
    const soonStr = soonThreshold.toISOString().slice(0, 10);

    const [goals, habits] = await Promise.all([listGoals(client), listHabits(client)]);

    const goalItems: HojeItem[] = goals
      .filter((goal) => goal.status === "ativa" && goal.due_date && goal.due_date <= soonStr)
      .map((goal) => ({
        id: goal.id,
        source: "metas-habitos",
        title: `Meta: ${goal.title}`,
        time: goal.due_date ?? undefined,
        priority: goal.due_date && goal.due_date <= todayStr ? ("atencao" as const) : undefined,
      }));

    const habitItems: HojeItem[] = habits
      .filter((habit) => isHabitDueToday(habit, today))
      .map((habit) => ({
        id: habit.id,
        source: "metas-habitos",
        title: `Hábito: ${habit.name}`,
      }));

    return [...goalItems, ...habitItems];
  };
}
