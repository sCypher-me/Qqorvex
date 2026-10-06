import { describe, expect, it } from "vitest";
import { activeRoleLabels, parseDiscordConnection, parseDiscordLinkParam } from "./discordRoles";

describe("parseDiscordLinkParam", () => {
  it("reconhece os retornos do callback e o início pelo Discord", () => {
    expect(parseDiscordLinkParam("connected")).toBe("connected");
    expect(parseDiscordLinkParam("cancelled")).toBe("cancelled");
    expect(parseDiscordLinkParam("error")).toBe("error");
    expect(parseDiscordLinkParam("conectar")).toBe("start");
  });

  it("ignora valores desconhecidos", () => {
    expect(parseDiscordLinkParam(null)).toBeNull();
    expect(parseDiscordLinkParam("qualquer")).toBeNull();
  });
});

describe("parseDiscordConnection", () => {
  it("lê a conexão e trata cargos ausentes como desligados", () => {
    expect(parseDiscordConnection({ username: "vex", roles: { beta_tester: true }, synced_at: "2026-10-06T19:00:00Z" })).toEqual({
      username: "vex",
      roles: { beta_tester: true, plus: false, lifetime: false, parceiro: false },
      syncedAt: "2026-10-06T19:00:00Z",
    });
  });

  it("devolve null sem conexão ou com formato inesperado", () => {
    expect(parseDiscordConnection(null)).toBeNull();
    expect(parseDiscordConnection({ roles: {} })).toBeNull();
  });
});

describe("activeRoleLabels", () => {
  it("lista só os cargos ativos, na ordem de exibição", () => {
    expect(activeRoleLabels({ beta_tester: true, plus: false, lifetime: true, parceiro: false })).toEqual(["Beta Tester", "Amigo Lifetime"]);
  });
});
