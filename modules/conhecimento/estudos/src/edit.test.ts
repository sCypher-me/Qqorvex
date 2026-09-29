import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { updateAssessment, updateErrorDoubt, updateTopic } from "./repository";

type Call = [string, ...unknown[]];

/**
 * Cliente falso: registra as chamadas por tabela e responde cada consulta com a próxima resposta
 * da fila daquela tabela (`responses.<tabela>`), na ordem em que as consultas acontecem.
 */
function fakeClient(responses: Record<string, unknown[]> = {}) {
  const calls: Call[] = [];
  function table(name: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "update", "eq", "single", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([`${name}.${method}`, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => void) => resolve({ data: responses[name]?.shift() ?? null, error: null });
    return builder;
  }
  const client = { from: table } as unknown as SupabaseClient<Database>;
  return { client, find: (name: string) => calls.filter((call) => call[0] === name) };
}

const agendaEvent = {
  id: "e1",
  title: "Avaliação: Prova 1",
  description: "Levar calculadora",
  location: "Sala 12",
  meeting_link: null,
  category: "prazo",
  is_all_day: true,
  start_at: "2026-10-10T00:00:00",
  end_at: "2026-10-10T23:59:59",
};

describe("updateTopic / updateErrorDoubt", () => {
  it("renomeia só o tópico pedido", async () => {
    const { client, find } = fakeClient({ topics: [{ id: "t1" }] });
    await updateTopic(client, "t1", "Cinemática");
    expect(find("topics.update")).toEqual([["topics.update", { title: "Cinemática" }]]);
    expect(find("topics.eq")).toContainEqual(["topics.eq", "id", "t1"]);
  });

  it("edita o texto da dúvida sem mexer em 'resolvida'", async () => {
    const { client, find } = fakeClient({ errors_doubts: [{ id: "d1" }] });
    await updateErrorDoubt(client, "d1", "Por que a aceleração é negativa?");
    expect(find("errors_doubts.update")).toEqual([["errors_doubts.update", { description: "Por que a aceleração é negativa?" }]]);
  });
});

describe("updateAssessment", () => {
  it("grava os campos e limpa os opcionais deixados em branco", async () => {
    const { client, find } = fakeClient({
      assessments: [{ name: "Prova 1", assessment_date: null }, { id: "a1", name: "Prova 1", assessment_date: null }],
    });
    await updateAssessment(client, "a1", { name: "Prova 1" });
    expect(find("assessments.update")).toEqual([["assessments.update", { name: "Prova 1", assessment_date: null, expected_content: null }]]);
  });

  it("move o evento da Agenda para a nova data e atualiza o título automático, preservando o resto", async () => {
    const { client, find } = fakeClient({
      assessments: [{ name: "Prova 1", assessment_date: "2026-10-10" }, { id: "a1", name: "Prova 1 de Física", assessment_date: "2026-10-12" }],
      events: [[agendaEvent], { ...agendaEvent }],
    });
    await updateAssessment(client, "a1", { name: "Prova 1 de Física", assessmentDate: "2026-10-12" });
    expect(find("events.update")).toEqual([
      [
        "events.update",
        {
          title: "Avaliação: Prova 1 de Física",
          description: "Levar calculadora",
          location: "Sala 12",
          meeting_link: null,
          category: "prazo",
          is_all_day: true,
          start_at: "2026-10-12T00:00:00",
          end_at: "2026-10-12T23:59:59",
        },
      ],
    ]);
  });

  it("mantém um título que a pessoa mudou na Agenda", async () => {
    const custom = { ...agendaEvent, title: "Prova de Física — estudar cap. 3" };
    const { client, find } = fakeClient({
      assessments: [{ name: "Prova 1", assessment_date: "2026-10-10" }, { id: "a1", name: "Prova 1 de Física", assessment_date: "2026-10-12" }],
      events: [[custom], { ...custom }],
    });
    await updateAssessment(client, "a1", { name: "Prova 1 de Física", assessmentDate: "2026-10-12" });
    expect(find("events.update")[0]?.[1]).toMatchObject({ title: "Prova de Física — estudar cap. 3", start_at: "2026-10-12T00:00:00" });
  });

  it("não toca no evento quando nome e data não mudaram", async () => {
    const { client, find } = fakeClient({
      assessments: [{ name: "Prova 1", assessment_date: "2026-10-10" }, { id: "a1", name: "Prova 1", assessment_date: "2026-10-10" }],
      events: [[agendaEvent]],
    });
    await updateAssessment(client, "a1", { name: "Prova 1", assessmentDate: "2026-10-10", expectedContent: "Cap. 1 a 3" });
    expect(find("events.select")).toEqual([]);
    expect(find("events.update")).toEqual([]);
  });

  it("sem data, o evento existente fica como está", async () => {
    const { client, find } = fakeClient({
      assessments: [{ name: "Prova 1", assessment_date: "2026-10-10" }, { id: "a1", name: "Prova 1", assessment_date: null }],
      events: [[agendaEvent]],
    });
    await updateAssessment(client, "a1", { name: "Prova 1" });
    expect(find("events.update")).toEqual([]);
  });
});
