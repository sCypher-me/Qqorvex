/** Gemini's generateContent function-declaration schema rejects JSON Schema's additionalProperties. */
export function toGeminiFunctionSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiFunctionSchema);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "additionalProperties")
      .map(([key, entry]) => [key, toGeminiFunctionSchema(entry)]),
  );
}
