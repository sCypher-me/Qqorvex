import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createIdea,
  createPlan,
  createProject,
  createShoppingListItem,
  listAssets,
  listCheckins,
  listImportantPurchases,
  listIdeas,
  listPlans,
  listProjects,
  listShoppingListItems,
  listUsefulContacts,
  listVehicles,
  toggleShoppingListItem,
  upsertCheckin,
} from "@qqorvex/module-vida-pessoal";
import { localDateKey } from "@qqorvex/module-gamificacao";
import type { ToolDefinition } from "../types";
import { ambiguousSummary, matchByName } from "./shared";

type Client = SupabaseClient<Database>;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function numberInRange(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

/** Ferramentas de Vida Pessoal; consultas são livres e mutações exigem confirmação. */
export function createVidaPessoalTools(client: Client, userId: string): ToolDefinition[] {
  return [
    {
      name: "get_personal_overview",
      description: "Resume os dados principais de Vida Pessoal: planos, projetos, ideias, check-ins, contatos, veículos, bens, compras e lista de compras",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const [plans, projects, ideas, checkins, contacts, vehicles, assets, purchases, shopping] = await Promise.all([
          listPlans(client),
          listProjects(client),
          listIdeas(client),
          listCheckins(client, 7),
          listUsefulContacts(client),
          listVehicles(client),
          listAssets(client),
          listImportantPurchases(client),
          listShoppingListItems(client),
        ]);
        const latestCheckin = checkins[0];
        const lines = [
          "Planos: " + plans.length,
          "Projetos: " + projects.length,
          "Ideias capturadas: " + ideas.length,
          "Check-ins registrados: " + checkins.length + (latestCheckin ? " (último em " + latestCheckin.checkin_date + ")" : ""),
          "Contatos úteis: " + contacts.length,
          "Veículos: " + vehicles.length,
          "Bens cadastrados: " + assets.length,
          "Compras importantes: " + purchases.length,
          "Lista de compras: " + shopping.filter((item) => !item.is_purchased).length + " pendentes",
        ];
        return { summary: "Resumo de Vida Pessoal:\n" + lines.join("\n"), data: { plans, projects, ideas, checkins, contacts, vehicles, assets, purchases, shopping } };
      },
    },
    {
      name: "list_personal_checkins",
      description: "Lista o histórico recente de check-ins da Vida Pessoal",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Quantidade de registros, entre 1 e 30" } },
      },
      requiresConfirmation: false,
      async execute(args) {
        const limit = numberInRange(args.limit ?? 14, 1, 30) ?? 14;
        const checkins = await listCheckins(client, limit);
        if (checkins.length === 0) return { summary: "Você ainda não tem check-ins registrados." };
        const lines = checkins.map((item) => "- " + item.checkin_date + ": humor " + item.mood + "/5, sono " + item.sleep_quality + "/5, energia " + item.energy + "/5" + (item.note ? " — " + item.note : ""));
        return { summary: "Histórico de check-ins:\n" + lines.join("\n"), data: checkins };
      },
    },
    {
      name: "create_personal_plan",
      description: "Cria um plano de Vida Pessoal com período definido",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome do plano" },
          description: { type: "string", description: "Descrição opcional" },
          planType: { type: "string", enum: ["mensal", "anual", "quinquenal"] },
          periodStart: { type: "string", description: "Data inicial AAAA-MM-DD" },
          periodEnd: { type: "string", description: "Data final AAAA-MM-DD" },
        },
        required: ["title", "planType", "periodStart", "periodEnd"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = clean(args.title);
        const description = clean(args.description);
        const planType = clean(args.planType) as "mensal" | "anual" | "quinquenal";
        const periodStart = clean(args.periodStart);
        const periodEnd = clean(args.periodEnd);
        if (!title || !periodStart || !periodEnd || !["mensal", "anual", "quinquenal"].includes(planType)) {
          return { summary: "Não consegui criar o plano: preciso de nome, tipo, data inicial e data final válidos." };
        }
        const plan = await createPlan(client, userId, { title, description, planType, periodStart, periodEnd });
        return { summary: "Plano criado: \"" + plan.title + "\".", data: plan };
      },
    },
    {
      name: "create_personal_project",
      description: "Cria um projeto de Vida Pessoal para agrupar tarefas",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nome do projeto" },
          description: { type: "string", description: "Descrição opcional" },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = clean(args.title);
        if (!title) return { summary: "Não consegui criar o projeto: nome vazio." };
        const project = await createProject(client, userId, { title, description: clean(args.description) });
        return { summary: "Projeto criado: \"" + project.title + "\".", data: project };
      },
    },
    {
      name: "capture_personal_idea",
      description: "Captura uma ideia rápida na Vida Pessoal",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da ideia" },
          description: { type: "string", description: "Detalhes opcionais" },
        },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = clean(args.title);
        if (!title) return { summary: "Não consegui capturar a ideia: título vazio." };
        const idea = await createIdea(client, userId, { title, description: clean(args.description) });
        return { summary: "Ideia capturada: \"" + idea.title + "\".", data: idea };
      },
    },
    {
      name: "record_daily_checkin",
      description: "Registra ou atualiza o check-in diário com humor, qualidade do sono e energia de 1 a 5",
      parameters: {
        type: "object",
        properties: {
          mood: { type: "number", description: "Humor de 1 a 5" },
          sleepQuality: { type: "number", description: "Qualidade do sono de 1 a 5" },
          energy: { type: "number", description: "Energia de 1 a 5" },
          note: { type: "string", description: "Observação opcional" },
          date: { type: "string", description: "Data AAAA-MM-DD; se omitida, usa hoje" },
        },
        required: ["mood", "sleepQuality", "energy"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const mood = numberInRange(args.mood, 1, 5);
        const sleepQuality = numberInRange(args.sleepQuality, 1, 5);
        const energy = numberInRange(args.energy, 1, 5);
        if (mood === null || sleepQuality === null || energy === null) {
          return { summary: "Cada avaliação do check-in precisa ser um número inteiro entre 1 e 5." };
        }
        const date = clean(args.date) || localDateKey();
        const checkin = await upsertCheckin(client, userId, date, { mood, sleepQuality, energy, note: clean(args.note) });
        return { summary: "Check-in registrado para " + checkin.checkin_date + ".", data: checkin };
      },
    },
    {
      name: "list_shopping_list",
      description: "Lista os itens pendentes e concluídos da lista de compras",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const items = await listShoppingListItems(client);
        if (items.length === 0) return { summary: "Sua lista de compras está vazia." };
        const lines = items.map((item) => "- [" + (item.is_purchased ? "comprado" : "pendente") + "] " + item.name + (item.quantity ? " (" + item.quantity + ")" : ""));
        return { summary: "Lista de compras:\n" + lines.join("\n"), data: items };
      },
    },
    {
      name: "add_shopping_list_item",
      description: "Adiciona um item à lista de compras",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do item" },
          quantity: { type: "string", description: "Quantidade opcional" },
        },
        required: ["name"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const name = clean(args.name);
        if (!name) return { summary: "Não consegui adicionar o item: nome vazio." };
        const item = await createShoppingListItem(client, userId, { name, quantity: clean(args.quantity) });
        return { summary: "Item adicionado à lista: \"" + item.name + "\".", data: item };
      },
    },
    {
      name: "toggle_shopping_list_item",
      description: "Marca ou desmarca um item da lista de compras pelo nome",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome ou parte do nome do item" },
          isPurchased: { type: "boolean", description: "true para comprado, false para pendente" },
        },
        required: ["name", "isPurchased"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const match = matchByName(await listShoppingListItems(client), clean(args.name), (item) => item.name);
        if (match.kind === "none") return { summary: `Não encontrei item parecido com "${args.name}" na lista de compras.` };
        if (match.kind === "many") return { summary: ambiguousSummary("um item", match.items, (item) => item.name) };
        const updated = await toggleShoppingListItem(client, match.item.id, Boolean(args.isPurchased));
        return { summary: "Item \"" + updated.name + "\" marcado como " + (updated.is_purchased ? "comprado" : "pendente") + ".", data: updated };
      },
    },
  ];
}
