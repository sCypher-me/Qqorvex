import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingTermsReceipt,
  CURRENT_TERMS_VERSION,
  hasPendingTermsReceipt,
  PENDING_TERMS_ACCEPTANCE_KEY,
  PENDING_TERMS_ACCEPTANCE_TTL_MS,
  savePendingTermsReceipt,
} from "./terms";

function useSessionStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  vi.stubGlobal("window", { sessionStorage: storage });
  return { storage, values };
}

afterEach(() => vi.unstubAllGlobals());

describe("aceite dos Termos durante cadastro OAuth", () => {
  it("retoma apenas o aceite recente associado à conta recém-criada", () => {
    const { storage, values } = useSessionStorage();
    const startedAt = 1_800_000_000_000;
    storage.setItem("qqorvex.oauth.started_at", String(startedAt));
    savePendingTermsReceipt(startedAt);

    expect(JSON.parse(values.get(PENDING_TERMS_ACCEPTANCE_KEY) ?? "{}")).toEqual({
      version: CURRENT_TERMS_VERSION,
      expiresAt: startedAt + PENDING_TERMS_ACCEPTANCE_TTL_MS,
    });
    expect(hasPendingTermsReceipt(new Date(startedAt + 1_000).toISOString(), startedAt + 2_000)).toBe(true);
  });

  it("descarta aceite expirado ou de uma conta anterior", () => {
    const { storage, values } = useSessionStorage();
    const startedAt = 1_800_000_000_000;
    storage.setItem("qqorvex.oauth.started_at", String(startedAt));
    savePendingTermsReceipt(startedAt);

    expect(hasPendingTermsReceipt(new Date(startedAt + 1_000).toISOString(), startedAt + PENDING_TERMS_ACCEPTANCE_TTL_MS + 1)).toBe(false);
    expect(values.has(PENDING_TERMS_ACCEPTANCE_KEY)).toBe(false);

    savePendingTermsReceipt(startedAt);
    expect(hasPendingTermsReceipt(new Date(startedAt - 60 * 60_000).toISOString(), startedAt + 2_000)).toBe(false);
    expect(values.has(PENDING_TERMS_ACCEPTANCE_KEY)).toBe(false);
  });

  it("remove o recibo sem depender de armazenamento persistente", () => {
    const { storage, values } = useSessionStorage();
    savePendingTermsReceipt(1_800_000_000_000);
    clearPendingTermsReceipt();
    expect(storage.getItem(PENDING_TERMS_ACCEPTANCE_KEY)).toBeNull();
  });
});
