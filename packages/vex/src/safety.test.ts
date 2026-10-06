import { describe, expect, it } from "vitest";
import { checkQuerySafety } from "./safety";

describe("checkQuerySafety", () => {
  it.each([
    "quero pornografia",
    "buscar conteúdo erótico",
    "me mostre sexo explícito",
    "vídeos adultos",
    "quero p.o.r.n.o",
  ])("bloqueia intenção explícita de mídia adulta: %s", (query) => {
    expect(checkQuerySafety(query)).toMatchObject({ blocked: true });
  });

  it.each([
    "Faça um resumo sobre o órgão reprodutor masculino",
    "Explique a anatomia do sistema reprodutor humano",
    "Quais são os cuidados de saúde na puberdade?",
    "Como funciona a reprodução humana?",
  ])("permite um pedido educacional: %s", (query) => {
    expect(checkQuerySafety(query)).toEqual({ blocked: false });
  });
});
