/** Junta classes condicionais, ignorando valores falsos. */
export function cx(...values: unknown[]): string {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}
