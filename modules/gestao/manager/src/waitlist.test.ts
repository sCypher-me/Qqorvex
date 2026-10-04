import { describe, expect, it } from "vitest";
import { waitlistToCsv } from "./repository";

describe("waitlistToCsv", () => {
  it("gera cabeçalho e uma linha por inscrição, com convidado em branco quando pendente", () => {
    expect(
      waitlistToCsv([
        { email: "ana@exemplo.com", source: "site", created_at: "2026-10-03T12:00:00Z", invited_at: null, rejected_at: null },
        { email: "bia@exemplo.com", source: "site", created_at: "2026-10-02T12:00:00Z", invited_at: "2026-10-03T13:00:00Z", rejected_at: null },
      ]),
    ).toBe("email,origem,inscrito_em,convidado_em,recusado_em\nana@exemplo.com,site,2026-10-03T12:00:00Z,,\nbia@exemplo.com,site,2026-10-02T12:00:00Z,2026-10-03T13:00:00Z,");
  });

  it("protege valores com vírgula ou aspas (planilhas não quebram as colunas)", () => {
    expect(waitlistToCsv([{ email: 'x"y@a.com', source: "a,b", created_at: "t", invited_at: null, rejected_at: "2026-10-03T13:00:00Z" }]).split("\n")[1]).toBe('"x""y@a.com","a,b",t,,2026-10-03T13:00:00Z');
  });
});
