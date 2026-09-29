import { describe, expect, it } from "vitest";
import type { VexConversation } from "@qqorvex/vex";
import { groupConversations, titleFromPrompt } from "./helpers";

describe("titleFromPrompt", () => {
  it("usa a pergunta curta inteira, com inicial maiúscula", () => {
    expect(titleFromPrompt("  quanto gastei   com mercado?  ")).toBe("Quanto gastei com mercado?");
  });
  it("corta perguntas longas numa palavra inteira", () => {
    const title = titleFromPrompt("organize meu dia de hoje com horários realistas, considerando compromissos, prazos e hábitos");
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(57);
    expect(title).not.toMatch(/,…$/);
  });
});

describe("groupConversations", () => {
  const at = (title: string, iso: string) => ({ id: title, title, updated_at: iso }) as VexConversation;
  it("agrupa por data relativa, na ordem de mais recentes", () => {
    const now = new Date(2026, 8, 29, 20, 0);
    const groups = groupConversations(
      [at("a", new Date(2026, 8, 29, 9).toISOString()), at("b", new Date(2026, 8, 28, 23).toISOString()), at("c", new Date(2026, 8, 24).toISOString()), at("d", new Date(2026, 7, 10).toISOString())],
      now,
    );
    expect(groups.map((group) => [group.label, group.items.map((item) => item.title)])).toEqual([
      ["Hoje", ["a"]],
      ["Ontem", ["b"]],
      ["Últimos 7 dias", ["c"]],
      ["Mais antigas", ["d"]],
    ]);
  });
});
