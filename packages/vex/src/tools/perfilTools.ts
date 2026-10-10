import type { SupabaseClient, Database } from "@qqorvex/database";
import { getProfile, isBRPhoneValid, normalizeBRPhone, updateProfile } from "@qqorvex/auth";
import type { ToolDefinition } from "../types";
import { normalizeVexStyle, VEX_STYLE_OPTIONS, vexStyleLabel } from "../vexStyle";

type Client = SupabaseClient<Database>;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

const VEX_STYLE_VALUES = VEX_STYLE_OPTIONS.map((option) => option.value);

/** Grava a personalidade nas preferências da conta sem apagar as demais (tema, cor de destaque…). */
async function saveVexStyle(client: Client, style: string): Promise<string | null> {
  const { data, error: readError } = await client.auth.getUser();
  if (readError || !data.user) return readError?.message ?? "sessão indisponível";
  const saved = data.user.user_metadata?.qqorvex_preferences;
  const current = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const { error } = await client.auth.updateUser({ data: { qqorvex_preferences: { ...current, vex_style: style } } });
  return error?.message ?? null;
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
    {
      name: "set_vex_style",
      description:
        "Troca a personalidade da Vex (o jeito de conversar) quando a pessoa pede para você falar de outro jeito daqui em diante. direct = Direta e acolhedora (curta e objetiva), conversational = Calorosa e conversadora (próxima, explica o porquê), encouraging = Mentora estratégica (prioridades, caminhos e riscos). Não muda ferramentas nem permissões.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string", enum: VEX_STYLE_VALUES, description: "Personalidade escolhida" },
        },
        required: ["style"],
        additionalProperties: false,
      },
      requiresConfirmation: true,
      preview(args) {
        return {
          title: "Mudar a personalidade da Vex",
          fields: [{ label: "Nova personalidade", value: vexStyleLabel(args.style) }],
          note: "Vale para as próximas respostas e fica salvo em Configurações → Aparência.",
        };
      },
      async execute(args) {
        if (!VEX_STYLE_VALUES.includes(args.style as never)) {
          return { summary: "Escolha uma das personalidades: Direta e acolhedora, Calorosa e conversadora ou Mentora estratégica.", ok: false };
        }
        const style = normalizeVexStyle(args.style);
        const error = await saveVexStyle(client, style);
        if (error) return { summary: "Não consegui salvar a nova personalidade: " + error, ok: false };
        return { summary: `Personalidade da Vex alterada para ${vexStyleLabel(style)}. As próximas respostas já seguem esse jeito.`, data: { style } };
      },
    },
  ];
}
