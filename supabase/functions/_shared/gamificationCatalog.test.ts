import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAILY_CHALLENGE_CATALOG } from "../../../modules/pessoal/gamificacao/src/dailyChallenges";

// O XP de desafio é concedido no banco; o app só exibe. Os dois catálogos precisam ser idênticos.
describe("catálogo de desafios do dia", () => {
  it("tem o mesmo catálogo (chave, nível, ação, meta e XP) que o banco", () => {
    const dir = new URL("../../migrations/", import.meta.url);
    const file = readdirSync(dir).find((name: string) => name.endsWith("_gamification_rules.sql"));
    expect(file).toBeTruthy();
    const sql = readFileSync(new URL(file!, dir), "utf8");
    const block = sql.slice(sql.indexOf("gamification_challenge_catalog()"), sql.indexOf("create table public.user_daily_challenge_choices"));
    const fromSql = [...block.matchAll(/\('([a-z0-9-]+)', '([^']+)', '([a-z_]+)', (\d+), (\d+), \d+\)/g)].map((match) => ({
      key: match[1],
      difficulty: match[2],
      action: match[3],
      target: Number(match[4]),
      rewardXp: Number(match[5]),
    }));
    const fromApp = DAILY_CHALLENGE_CATALOG.map(({ key, difficulty, action, target, rewardXp }) => ({ key, difficulty, action, target, rewardXp }));
    expect(fromSql).toHaveLength(12);
    expect(fromApp).toEqual(expect.arrayContaining(fromSql));
    expect(fromSql).toEqual(expect.arrayContaining(fromApp));
  });
});
