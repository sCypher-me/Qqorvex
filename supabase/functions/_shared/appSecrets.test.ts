import { describe, expect, it } from "vitest";
import { AppSecretsUnavailableError, withSecretRetry } from "./appSecrets";

const noWait = async () => undefined;

describe("withSecretRetry", () => {
  it("recupera de um 401 transitório na primeira leitura", async () => {
    const responses = [
      { data: null, error: { code: "401", message: "Invalid API key" } },
      { data: [{ key: "cron_secret", value: "s3cr3t" }], error: null },
    ];
    let calls = 0;
    const rows = await withSecretRetry(async () => responses[calls++]!, noWait);
    expect(rows).toEqual([{ key: "cron_secret", value: "s3cr3t" }]);
    expect(calls).toBe(2);
  });

  it("desiste depois de três falhas e informa indisponibilidade, não segredo errado", async () => {
    let calls = 0;
    await expect(
      withSecretRetry(async () => {
        calls += 1;
        return { data: null, error: { message: "fetch failed" } };
      }, noWait),
    ).rejects.toBeInstanceOf(AppSecretsUnavailableError);
    expect(calls).toBe(3);
  });

  it("trata ausência de linhas como lista vazia, sem nova tentativa", async () => {
    let calls = 0;
    const rows = await withSecretRetry(async () => {
      calls += 1;
      return { data: null, error: null };
    }, noWait);
    expect(rows).toEqual([]);
    expect(calls).toBe(1);
  });
});
