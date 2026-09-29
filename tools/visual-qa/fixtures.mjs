/**
 * Dados de demonstração para o QA visual. Tudo relativo a "hoje" para que Hoje, Agenda e
 * Finanças sempre tenham conteúdo plausível. Linhas são completadas com os defaults do schema
 * pelo mock, então aqui basta o que importa visualmente.
 */
process.env.TZ ??= "America/Sao_Paulo";
export const USER_ID = "00000000-0000-4000-8000-000000000001";

function pad(n) {
  return String(n).padStart(2, "0");
}
function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function at(offsetDays, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function monthKey(offsetMonths = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
let seq = 0;
function id(prefix) {
  seq += 1;
  return `${prefix}-0000-4000-8000-${String(seq).padStart(12, "0")}`;
}

const now = new Date().toISOString();
const base = { user_id: USER_ID, created_at: at(-20, 9), updated_at: now };

const tasks = [
  { title: "Revisar proposta comercial da Aurora", status: "em_andamento", priority: "alta", due_date: dateKey(0), tags: ["trabalho"], estimated_minutes: 90 },
  { title: "Enviar relatório mensal para o financeiro", status: "nao_iniciado", priority: "alta", due_date: dateKey(-1), tags: ["trabalho"] },
  { title: "Agendar consulta no dentista", status: "nao_iniciado", priority: "media", due_date: dateKey(1), tags: ["saúde"] },
  { title: "Estudar capítulo 4 de Estatística", status: "nao_iniciado", priority: "media", due_date: dateKey(0), tags: ["estudos"], estimated_minutes: 60 },
  { title: "Comprar presente de aniversário da Bia", status: "nao_iniciado", priority: "baixa", due_date: dateKey(3), tags: ["pessoal"] },
  { title: "Atualizar portfólio com projeto novo", status: "em_andamento", priority: "media", due_date: dateKey(5), tags: ["carreira"] },
  { title: "Renovar seguro do carro", status: "nao_iniciado", priority: "alta", due_date: dateKey(2), tags: ["finanças"] },
  { title: "Planejar viagem de dezembro", status: "nao_iniciado", priority: "sem_prioridade", tags: ["pessoal"] },
  { title: "Configurar backup do notebook", status: "concluido", priority: "media", completed_at: at(-1, 18), tags: ["casa"] },
  { title: "Ler artigo sobre hábitos atômicos", status: "concluido", priority: "baixa", completed_at: at(-2, 21), tags: ["leitura"] },
].map((t, i) => ({ ...base, id: id("t0000000"), created_at: at(-10 + i, 9), ...t }));

const events = [
  { title: "Daily do time", start_at: at(0, 9, 30), end_at: at(0, 9, 45), category: "trabalho", meeting_link: "https://meet.google.com/abc" },
  { title: "Reunião com cliente Aurora", start_at: at(0, 11), end_at: at(0, 12), category: "trabalho", location: "Escritório — sala 3" },
  { title: "Almoço com a Carol", start_at: at(0, 12, 30), end_at: at(0, 13, 30), category: "pessoal", location: "Bistrô Central" },
  { title: "Bloco de foco: proposta", start_at: at(0, 14), end_at: at(0, 16), category: "foco" },
  { title: "Academia", start_at: at(0, 18, 30), end_at: at(0, 19, 30), category: "saúde" },
  { title: "Aula de inglês", start_at: at(1, 19), end_at: at(1, 20), category: "estudos" },
  { title: "Dentista", start_at: at(2, 8), end_at: at(2, 9), category: "saúde" },
  { title: "Planejamento semanal", start_at: at(4, 10), end_at: at(4, 11), category: "trabalho" },
  { title: "Aniversário da Bia", start_at: at(5, 0), end_at: at(5, 23, 59), category: "pessoal", is_all_day: true },
].map((e) => ({ ...base, id: id("e0000000"), ...e }));

const goals = [
  { title: "Juntar R$ 15.000 para reserva", status: "ativa", progress_type: "numerico", progress_numeric_current: 9200, progress_numeric_target: 15000, progress_percent: 61, category: "finanças", due_date: dateKey(90) },
  { title: "Ler 24 livros em 2026", status: "ativa", progress_type: "numerico", progress_numeric_current: 17, progress_numeric_target: 24, progress_percent: 71, category: "leitura", due_date: dateKey(95) },
  { title: "Tirar certificação AWS", status: "ativa", progress_type: "marcos", progress_percent: 40, category: "carreira", due_date: dateKey(60) },
  { title: "Correr 10 km", status: "planejada", progress_type: "percentual_manual", progress_percent: 25, category: "saúde" },
].map((g) => ({ ...base, id: id("g0000000"), ...g }));

const habits = [
  { name: "Meditar 10 minutos", frequency_type: "diaria", category: "bem-estar", preferred_time: "07:00" },
  { name: "Beber 2L de água", frequency_type: "diaria", category: "saúde" },
  { name: "Ler 20 páginas", frequency_type: "diaria", category: "leitura", preferred_time: "22:00" },
  { name: "Treinar", frequency_type: "x_vezes_semana", frequency_config: { times: 4 }, category: "saúde" },
].map((h) => ({ ...base, id: id("h0000000"), status: "ativo", frequency_config: {}, ...h }));

const habitLogs = [];
habits.forEach((h, hi) => {
  for (let d = -13; d <= 0; d += 1) {
    if ((d + hi) % 3 === 0 && d !== 0) continue;
    if (d === 0 && hi > 1) continue;
    habitLogs.push({ id: id("l0000000"), habit_id: h.id, log_date: dateKey(d), state: "concluido", quantity: null, note: null, created_at: at(d, 8) });
  }
});

const accounts = [
  { name: "Nubank", account_type: "conta_bancaria" },
  { name: "Itaú", account_type: "conta_bancaria" },
  { name: "Carteira", account_type: "dinheiro" },
].map((a) => ({ ...base, id: id("a0000000"), ...a }));

const categories = [
  ["Salário", "entrada"], ["Freelance", "entrada"], ["Moradia", "saida"], ["Mercado", "saida"], ["Transporte", "saida"],
  ["Lazer", "saida"], ["Saúde", "saida"], ["Assinaturas", "saida"], ["Restaurantes", "saida"], ["Educação", "saida"],
].map(([name, kind]) => ({ ...base, id: id("c0000000"), name, kind }));
const cat = Object.fromEntries(categories.map((c) => [c.name, c.id]));

const cards = [{ ...base, id: id("k0000000"), nickname: "Nubank Ultravioleta", institution: "Nubank", last_digits: "4821", closing_day: 3, due_day: 10 }];

const tx = [
  ["Salário", "entrada", 8500, -27, "Salário", accounts[0].id],
  ["Projeto freelance — landing page", "entrada", 2200, -12, "Freelance", accounts[0].id],
  ["Aluguel", "saida", 2400, -25, "Moradia", accounts[1].id],
  ["Condomínio", "saida", 620, -25, "Moradia", accounts[1].id],
  ["Supermercado Pão de Açúcar", "saida", 486.9, -8, "Mercado", accounts[0].id],
  ["Feira de domingo", "saida", 94.5, -2, "Mercado", accounts[2].id],
  ["Uber", "saida", 38.4, -1, "Transporte", accounts[0].id],
  ["Combustível", "saida", 250, -6, "Transporte", accounts[0].id],
  ["Cinema", "saida", 72, -4, "Lazer", accounts[0].id],
  ["Farmácia", "saida", 118.3, -9, "Saúde", accounts[0].id],
  ["Spotify", "saida", 21.9, -15, "Assinaturas", accounts[0].id],
  ["Netflix", "saida", 44.9, -14, "Assinaturas", accounts[0].id],
  ["Jantar japonês", "saida", 186, -3, "Restaurantes", accounts[0].id],
  ["Curso de inglês", "saida", 390, -20, "Educação", accounts[1].id],
  ["Café da padaria", "saida", 18.5, 0, "Restaurantes", accounts[2].id],
  ["Conta de luz", "saida", 212.4, 4, "Moradia", accounts[1].id, "futura"],
  ["Internet", "saida", 119.9, 6, "Moradia", accounts[1].id, "futura"],
].map(([name, type, amount, day, category, account, status]) => ({
  ...base,
  id: id("x0000000"),
  name,
  transaction_type: type,
  amount,
  date: dateKey(day),
  category_id: cat[category],
  account_id: account,
  status: status ?? "concluida",
  payment_method: type === "entrada" ? "transferencia" : "pix",
}));
// Histórico dos meses anteriores para gráficos de tendência.
for (let m = 1; m <= 5; m += 1) {
  tx.push({ ...base, id: id("x0000000"), name: "Salário", transaction_type: "entrada", amount: 8500, date: dateKey(-27 - 30 * m), category_id: cat["Salário"], account_id: accounts[0].id, status: "concluida" });
  tx.push({ ...base, id: id("x0000000"), name: "Aluguel", transaction_type: "saida", amount: 2400, date: dateKey(-25 - 30 * m), category_id: cat["Moradia"], account_id: accounts[1].id, status: "concluida" });
  tx.push({ ...base, id: id("x0000000"), name: "Supermercado", transaction_type: "saida", amount: 700 + m * 60, date: dateKey(-10 - 30 * m), category_id: cat["Mercado"], account_id: accounts[0].id, status: "concluida" });
  tx.push({ ...base, id: id("x0000000"), name: "Lazer do mês", transaction_type: "saida", amount: 300 + (m % 3) * 140, date: dateKey(-5 - 30 * m), category_id: cat["Lazer"], account_id: accounts[0].id, status: "concluida" });
}

const budgets = [
  ["Mercado", 900], ["Restaurantes", 400], ["Lazer", 350], ["Transporte", 450],
].map(([name, limit]) => ({ ...base, id: id("b0000000"), category_id: cat[name], limit_amount: limit, year_month: monthKey(0) }));

const notebooks = [
  { name: "Estatística Aplicada", notebook_type: "materia", area: "Exatas", status: "ativo", institution: "USP", is_favorite: true },
  { name: "AWS Solutions Architect", notebook_type: "certificacao", area: "Cloud", status: "ativo" },
  { name: "Inglês — Business", notebook_type: "curso", area: "Idiomas", status: "ativo" },
].map((n) => ({ ...base, id: id("n0000000"), tags: [], ...n }));

const flashcards = [
  ["O que é desvio padrão?", "Medida de dispersão: raiz quadrada da variância.", 0],
  ["Fórmula da média amostral", "x̄ = Σxᵢ / n", 0],
  ["S3 Standard-IA serve para?", "Dados acessados com pouca frequência, mas que exigem acesso rápido.", 0],
  ["Diferença entre SQS e SNS", "SQS = fila (pull); SNS = pub/sub (push).", 2],
].map(([front, back, due], i) => ({ id: id("f0000000"), notebook_id: notebooks[i < 2 ? 0 : 1].id, front, back, next_review_date: dateKey(due), ease_factor: 2.5, interval_days: 1, repetitions: 1, tags: [], created_at: at(-5, 10), updated_at: now, summary_id: null, topic_id: null }));

const pages = [
  { title: "Ideias para o produto", page_type: "nota", is_favorite: true },
  { title: "Reunião — kickoff Aurora", page_type: "nota" },
  { title: "Receitas favoritas", page_type: "nota" },
  { title: "Framework de decisões", page_type: "nota", is_favorite: true },
  { title: "Leituras de 2026", page_type: "nota" },
].map((p, i) => ({ ...base, id: id("p0000000"), is_archived: false, is_favorite: false, updated_at: at(-i, 15), ...p }));

const blocks = [
  { page_id: pages[0].id, block_type: "titulo1", content: { text: "Ideias para o produto" }, order_index: 0 },
  { page_id: pages[0].id, block_type: "texto", content: { text: "Explorar um modo de planejamento semanal guiado pela Vex." }, order_index: 1 },
  { page_id: pages[0].id, block_type: "checklist", content: { text: "Validar com 5 usuários", checked: false }, order_index: 2 },
].map((b) => ({ id: id("q0000000"), created_at: now, updated_at: now, ...b }));

const library = [
  { title: "Hábitos Atômicos", subtitle: "James Clear", item_type: "book", status: "em_andamento", progress_current: 142, progress_total: 320, progress_unit: "páginas", rating: null, year: 2018 },
  { title: "Duna", subtitle: "Frank Herbert", item_type: "book", status: "concluido", rating: 5, year: 1965 },
  { title: "Severance", item_type: "series", status: "em_andamento", progress_current: 6, progress_total: 10, progress_unit: "episódios", year: 2022 },
  { title: "Oppenheimer", item_type: "movie", status: "quero_consumir", year: 2023 },
  { title: "O Poder do Hábito", subtitle: "Charles Duhigg", item_type: "book", status: "quero_consumir", year: 2012 },
].map((l) => ({ ...base, id: id("r0000000"), is_archived: false, is_favorite: false, tags: [], progress_mode: "manual", ...l }));

const folders = [{ ...base, id: id("d0000000"), name: "Casa" }, { ...base, id: id("d0000000"), name: "Trabalho" }];
const documents = [
  { file_name: "Contrato de aluguel 2026.pdf", document_type: "contrato", mime_type: "application/pdf", size_bytes: 482_000, folder_id: folders[0].id, is_important: true },
  { file_name: "Nota fiscal — notebook.pdf", document_type: "nota_fiscal", mime_type: "application/pdf", size_bytes: 120_000 },
  { file_name: "RG digitalizado.jpg", document_type: "documento_pessoal", mime_type: "image/jpeg", size_bytes: 860_000, is_vault: true },
].map((d) => ({ ...base, id: id("m0000000"), current_version: 1, is_archived: false, is_favorite: false, is_important: false, is_vault: false, tags: [], storage_path: `${USER_ID}/doc.pdf`, deleted_at: null, ...d }));

export const fixtures = {
  profiles: [
    {
      id: USER_ID,
      username: "ana.souza",
      display_name: "Ana",
      full_name: "Ana Souza",
      role: "usuario",
      account_tier: "free",
      avatar_url: null,
      selected_title: "Constante",
      selected_badge_keys: [],
      created_at: at(-60, 9),
      updated_at: now,
    },
  ],
  tasks,
  task_dependencies: [],
  task_checklist_items: [],
  recurring_tasks: [],
  events,
  recurring_events: [],
  goals,
  habits,
  habit_logs: habitLogs,
  accounts,
  categories,
  cards,
  transactions: tx,
  budgets,
  notebooks,
  flashcards,
  pages,
  blocks,
  library_items: library,
  folders,
  documents,
  gamification_stats: [{ user_id: USER_ID, xp: 1840, tasks_completed: 42, habit_or_goal_checkins: 96, library_items_completed: 7, quizzes_completed: 5, quizzes_90_plus: 2, checkin_days_completed: 18, updated_at: now }],
  user_badges: [],
  vex_conversations: [{ ...base, id: id("v0000000"), title: "Planejar a semana" }],
  vex_messages: [],
  billing_subscriptions: [],
  billing_usage_monthly: [{ user_id: USER_ID, month_start: `${monthKey(0)}-01`, vex_ai_responses: 12, vex_web_searches: 2, updated_at: now }],
  daily_checkins: [
    { ...base, id: id("z0000000"), checkin_date: dateKey(-1), mood: 4, energy: 3, sleep_quality: 4, note: null },
    { ...base, id: id("z0000000"), checkin_date: dateKey(0), mood: 4, energy: 4, sleep_quality: 3, note: null },
  ],
  shopping_list_items: [
    { ...base, id: id("s0000000"), name: "Café em grãos", quantity: "1 pacote", is_purchased: false },
    { ...base, id: id("s0000000"), name: "Detergente", quantity: "2", is_purchased: false },
    { ...base, id: id("s0000000"), name: "Frutas", quantity: null, is_purchased: true },
  ],
  ideas: [{ ...base, id: id("i0000000"), title: "App de receitas com IA", description: "Sugere receitas com o que tem na geladeira." }],
  projects: [{ ...base, id: id("j0000000"), title: "Reforma da varanda", description: "Plantas, iluminação e móveis.", status: "ativo" }],
  plans: [{ ...base, id: id("o0000000"), title: "Plano de outubro", plan_type: "mensal", status: "ativo", period_start: dateKey(2), period_end: dateKey(32) }],
};

export const rpcFixtures = {
  get_my_document_storage_quota: { used_bytes: 1_462_000, limit_bytes: 25 * 1024 * 1024, plan: "free" },
  has_google_calendar_connection: false,
  has_security_pin: false,
  is_username_available: true,
  list_my_sessions: [],
  list_my_security_login_history: [],
  sync_my_gamification_badges: null,
  consume_billing_quota: { allowed: true, used: 12, limit: 50 },
};
