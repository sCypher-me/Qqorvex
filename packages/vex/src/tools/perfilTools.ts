import type { SupabaseClient, Database } from "@qqorvex/database";
import { getProfile, isBRPhoneValid, normalizeBRPhone, updateProfile } from "@qqorvex/auth";
import type { ToolDefinition } from "../types";

type Client = SupabaseClient<Database>;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export function createPerfilTools(client: Client, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_profile_summary",
      description: "Consulta os dados públicos do perfil do usuário, sem expor credenciais",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const profile = await getProfile(client, userId);
        if (!profile) return { summary: "Não encontrei seu perfil." };
        const lines = [
          "Nome completo: " + (profile.full_name ?? "não informado"),
          "Nome de exibição: " + (profile.display_name ?? "não informado"),
          "Username: " + (profile.username ? "@" + profile.username : "não informado"),
          "Bio: " + (profile.bio ?? "não informada"),
          "Título selecionado: " + (profile.selected_title ?? "padrão"),
          "Badges em destaque: " + (profile.selected_badge_keys?.length ?? 0) + "/3",
        ];
        return { summary: "Resumo do perfil:\n" + lines.join("\n"), data: profile };
      },
    },
    {
      name: "update_profile",
      description: "Atualiza dados editáveis do perfil: nome de exibição, username, telefone e bio",
      parameters: {
        type: "object",
        properties: {
          displayName: { type: "string", description: "Nome que aparece no app" },
          username: { type: "string", description: "Username de 3 a 20 caracteres minúsculos, números ou _" },
          phone: { type: "string", description: "Telefone brasileiro opcional" },
          bio: { type: "string", description: "Bio do perfil" },
        },
      },
      requiresConfirmation: true,
      async execute(args) {
        const hasInput = ["displayName", "username", "phone", "bio"].some((key) => args[key] !== undefined);
        if (!hasInput) return { summary: "Diga qual dado do perfil você quer alterar." };
        const phone = args.phone === undefined ? undefined : clean(args.phone);
        if (phone !== undefined && !isBRPhoneValid(phone)) return { summary: "Esse telefone brasileiro não parece válido." };
        const { profile, error } = await updateProfile(client, userId, {
          displayName: args.displayName === undefined ? undefined : clean(args.displayName) || null,
          username: args.username === undefined ? undefined : clean(args.username).toLowerCase(),
          phone: phone === undefined ? undefined : normalizeBRPhone(phone),
          bio: args.bio === undefined ? undefined : clean(args.bio) || null,
        });
        if (error) return { summary: "Não consegui atualizar o perfil: " + error };
        return { summary: "Perfil atualizado com sucesso.", data: profile };
      },
    },
  ];
}
