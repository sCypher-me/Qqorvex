import { describe, expect, it } from "vitest";
import { normalizeVexStyle, VEX_STYLE_OPTIONS } from "./vexStyle";

describe("preferências de personalidade da Vex", () => {
  it("oferece três opções para onboarding e configurações", () => {
    expect(VEX_STYLE_OPTIONS.map((style) => style.value)).toEqual(["direct", "conversational", "encouraging"]);
  });

  it("mantém preferências existentes e normaliza valores desconhecidos", () => {
    expect(normalizeVexStyle("conversational")).toBe("conversational");
    expect(normalizeVexStyle("encouraging")).toBe("encouraging");
    expect(normalizeVexStyle("direct")).toBe("direct");
    expect(normalizeVexStyle("unexpected")).toBe("direct");
  });
});
