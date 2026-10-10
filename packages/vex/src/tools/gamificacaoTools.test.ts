import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { createGamificacaoTools } from "./gamificacaoTools";

function fakeClient(rpc: (name: string, args?: Record<string, unknown>) => unknown) {
  return { rpc: vi.fn(async (name: string, args?: Record<string, unknown>) => rpc(name, args)) } as unknown as SupabaseClient<Database>;
}

const tool = (client: SupabaseClient<Database>, name: string) => createGamificacaoTools(client, "user-1").find((item) => item.name === name)!;

describe("desafios do dia na Vex", () => {
  it("lista os desafios reais da pessoa com a posição para poder trocar", async () => {
    const client = fakeClient(() => ({
      data: [
        { slot: 0, challenge_key: "task-1", progress: 1, completed_at: "2026-10-10T12:00:00Z", swaps: 0 },
        { slot: 1, challenge_key: "checkin-1", progress: 0, completed_at: null, swaps: 1 },
      ],
      error: null,
    }));
    const result = await tool(client, "list_daily_challenges").execute({});
    expect(result.summary).toContain("[posição 0 · fácil] Concluir 1 tarefa — concluído");
    expect(result.summary).toContain("[posição 1 · fácil] Fazer 1 check-in de hábito — 0/1");
  });

  it("troca só com confirmação e diz qual desafio entrou", async () => {
    const client = fakeClient((name) => (name === "swap_my_daily_challenge" ? { data: "library-1", error: null } : { data: null, error: null }));
    const swap = tool(client, "swap_daily_challenge");
    expect(swap.requiresConfirmation).toBe(true);
    expect(swap.preview?.({ slot: 2 }).fields[0]?.value).toBe("Posição 2 (médio)");
    const result = await swap.execute({ slot: 1 });
    expect(result.summary).toContain("Concluir 1 item da Biblioteca");
  });

  it("não afirma que trocou quando o servidor recusa (ex.: desafio já concluído)", async () => {
    const client = fakeClient(() => ({ data: null, error: new Error("Este desafio já foi concluído hoje.") }));
    const result = await tool(client, "swap_daily_challenge").execute({ slot: 0 });
    expect(result.ok).toBe(false);
    expect(result.summary).toContain("já foi concluído");
    const invalid = await tool(client, "swap_daily_challenge").execute({ slot: 7 });
    expect(invalid.ok).toBe(false);
  });
});
