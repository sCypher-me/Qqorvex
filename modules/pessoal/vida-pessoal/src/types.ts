import type { Tables, TablesInsert } from "@qqorvex/database";

/**
 * Vida Pessoal — escopo recriado com o usuário em 11/09/2026 (o Xmind original dessa parte foi
 * perdido; ver docs/decisions/vida-pessoal-design.md). Bloco 1 (Planejamento): Plano é uma visão
 * ampla e narrativa (ex.: "Ser um designer"); Meta (`@qqorvex/module-metas-habitos`) continua o
 * item específico e mensurável de sempre — um Plano agrupa várias Metas via `plan_goals`, sem
 * duplicar dado. Projeto é só um agrupador de Tarefas (`@qqorvex/module-tarefas`) via
 * `project_tasks` — nunca duplica o Kanban. Ideia é uma caixa de captura simples de propósito,
 * sem status/categoria.
 */
export type Plan = Tables<"plans">;
export type PlanType = Plan["plan_type"];
export type PlanStatus = Plan["status"];
export type PlanGoalRelation = Tables<"plan_goals">;

export type Project = Tables<"projects">;
export type ProjectTaskRelation = Tables<"project_tasks">;

export type Idea = Tables<"ideas">;

export interface NewPlanInput {
  title: string;
  description?: string;
  planType: PlanType;
  periodStart: string;
  periodEnd: string;
}

export function toPlanInsert(userId: string, input: NewPlanInput): TablesInsert<"plans"> {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    plan_type: input.planType,
    period_start: input.periodStart,
    period_end: input.periodEnd,
  };
}

export interface NewProjectInput {
  title: string;
  description?: string;
}

export function toProjectInsert(userId: string, input: NewProjectInput): TablesInsert<"projects"> {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
  };
}

export interface NewIdeaInput {
  title: string;
  description?: string;
}

export function toIdeaInsert(userId: string, input: NewIdeaInput): TablesInsert<"ideas"> {
  return {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
  };
}

/**
 * Bloco 2 (Bem-estar): "Autocuidado" e "Bem-estar" viraram um único check-in diário (não são
 * hábitos repetíveis — um registro por dia, `unique(user_id, checkin_date)`). Pomodoro segue a
 * mecânica do app Forest: sair/cancelar antes do tempo acabar marca a sessão como `died`.
 */
export type DailyCheckin = Tables<"daily_checkins">;
export type PomodoroSession = Tables<"pomodoro_sessions">;
export type PomodoroStatus = PomodoroSession["status"];

export interface CheckinInput {
  mood: number;
  sleepQuality: number;
  energy: number;
  note?: string;
}

export function toCheckinUpsert(userId: string, date: string, input: CheckinInput): TablesInsert<"daily_checkins"> {
  return {
    user_id: userId,
    checkin_date: date,
    mood: input.mood,
    sleep_quality: input.sleepQuality,
    energy: input.energy,
    note: input.note ?? null,
  };
}

export interface NewPomodoroSessionInput {
  durationMinutes: number;
  status: PomodoroStatus;
  startedAt: string;
  endedAt: string;
}

export function toPomodoroSessionInsert(userId: string, input: NewPomodoroSessionInput): TablesInsert<"pomodoro_sessions"> {
  return {
    user_id: userId,
    duration_minutes: input.durationMinutes,
    status: input.status,
    started_at: input.startedAt,
    ended_at: input.endedAt,
  };
}

/**
 * Bloco 3 (Vida Prática): `useful_contacts` NÃO é uma agenda de contatos genérica (decisão
 * explícita do usuário — isso já é papel do celular), só profissionais/serviços úteis. Documentos
 * de veículo (CRLV, seguro) usam `document_relations` já existente, sem tabela nova pra isso.
 */
export type UsefulContact = Tables<"useful_contacts">;
export type Vehicle = Tables<"vehicles">;
export type VehicleImportantDate = Tables<"vehicle_important_dates">;
export type Asset = Tables<"assets">;
export type ImportantPurchase = Tables<"important_purchases">;
export type PurchasePriority = ImportantPurchase["priority"];
export type ShoppingListItem = Tables<"shopping_list_items">;

export interface NewUsefulContactInput {
  name: string;
  category?: string;
  phone?: string;
  note?: string;
}

export function toUsefulContactInsert(userId: string, input: NewUsefulContactInput): TablesInsert<"useful_contacts"> {
  return {
    user_id: userId,
    name: input.name,
    category: input.category ?? null,
    phone: input.phone ?? null,
    note: input.note ?? null,
  };
}

export interface NewVehicleInput {
  nickname: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
}

export function toVehicleInsert(userId: string, input: NewVehicleInput): TablesInsert<"vehicles"> {
  return {
    user_id: userId,
    nickname: input.nickname,
    plate: input.plate ?? null,
    brand: input.brand ?? null,
    model: input.model ?? null,
    year: input.year ?? null,
  };
}

export interface NewAssetInput {
  name: string;
  category?: string;
  estimatedValue?: number;
  location?: string;
  warrantyId?: string;
}

export function toAssetInsert(userId: string, input: NewAssetInput): TablesInsert<"assets"> {
  return {
    user_id: userId,
    name: input.name,
    category: input.category ?? null,
    estimated_value: input.estimatedValue ?? null,
    location: input.location ?? null,
    warranty_id: input.warrantyId ?? null,
  };
}

export interface NewImportantPurchaseInput {
  title: string;
  estimatedPrice?: number;
  priority?: PurchasePriority;
}

export function toImportantPurchaseInsert(userId: string, input: NewImportantPurchaseInput): TablesInsert<"important_purchases"> {
  return {
    user_id: userId,
    title: input.title,
    estimated_price: input.estimatedPrice ?? null,
    priority: input.priority ?? "media",
  };
}

export interface NewShoppingListItemInput {
  name: string;
  quantity?: string;
}

export function toShoppingListItemInsert(userId: string, input: NewShoppingListItemInput): TablesInsert<"shopping_list_items"> {
  return {
    user_id: userId,
    name: input.name,
    quantity: input.quantity ?? null,
  };
}
