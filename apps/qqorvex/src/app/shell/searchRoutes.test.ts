import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@qqorvex/database";
import { searchResultMeta, searchResultRoute } from "./searchRoutes";

function result(partial: Partial<SearchResult> & Pick<SearchResult, "kind">): SearchResult {
  return { id: "id-1", title: "T", snippet: null, parentId: null, sortDate: null, ...partial };
}

describe("searchResultRoute", () => {
  beforeEach(() => vi.stubEnv("TZ", "America/Sao_Paulo"));
  afterEach(() => vi.unstubAllEnvs());

  it("evento abre a Agenda no dia local, não no dia em UTC", () => {
    // 29/09 às 22h em Brasília = 30/09 01h em UTC.
    expect(searchResultRoute(result({ kind: "evento", sortDate: "2026-09-30T01:00:00Z" }))).toBe("/planejar/agenda?data=2026-09-29");
  });

  it("resumo e flashcard abrem o caderno de origem", () => {
    expect(searchResultRoute(result({ kind: "resumo", parentId: "nb-1" }))).toBe("/conhecimento/estudos/nb-1");
    expect(searchResultRoute(result({ kind: "flashcard", parentId: "nb-1" }))).toBe("/conhecimento/estudos/nb-1?aba=cartoes");
  });

  it("itens com página própria usam o próprio id", () => {
    expect(searchResultRoute(result({ kind: "nota" }))).toBe("/conhecimento/notas/id-1");
    expect(searchResultRoute(result({ kind: "tarefa" }))).toBe("/planejar/tarefas?tarefa=id-1");
    expect(searchResultRoute(result({ kind: "biblioteca" }))).toBe("/conhecimento/biblioteca?item=id-1");
  });
});

describe("searchResultMeta", () => {
  it("trecho do conteúdo vai para a segunda linha", () => {
    expect(searchResultMeta(result({ kind: "nota", snippet: "…reunião com o time…" }))).toEqual({ detail: "…reunião com o time…", hint: undefined });
  });

  it("evento mostra a data à direita; os demais não mostram nada", () => {
    expect(searchResultMeta(result({ kind: "evento", sortDate: "2026-10-02T13:00:00Z" })).hint).toMatch(/02/);
    expect(searchResultMeta(result({ kind: "meta" }))).toEqual({ detail: undefined, hint: undefined });
  });
});
