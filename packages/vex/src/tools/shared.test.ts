import { describe, expect, it } from "vitest";
import vexChatSource from "../../../../supabase/functions/vex-chat/index.ts?raw";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { EchoProvider } from "../providers/EchoProvider";
import { createVexTools } from "./createVexTools";
import { addDays, formatDateKey, isDateKey, isTime, localDateKey, matchByName } from "./shared";

describe("datas locais", () => {
  it("usa a data local, não UTC", () => {
    expect(localDateKey(new Date(2026, 8, 29, 23, 30))).toBe("2026-09-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(formatDateKey("2026-09-30", "2026-09-29")).toBe("amanhã");
  });

  it("valida datas e horários", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("9:05")).toBe(true);
  });
});

describe("matchByName", () => {
  const items = ["Pagar aluguel", "Pagar internet", "Correr", "Correr 5 km"];
  it("prefere o nome exato, ignorando acentos e caixa", () => {
    expect(matchByName(items, "correr", (item) => item)).toEqual({ kind: "one", item: "Correr" });
  });
  it("não adivinha quando há mais de um candidato", () => {
    expect(matchByName(items, "pagar", (item) => item)).toEqual({ kind: "many", items: ["Pagar aluguel", "Pagar internet"] });
    expect(matchByName(items, "ALUGUÉL", (item) => item)).toEqual({ kind: "one", item: "Pagar aluguel" });
    expect(matchByName(items, "nadar", (item) => item)).toEqual({ kind: "none" });
  });
});

describe("registro de ferramentas", () => {
  const tools = createVexTools({} as SupabaseClient<Database>, "u1", new EchoProvider());

  it("toda ferramenta é conhecida pela função vex-chat", () => {
    const source = vexChatSource;
    const block = source.slice(source.indexOf("ALLOWED_TOOL_NAMES"), source.indexOf("]);", source.indexOf("ALLOWED_TOOL_NAMES")));
    const allowed = new Set([...block.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]));
    expect(tools.map((tool) => tool.name).filter((name) => !allowed.has(name))).toEqual([]);
  });

  it("nomes são únicos, têm rótulo e cabem no limite do servidor", () => {
    const names = tools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(tools.every((tool) => Boolean(tool.label))).toBe(true);
    expect(tools.length).toBeLessThanOrEqual(64);
  });
});
