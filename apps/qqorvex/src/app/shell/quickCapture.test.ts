import { describe, expect, it } from "vitest";
import { parseQuickCapture } from "./quickCapture";

// Sábado, 10/10/2026.
const today = "2026-10-10";
const parse = (text: string) => parseQuickCapture(text, today);

describe("captura rápida em linguagem natural", () => {
  it("frase comum continua sendo tarefa, com prazo, prioridade e duração", () => {
    expect(parse("Pagar luz amanhã !alta 15min")).toMatchObject({ kind: "task", title: "Pagar luz", date: "2026-10-11", priority: "alta", estimatedMinutes: 15 });
    expect(parse("Revisar contrato")).toMatchObject({ kind: "task", title: "Revisar contrato", date: undefined });
  });

  it("horário vira compromisso, com fim padrão de 1h ou intervalo escrito", () => {
    expect(parse("Dentista sexta às 15h")).toMatchObject({ kind: "event", title: "Dentista", date: "2026-10-16", start: "15:00", end: "16:00" });
    expect(parse("Reunião com a Carol amanhã das 14h às 15h30")).toMatchObject({ kind: "event", title: "Reunião com a Carol", date: "2026-10-11", start: "14:00", end: "15:30" });
    expect(parse("Call 9:30 30min")).toMatchObject({ kind: "event", title: "Call", date: today, start: "09:30", end: "10:00" });
    expect(parse("Almoço com a Bia ao meio-dia")).toMatchObject({ kind: "event", start: "12:00" });
  });

  it("duração não é confundida com horário", () => {
    expect(parse("Estudar 1h30")).toMatchObject({ kind: "task", estimatedMinutes: 90 });
  });

  it("gasto e recebimento viram transação com valor", () => {
    expect(parse("Gastei 40 no mercado")).toMatchObject({ kind: "expense", title: "Mercado", amount: 40, date: today });
    expect(parse("Paguei R$ 212,40 conta de luz ontem")).toMatchObject({ kind: "expense", title: "Conta de luz", amount: 212.4, date: "2026-10-09" });
    expect(parse("Recebi R$ 8.500 de salário")).toMatchObject({ kind: "income", title: "Salário", amount: 8500 });
    expect(parse("Despesa: farmácia 35,90")).toMatchObject({ kind: "expense", title: "Farmácia", amount: 35.9, explicit: true });
  });

  it("valor numa tarefa futura não vira despesa", () => {
    expect(parse("Pagar boleto R$ 300 sexta")).toMatchObject({ kind: "task", title: "Pagar boleto R$ 300", date: "2026-10-16", amount: 300 });
  });

  it("prefixos escolhem nota, ideia, lista e compromisso de dia inteiro", () => {
    expect(parse("Nota: pauta da reunião de amanhã")).toMatchObject({ kind: "note", title: "Pauta da reunião de amanhã", explicit: true });
    expect(parse("Ideia: app de receitas")).toMatchObject({ kind: "idea", title: "App de receitas" });
    expect(parse("ideia de presente para a Bia")).toMatchObject({ kind: "idea", title: "De presente para a Bia" });
    expect(parse("Compromisso: congresso sexta")).toMatchObject({ kind: "event", title: "Congresso", date: "2026-10-16", start: undefined });
    expect(parse("Tarefa: ligar às 15h para o banco")).toMatchObject({ kind: "task" });
  });

  it("o tipo escolhido na interface manda", () => {
    expect(parseQuickCapture("Dentista sexta às 15h", today, "task")).toMatchObject({ kind: "task", date: "2026-10-16" });
    expect(parseQuickCapture("Mercado 120", today, "expense")).toMatchObject({ kind: "expense", title: "Mercado", amount: 120 });
    expect(parseQuickCapture("Leitura do domingo", today, "event")).toMatchObject({ kind: "event", start: undefined });
  });

  it("lista de compras pelo prefixo ou pelo final da frase", () => {
    expect(parse("Leite na lista")).toMatchObject({ kind: "shopping", title: "Leite" });
    expect(parse("comprar pão na lista de compras")).toMatchObject({ kind: "shopping", title: "Pão" });
    expect(parse("Lista: detergente")).toMatchObject({ kind: "shopping", title: "Detergente" });
  });
});
