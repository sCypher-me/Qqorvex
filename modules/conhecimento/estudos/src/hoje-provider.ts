import type { SupabaseClient, Database } from "@qqorvex/database";
import { localDateKey, localDateKeyInDays, type HojeItem } from "@qqorvex/module-hoje";
import { listDueFlashcards, listUpcomingAssessments } from "./repository";

/**
 * "Hoje pode mostrar flashcards/revisões, próxima avaliação... Não mostra todos os Cadernos
 * nem mantém progresso próprio." v1: contagem de flashcards vencidos + avaliações nos próximos
 * 7 dias, sem detalhar caderno por caderno (isso fica para a tela de Estudos).
 */
export function createEstudosHojeProvider(client: SupabaseClient<Database>) {
  return async function estudosHojeProvider(): Promise<HojeItem[]> {
    const todayStr = localDateKey();
    const soonStr = localDateKeyInDays(7);

    const [dueFlashcards, upcomingAssessments] = await Promise.all([
      listDueFlashcards(client, todayStr),
      listUpcomingAssessments(client, todayStr, soonStr),
    ]);

    const items: HojeItem[] = [];

    if (dueFlashcards.length > 0) {
      items.push({
        id: "estudos-flashcards-devidos",
        source: "estudos",
        title: `${dueFlashcards.length} flashcard(s) para revisar`,
      });
    }

    for (const assessment of upcomingAssessments) {
      items.push({
        id: assessment.id,
        source: "estudos",
        title: `Avaliação: ${assessment.name}`,
        time: assessment.assessment_date ?? undefined,
        priority: assessment.assessment_date === todayStr ? ("atencao" as const) : undefined,
      });
    }

    return items;
  };
}
