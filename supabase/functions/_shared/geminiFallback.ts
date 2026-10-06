const RETRYABLE_STATUSES = new Set([400, 404, 429, 500, 502, 503, 504]);

/**
 * Try the requested Gemini model and then distinct fallbacks. A timeout/network failure is
 * represented by `null`, which should advance to the next model just like a retryable HTTP error.
 */
export async function requestModelWithFallbacks(
  models: readonly string[],
  request: (model: string) => Promise<Response | null>,
  onFallback?: (failedModel: string, nextModel: string, status: number | null) => void,
): Promise<Response | null> {
  const candidates = [...new Set(models)];
  let response: Response | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const model = candidates[index]!;
    response = await request(model);

    if (response?.ok || (response && !RETRYABLE_STATUSES.has(response.status))) return response;

    const nextModel = candidates[index + 1];
    if (!nextModel) return response;
    onFallback?.(model, nextModel, response?.status ?? null);
  }

  return response;
}
