import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { createPerfilTools } from "./perfilTools";

function fakeClient(preferences: Record<string, unknown> | undefined, updateError: string | null = null) {
  const updateUser = vi.fn(async () => ({ data: {}, error: updateError ? { message: updateError } : null }));
  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { user_metadata: { qqorvex_preferences: preferences } } }, error: null })),
      updateUser,
    },
  } as unknown as SupabaseClient<Database>;
  return { client, updateUser };
}

const setStyle = (client: SupabaseClient<Database>) => createPerfilTools(client, "user-1").find((tool) => tool.name === "set_vex_style")!;

describe("set_vex_style", () => {
  it("só troca a personalidade depois da confirmação e mostra o nome em português no cartão", () => {
    const tool = setStyle(fakeClient({}).client);
    expect(tool.requiresConfirmation).toBe(true);
    expect(tool.preview?.({ style: "encouraging" })).toMatchObject({
      title: "Mudar a personalidade da Vex",
      fields: [{ label: "Nova personalidade", value: "Mentora estratégica" }],
    });
  });

  it("grava a nova personalidade sem apagar as outras preferências da conta", async () => {
    const { client, updateUser } = fakeClient({ theme: "light", skin: "aurora", vex_style: "direct" });
    const result = await setStyle(client).execute({ style: "conversational" });
    expect(updateUser).toHaveBeenCalledWith({ data: { qqorvex_preferences: { theme: "light", skin: "aurora", vex_style: "conversational" } } });
    expect(result.ok).not.toBe(false);
    expect(result.summary).toContain("Calorosa e conversadora");
  });

  it("recusa valores fora da lista sem tocar nas preferências", async () => {
    const { client, updateUser } = fakeClient({});
    const result = await setStyle(client).execute({ style: "sarcastica" });
    expect(updateUser).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it("não afirma que trocou quando o Supabase recusa a gravação", async () => {
    const { client } = fakeClient({}, "rede indisponível");
    const result = await setStyle(client).execute({ style: "direct" });
    expect(result.ok).toBe(false);
    expect(result.summary).toContain("Não consegui salvar");
  });
});
