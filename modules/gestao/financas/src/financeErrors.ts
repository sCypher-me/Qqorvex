/** Mensagens seguras e legíveis para falhas nas ações financeiras. */
export function financeActionError(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return "Já existe um registro com esses dados. Confira a categoria e o período.";
  }
  return fallback;
}
