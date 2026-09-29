import { describe, expect, it } from "vitest";
import { markdownToPlainText, parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("reconhece negrito, itálico, código e links http", () => {
    expect(parseInline("**9h** reunião *leve* com `pauta` em [site](https://q.app)")).toEqual([
      { t: "strong", c: [{ t: "text", v: "9h" }] },
      { t: "text", v: " reunião " },
      { t: "em", c: [{ t: "text", v: "leve" }] },
      { t: "text", v: " com " },
      { t: "code", v: "pauta" },
      { t: "text", v: " em " },
      { t: "link", href: "https://q.app", c: [{ t: "text", v: "site" }] },
    ]);
  });

  it("não cria link para esquemas perigosos nem itálico no meio de palavras", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ t: "text", v: "[x](javascript:alert(1))" }]);
    expect(parseInline("snake_case_name")).toEqual([{ t: "text", v: "snake_case_name" }]);
    expect(parseInline("2 * 3 * 4")).toEqual([{ t: "text", v: "2 * 3 * 4" }]);
  });
});

describe("parseMarkdown", () => {
  it("separa títulos, parágrafos com quebra de linha e listas", () => {
    const blocks = parseMarkdown("### Seu dia\nBom dia!\nVamos lá.\n\n- Correr\n- Estudar");
    expect(blocks.map((block) => block.t)).toEqual(["h", "p", "ul"]);
    expect(blocks[1]).toEqual({ t: "p", c: [{ t: "text", v: "Bom dia!" }, { t: "br" }, { t: "text", v: "Vamos lá." }] });
  });

  it("aninha sub-listas e mantém listas numeradas separadas por linha em branco", () => {
    const [list] = parseMarkdown("1. **Manhã**\n   - Correr\n   - Café\n\n2. **Tarde**\n   - Reunião");
    expect(list?.t).toBe("ol");
    if (list?.t !== "ol") return;
    expect(list.items).toHaveLength(2);
    expect(list.items[0]!.children).toMatchObject({ t: "ul", items: [{ c: [{ t: "text", v: "Correr" }] }, { c: [{ t: "text", v: "Café" }] }] });
    expect(list.items[1]!.children).toMatchObject({ t: "ul", items: [{ c: [{ t: "text", v: "Reunião" }] }] });
  });

  it("lê tabelas, citações, separadores e código", () => {
    const blocks = parseMarkdown("| Hora | O quê |\n|---|---|\n| 9h | Treino |\n\n> lembrete\n\n---\n\n```\nconst a = 1;\n```");
    expect(blocks.map((block) => block.t)).toEqual(["table", "quote", "hr", "pre"]);
    expect(blocks[0]).toMatchObject({ t: "table", rows: [[[{ t: "text", v: "9h" }], [{ t: "text", v: "Treino" }]]] });
    expect(blocks[3]).toEqual({ t: "pre", v: "const a = 1;" });
  });

  it("não confunde negrito no início da linha com item de lista", () => {
    expect(parseMarkdown("**Resumo:** tudo certo")[0]?.t).toBe("p");
  });
});

describe("markdownToPlainText", () => {
  it("remove a marcação mantendo o conteúdo", () => {
    expect(markdownToPlainText("### Plano\n**9h** treino e [site](https://q.app)")).toBe("Plano\n9h treino e site (https://q.app)");
  });
});
