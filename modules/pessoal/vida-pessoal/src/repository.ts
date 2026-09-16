import type { SupabaseClient, Database } from "@qqorvex/database";
import type {
  Asset,
  CheckinInput,
  DailyCheckin,
  Idea,
  ImportantPurchase,
  NewAssetInput,
  NewIdeaInput,
  NewImportantPurchaseInput,
  NewPlanInput,
  NewPomodoroSessionInput,
  NewProjectInput,
  NewShoppingListItemInput,
  NewUsefulContactInput,
  NewVehicleInput,
  Plan,
  PomodoroSession,
  Project,
  ShoppingListItem,
  UsefulContact,
  Vehicle,
  VehicleImportantDate,
} from "./types";
import {
  toAssetInsert,
  toCheckinUpsert,
  toIdeaInsert,
  toImportantPurchaseInsert,
  toPlanInsert,
  toPomodoroSessionInsert,
  toProjectInsert,
  toShoppingListItemInsert,
  toUsefulContactInsert,
  toVehicleInsert,
} from "./types";

type Client = SupabaseClient<Database>;

export async function listPlans(client: Client): Promise<Plan[]> {
  const { data, error } = await client.from("plans").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPlan(client: Client, userId: string, input: NewPlanInput): Promise<Plan> {
  const { data, error } = await client.from("plans").insert(toPlanInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function updatePlanStatus(client: Client, planId: string, status: Plan["status"]): Promise<Plan> {
  const { data, error } = await client.from("plans").update({ status }).eq("id", planId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deletePlan(client: Client, planId: string): Promise<void> {
  const { error } = await client.from("plans").delete().eq("id", planId);
  if (error) throw error;
}

export async function linkGoalToPlan(client: Client, planId: string, goalId: string): Promise<void> {
  const { error } = await client.from("plan_goals").insert({ plan_id: planId, goal_id: goalId });
  if (error) throw error;
}

export async function unlinkGoalFromPlan(client: Client, planId: string, goalId: string): Promise<void> {
  const { error } = await client.from("plan_goals").delete().eq("plan_id", planId).eq("goal_id", goalId);
  if (error) throw error;
}

export async function listPlanGoalRelations(client: Client): Promise<Array<{ plan_id: string; goal_id: string }>> {
  const { data, error } = await client.from("plan_goals").select("plan_id, goal_id");
  if (error) throw error;
  return data;
}

export async function listProjects(client: Client): Promise<Project[]> {
  const { data, error } = await client.from("projects").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProject(client: Client, userId: string, input: NewProjectInput): Promise<Project> {
  const { data, error } = await client.from("projects").insert(toProjectInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateProjectStatus(client: Client, projectId: string, status: Project["status"]): Promise<Project> {
  const { data, error } = await client.from("projects").update({ status }).eq("id", projectId).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteProject(client: Client, projectId: string): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function linkTaskToProject(client: Client, projectId: string, taskId: string): Promise<void> {
  const { error } = await client.from("project_tasks").insert({ project_id: projectId, task_id: taskId });
  if (error) throw error;
}

export async function unlinkTaskFromProject(client: Client, projectId: string, taskId: string): Promise<void> {
  const { error } = await client.from("project_tasks").delete().eq("project_id", projectId).eq("task_id", taskId);
  if (error) throw error;
}

export async function listProjectTaskRelations(client: Client): Promise<Array<{ project_id: string; task_id: string }>> {
  const { data, error } = await client.from("project_tasks").select("project_id, task_id");
  if (error) throw error;
  return data;
}

export async function listIdeas(client: Client): Promise<Idea[]> {
  const { data, error } = await client.from("ideas").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createIdea(client: Client, userId: string, input: NewIdeaInput): Promise<Idea> {
  const { data, error } = await client.from("ideas").insert(toIdeaInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteIdea(client: Client, ideaId: string): Promise<void> {
  const { error } = await client.from("ideas").delete().eq("id", ideaId);
  if (error) throw error;
}

export async function getCheckinForDate(client: Client, date: string): Promise<DailyCheckin | null> {
  const { data, error } = await client.from("daily_checkins").select("*").eq("checkin_date", date).maybeSingle();
  if (error) throw error;
  return data;
}

/** Upsert por (user_id, checkin_date) — refazer o check-in no mesmo dia atualiza, nunca duplica. */
export async function upsertCheckin(client: Client, userId: string, date: string, input: CheckinInput): Promise<DailyCheckin> {
  const { data, error } = await client
    .from("daily_checkins")
    .upsert(toCheckinUpsert(userId, date, input), { onConflict: "user_id,checkin_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listPomodoroSessions(client: Client): Promise<PomodoroSession[]> {
  const { data, error } = await client.from("pomodoro_sessions").select("*").order("started_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * A sessão só é gravada quando termina (completa ou "morre") — nunca existe uma linha "em
 * andamento"; o timer roda em estado local do componente até esse momento.
 */
export async function logPomodoroSession(client: Client, userId: string, input: NewPomodoroSessionInput): Promise<PomodoroSession> {
  const { data, error } = await client
    .from("pomodoro_sessions")
    .insert(toPomodoroSessionInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listUsefulContacts(client: Client): Promise<UsefulContact[]> {
  const { data, error } = await client.from("useful_contacts").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createUsefulContact(client: Client, userId: string, input: NewUsefulContactInput): Promise<UsefulContact> {
  const { data, error } = await client.from("useful_contacts").insert(toUsefulContactInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteUsefulContact(client: Client, contactId: string): Promise<void> {
  const { error } = await client.from("useful_contacts").delete().eq("id", contactId);
  if (error) throw error;
}

export async function listVehicles(client: Client): Promise<Vehicle[]> {
  const { data, error } = await client.from("vehicles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createVehicle(client: Client, userId: string, input: NewVehicleInput): Promise<Vehicle> {
  const { data, error } = await client.from("vehicles").insert(toVehicleInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(client: Client, vehicleId: string): Promise<void> {
  const { error } = await client.from("vehicles").delete().eq("id", vehicleId);
  if (error) throw error;
}

export async function listVehicleImportantDates(client: Client, vehicleId: string): Promise<VehicleImportantDate[]> {
  const { data, error } = await client
    .from("vehicle_important_dates")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addVehicleImportantDate(client: Client, vehicleId: string, label: string, date: string): Promise<VehicleImportantDate> {
  const { data, error } = await client
    .from("vehicle_important_dates")
    .insert({ vehicle_id: vehicleId, label, date })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Todas as datas importantes de todos os veículos do usuário — RLS já restringe aos próprios veículos. */
export async function listAllVehicleImportantDates(client: Client): Promise<VehicleImportantDate[]> {
  const { data, error } = await client.from("vehicle_important_dates").select("*").order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAssets(client: Client): Promise<Asset[]> {
  const { data, error } = await client.from("assets").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createAsset(client: Client, userId: string, input: NewAssetInput): Promise<Asset> {
  const { data, error } = await client.from("assets").insert(toAssetInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteAsset(client: Client, assetId: string): Promise<void> {
  const { error } = await client.from("assets").delete().eq("id", assetId);
  if (error) throw error;
}

export async function listImportantPurchases(client: Client): Promise<ImportantPurchase[]> {
  const { data, error } = await client.from("important_purchases").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createImportantPurchase(client: Client, userId: string, input: NewImportantPurchaseInput): Promise<ImportantPurchase> {
  const { data, error } = await client
    .from("important_purchases")
    .insert(toImportantPurchaseInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleImportantPurchase(client: Client, purchaseId: string, isPurchased: boolean): Promise<ImportantPurchase> {
  const { data, error } = await client
    .from("important_purchases")
    .update({ is_purchased: isPurchased })
    .eq("id", purchaseId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteImportantPurchase(client: Client, purchaseId: string): Promise<void> {
  const { error } = await client.from("important_purchases").delete().eq("id", purchaseId);
  if (error) throw error;
}

export async function listShoppingListItems(client: Client): Promise<ShoppingListItem[]> {
  const { data, error } = await client.from("shopping_list_items").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createShoppingListItem(client: Client, userId: string, input: NewShoppingListItemInput): Promise<ShoppingListItem> {
  const { data, error } = await client
    .from("shopping_list_items")
    .insert(toShoppingListItemInsert(userId, input))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleShoppingListItem(client: Client, itemId: string, isPurchased: boolean): Promise<ShoppingListItem> {
  const { data, error } = await client
    .from("shopping_list_items")
    .update({ is_purchased: isPurchased })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShoppingListItem(client: Client, itemId: string): Promise<void> {
  const { error } = await client.from("shopping_list_items").delete().eq("id", itemId);
  if (error) throw error;
}
