export type RetryHistoryEntry =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; completedAction?: boolean }
  | { id: string; role: "action"; status: "done" | "cancelled" | "failed" };

/** Reaproveita o último pedido e descarta a resposta de fallback que não o resolveu. */
export function prepareVexRetryHistory<T extends RetryHistoryEntry>(messages: T[], retryMessageId: string): T[] | null {
  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserIndex = index;
      break;
    }
  }
  if (latestUserIndex < 0) return null;

  const lastRequest = messages[latestUserIndex];
  if (lastRequest?.role !== "user") return null;
  const repeatedRequest = { id: retryMessageId, role: "user", content: lastRequest.content } as T;
  return [...messages.slice(0, latestUserIndex), repeatedRequest];
}

/** Impede que "Tentar de novo" repita um pedido cuja ação confirmada já foi gravada. */
export function latestVexRequestHasCompletedAction(messages: RetryHistoryEntry[]): boolean {
  let latestUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      latestUserIndex = index;
      break;
    }
  }
  return latestUserIndex >= 0 && messages.slice(latestUserIndex + 1).some((message) =>
    (message.role === "action" && message.status === "done") || (message.role === "assistant" && message.completedAction === true),
  );
}
