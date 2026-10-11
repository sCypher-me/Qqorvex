import { describe, expect, it } from "vitest";
import { estimateTaskMinutes, parseDurationText, planEstimateFor } from "./taskEstimate";

const history = (rows: Array<[string, number | null]>) => rows.map(([title, estimated_minutes], index) => ({ id: `h${index}`, title, estimated_minutes }));

describe("duração escrita no texto", () => {
  it("entende minutos, horas, horas e minutos e expressões comuns", () => {
    expect(parseDurationText("Revisar contrato 45min")).toBe(45);
    expect(parseDurationText("Treino de 40 minutos")).toBe(40);
    expect(parseDurationText("Estudar 1h30")).toBe(90);
    expect(parseDurationText("Estudar 2 horas")).toBe(120);
    expect(parseDurationText("Leitura 1,5 hora")).toBe(90);
    expect(parseDurationText("Meditar meia hora")).toBe(30);
  });

  it("não confunde horário do dia com duração", () => {
    expect(parseDurationText("Reunião às 14h")).toBeNull();
    expect(parseDurationText("Dentista das 9h30")).toBeNull();
    expect(parseDurationText("Ligar até as 18h")).toBeNull();
    expect(parseDurationText("Reunião 14h")).toBeNull();
    expect(parseDurationText("Pagar 3 boletos")).toBeNull();
  });
});

describe("estimativa de duração", () => {
  it("usa a duração escrita com confiança alta", () => {
    expect(estimateTaskMinutes({ id: "t", title: "Revisar proposta", description: "leva uns 20 min" }, [])).toMatchObject({ minutes: 20, confidence: "alta", source: "texto" });
  });

  it("aprende com tarefas parecidas que a pessoa já estimou (as correções dela)", () => {
    const past = history([["Revisar contrato da Aurora", 45], ["Revisar contrato da Bia", 60], ["Comprar pão", 10]]);
    const estimate = estimateTaskMinutes({ id: "novo", title: "Revisar contrato do João" }, past);
    expect(estimate).toMatchObject({ source: "parecida", confidence: "media", minutes: 55 });
    expect(estimate.basis).toMatch(/Revisar contrato/);
    expect(estimateTaskMinutes({ id: "novo", title: "Revisar contrato da Aurora" }, past)).toMatchObject({ minutes: 45, confidence: "alta" });
  });

  it("não usa a própria tarefa como referência", () => {
    const past = history([["Relatório mensal", 120]]);
    expect(estimateTaskMinutes({ id: "h0", title: "Relatório mensal" }, past).source).not.toBe("parecida");
  });

  it("estima pelo tipo quando não há histórico parecido", () => {
    expect(estimateTaskMinutes({ id: "t", title: "Pagar conta de luz" }, [])).toMatchObject({ minutes: 15, source: "tipo" });
    expect(estimateTaskMinutes({ id: "t", title: "Ler 20 páginas" }, [])).toMatchObject({ minutes: 45, source: "tipo" });
    expect(estimateTaskMinutes({ id: "t", title: "Estudar capítulo 4" }, [])).toMatchObject({ minutes: 90, source: "tipo" });
    // Sinais misturados não arriscam pelo tipo.
    expect(estimateTaskMinutes({ id: "t", title: "Pagar e revisar" }, []).source).toBe("padrao");
  });

  it("cai na mediana pessoal com confiança baixa quando não há pista", () => {
    const past = history([["Algo", 20], ["Outra coisa", 40], ["Mais uma", 60]]);
    expect(estimateTaskMinutes({ id: "t", title: "Assunto do Zé" }, past)).toMatchObject({ minutes: 40, confidence: "baixa", source: "padrao" });
  });

  it("não estima o que já tem duração salva", () => {
    expect(planEstimateFor({ id: "t", title: "Pagar luz", estimated_minutes: 25 }, [])).toBeNull();
    expect(planEstimateFor({ id: "t", title: "Pagar luz", estimated_minutes: null }, [])).toEqual({ minutes: 15, confidence: "media", note: "pelo tipo de tarefa" });
  });
});
