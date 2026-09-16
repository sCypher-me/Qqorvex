import { describe, expect, it } from "vitest";
import { computeProgressPercent, findDuplicateItem, normalizeTitle } from "./service";
import type { LibraryItem } from "./types";

function item(overrides: Partial<LibraryItem>): LibraryItem {
  return { progress_mode: "nenhum", progress_current: null, progress_total: null, ...overrides } as LibraryItem;
}

describe("computeProgressPercent", () => {
  it("modo percentual satura entre 0 e 100", () => {
    expect(computeProgressPercent(item({ progress_mode: "percentual", progress_current: 150 }))).toBe(100);
    expect(computeProgressPercent(item({ progress_mode: "percentual", progress_current: -10 }))).toBe(0);
    expect(computeProgressPercent(item({ progress_mode: "percentual", progress_current: 40 }))).toBe(40);
  });

  it("modo numérico calcula a partir de atual/total", () => {
    expect(computeProgressPercent(item({ progress_mode: "numerico", progress_current: 3, progress_total: 12 }))).toBe(25);
  });

  it("sem dado suficiente não inventa percentual — retorna null", () => {
    expect(computeProgressPercent(item({ progress_mode: "nenhum" }))).toBeNull();
    expect(computeProgressPercent(item({ progress_mode: "numerico", progress_current: null, progress_total: 12 }))).toBeNull();
    expect(computeProgressPercent(item({ progress_mode: "numerico", progress_current: 3, progress_total: 0 }))).toBeNull();
  });
});

describe("normalizeTitle", () => {
  it("baixa caixa e colapsa espaços, sem remover acentos", () => {
    expect(normalizeTitle("  O   Senhor  dos Anéis  ")).toBe("o senhor dos anéis");
  });
});

describe("findDuplicateItem", () => {
  it("acha duplicata por título normalizado + mesmo tipo", () => {
    const items = [item({ title: "Duna", item_type: "book" })];
    expect(findDuplicateItem(items, "  DUNA  ", "book")).toBe(items[0]);
  });

  it("mesmo título mas tipo diferente não é duplicata", () => {
    const items = [item({ title: "Duna", item_type: "book" })];
    expect(findDuplicateItem(items, "Duna", "movie")).toBeNull();
  });
});
