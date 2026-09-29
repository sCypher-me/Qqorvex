import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import {
  updateAsset,
  updateIdea,
  updateImportantPurchase,
  updatePlan,
  updateProject,
  updateUsefulContact,
  updateVehicle,
} from "./repository";
import {
  toAssetUpdate,
  toIdeaUpdate,
  toImportantPurchaseUpdate,
  toPlanUpdate,
  toProjectUpdate,
  toUsefulContactUpdate,
  toVehicleUpdate,
} from "./types";

/** Cliente falso que registra a cadeia de chamadas montada pela consulta. */
function recordingClient() {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "eq", "select", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: { id: "x" }, error: null });
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("mapeamentos de edição", () => {
  it("nunca incluem o dono do registro", () => {
    const updates = [
      toPlanUpdate({ title: "Ser designer", planType: "anual", periodStart: "2027-01-01", periodEnd: "2027-12-31" }),
      toProjectUpdate({ title: "Reforma" }),
      toIdeaUpdate({ title: "App de receitas" }),
      toUsefulContactUpdate({ name: "Ana" }),
      toVehicleUpdate({ nickname: "Onix" }),
      toAssetUpdate({ name: "Notebook" }),
      toImportantPurchaseUpdate({ title: "Cadeira", priority: "alta" }),
    ];
    for (const update of updates) expect(update).not.toHaveProperty("user_id");
  });

  it("opcionais em branco viram null para limpar o campo", () => {
    expect(toProjectUpdate({ title: "Reforma" })).toEqual({ title: "Reforma", description: null });
    expect(toVehicleUpdate({ nickname: "Onix", year: 2020 })).toEqual({ nickname: "Onix", plate: null, brand: null, model: null, year: 2020 });
    expect(toAssetUpdate({ name: "TV", estimatedValue: 3000 })).toEqual({ name: "TV", category: null, estimated_value: 3000, location: null, warranty_id: null });
  });

  it("plano troca tipo e período juntos", () => {
    expect(toPlanUpdate({ title: "Correr", description: "5 km", planType: "mensal", periodStart: "2026-10-01", periodEnd: "2026-10-31" })).toEqual({
      title: "Correr",
      description: "5 km",
      plan_type: "mensal",
      period_start: "2026-10-01",
      period_end: "2026-10-31",
    });
  });

  it("contato não mexe na observação, que não aparece no formulário", () => {
    const update = toUsefulContactUpdate({ name: "Ana", category: "dentista", phone: "11 9999-0000" });
    expect(update).toEqual({ name: "Ana", category: "dentista", phone: "11 9999-0000" });
    expect(update).not.toHaveProperty("note");
  });

  it("compra mantém a prioridade escolhida e não mexe em 'comprado'", () => {
    const update = toImportantPurchaseUpdate({ title: "Cadeira", estimatedPrice: 900, priority: "baixa" });
    expect(update).toEqual({ title: "Cadeira", estimated_price: 900, priority: "baixa" });
    expect(update).not.toHaveProperty("is_purchased");
  });

  it("plano e projeto não mexem no status (tem fluxo próprio)", () => {
    expect(toProjectUpdate({ title: "Reforma" })).not.toHaveProperty("status");
    expect(toPlanUpdate({ title: "X", planType: "anual", periodStart: "2027-01-01", periodEnd: "2027-12-31" })).not.toHaveProperty("status");
  });
});

describe("funções de edição no repositório", () => {
  const cases = [
    { name: "updatePlan", table: "plans", run: (c: SupabaseClient<Database>) => updatePlan(c, "id-1", { title: "P", planType: "anual", periodStart: "2027-01-01", periodEnd: "2027-12-31" }), expected: toPlanUpdate({ title: "P", planType: "anual", periodStart: "2027-01-01", periodEnd: "2027-12-31" }) },
    { name: "updateProject", table: "projects", run: (c: SupabaseClient<Database>) => updateProject(c, "id-1", { title: "Pr" }), expected: toProjectUpdate({ title: "Pr" }) },
    { name: "updateIdea", table: "ideas", run: (c: SupabaseClient<Database>) => updateIdea(c, "id-1", { title: "I" }), expected: toIdeaUpdate({ title: "I" }) },
    { name: "updateUsefulContact", table: "useful_contacts", run: (c: SupabaseClient<Database>) => updateUsefulContact(c, "id-1", { name: "C" }), expected: toUsefulContactUpdate({ name: "C" }) },
    { name: "updateVehicle", table: "vehicles", run: (c: SupabaseClient<Database>) => updateVehicle(c, "id-1", { nickname: "V" }), expected: toVehicleUpdate({ nickname: "V" }) },
    { name: "updateAsset", table: "assets", run: (c: SupabaseClient<Database>) => updateAsset(c, "id-1", { name: "A" }), expected: toAssetUpdate({ name: "A" }) },
    { name: "updateImportantPurchase", table: "important_purchases", run: (c: SupabaseClient<Database>) => updateImportantPurchase(c, "id-1", { title: "Co", priority: "media" }), expected: toImportantPurchaseUpdate({ title: "Co", priority: "media" }) },
  ];

  for (const { name, table, run, expected } of cases) {
    it(`${name} atualiza a linha certa em ${table}`, async () => {
      const { client, calls } = recordingClient();
      await run(client);
      expect(calls).toContainEqual(["from", table]);
      expect(calls).toContainEqual(["update", expected]);
      expect(calls).toContainEqual(["eq", "id", "id-1"]);
    });
  }
});
