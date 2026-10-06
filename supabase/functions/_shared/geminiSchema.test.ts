import { describe, expect, it } from "vitest";
import { toGeminiFunctionSchema } from "./geminiSchema";

describe("toGeminiFunctionSchema", () => {
  it("removes unsupported additionalProperties at every object depth and preserves validation fields", () => {
    const parameters = {
      type: "object",
      additionalProperties: false,
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: { front: { type: "string" }, back: { type: "string" } },
            required: ["front", "back"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
    };

    expect(toGeminiFunctionSchema(parameters)).toEqual({
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: { front: { type: "string" }, back: { type: "string" } },
            required: ["front", "back"],
          },
        },
      },
      required: ["cards"],
    });
  });
});
