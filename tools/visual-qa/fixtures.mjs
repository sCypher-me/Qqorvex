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
  { name: "Treinar", frequency_type: "x_vezes_semana", frequency_config: { timesPerWeek: 4 }, category: "saúde" },
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
  { name: "Estatística Aplicada", notebook_type: "materia", area: "Exatas", status: "ativo", institution: "USP", is_favorite: true, description: "Base para a disciplina do semestre e para a prova de outubro." },
  { name: "AWS Solutions Architect", notebook_type: "certificacao", area: "Cloud", status: "ativo" },
  { name: "Inglês — Business", notebook_type: "curso", area: "Idiomas", status: "ativo" },
].map((n) => ({ ...base, id: id("n0000000"), tags: [], ...n }));

const flashcards = [
  ["O que é desvio padrão?", "Medida de dispersão: raiz quadrada da variância.", 0],
  ["Fórmula da média amostral", "x̄ = Σxᵢ / n", 0],
  ["S3 Standard-IA serve para?", "Dados acessados com pouca frequência, mas que exigem acesso rápido.", 0],
  ["Diferença entre SQS e SNS", "SQS = fila (pull); SNS = pub/sub (push).", 2],
].map(([front, back, due], i) => ({ id: id("f0000000"), notebook_id: notebooks[i < 2 ? 0 : 1].id, front, back, next_review_date: dateKey(due), ease_factor: 2.5, interval_days: 1, repetitions: 1, tags: [], created_at: at(-5, 10), updated_at: now, summary_id: null, topic_id: null }));

const topics = [
  { notebook_id: notebooks[0].id, title: "Medidas de dispersão", order_index: 0 },
  { notebook_id: notebooks[0].id, title: "Probabilidade", order_index: 1 },
].map((t) => ({ id: id("p0000000"), parent_topic_id: null, created_at: at(-9, 10), ...t }));

const summaries = [
  {
    notebook_id: notebooks[0].id,
    topic_id: topics[0].id,
    title: "Variância e desvio padrão",
    content: "## Ideia central\n\nA **variância** mede o quanto os valores se afastam da média; o **desvio padrão** é a raiz quadrada dela, na mesma unidade dos dados.\n\n## Fórmulas\n\n- Variância amostral: `s² = Σ(xᵢ − x̄)² / (n − 1)`\n- Desvio padrão: `s = √s²`\n\n> Use n − 1 na amostra para não subestimar a dispersão da população.\n\n## Quando usar\n\n1. Comparar a estabilidade de dois processos\n2. Detectar valores atípicos (mais de 2 desvios da média)",
    origin: "manual",
    updated_at: at(-1, 20),
  },
  { notebook_id: notebooks[0].id, topic_id: topics[1].id, title: "Probabilidade condicional", content: "P(A|B) = P(A ∩ B) / P(B).\n\nExemplo: chance de chover dado que está nublado.", origin: "vex", updated_at: at(-3, 19) },
  { notebook_id: notebooks[1].id, topic_id: null, title: "Pilares do Well-Architected", content: "- Excelência operacional\n- Segurança\n- Confiabilidade\n- Eficiência de performance\n- Otimização de custos\n- Sustentabilidade", origin: "manual", updated_at: at(-6, 21) },
].map((s) => ({ id: id("s0000000"), created_at: at(-8, 10), ...s }));

const assessments = [
  { notebook_id: notebooks[0].id, name: "Prova 1 — Estatística descritiva", assessment_date: dateKey(3), expected_content: "Capítulos 1 a 4, medidas de posição e dispersão" },
  { notebook_id: notebooks[1].id, name: "Simulado oficial AWS", assessment_date: dateKey(12), expected_content: null },
  { notebook_id: notebooks[0].id, name: "Lista de exercícios 1", assessment_date: dateKey(-6), expected_content: null },
].map((a) => ({ id: id("a0000000"), notes: null, created_at: at(-10, 9), updated_at: now, ...a }));

const studySessions = [
  [notebooks[0].id, -6, 50, "Capítulo 3"],
  [notebooks[1].id, -5, 35, "Módulo de redes"],
  [notebooks[0].id, -3, 70, "Exercícios de variância"],
  [notebooks[2].id, -2, 25, "Listening"],
  [notebooks[0].id, -1, 45, "Revisão para a prova"],
  [notebooks[1].id, 0, 30, null],
].map(([notebook_id, day, minutes, note]) => ({ id: id("e0000000"), notebook_id, occurred_at: at(day, 20), duration_minutes: minutes, note, created_at: at(day, 21) }));

const quizzes = [{ id: id("q0000000"), notebook_id: notebooks[0].id, title: "Quiz — Medidas de dispersão", created_at: at(-2, 18) }];
const quizQuestions = [
  ["O desvio padrão é:", ["A média dos quadrados", "A raiz quadrada da variância", "O maior valor menos o menor", "A mediana dos desvios"], 1],
  ["Por que usar n − 1 na variância amostral?", ["Para simplificar a conta", "Para corrigir o viés da estimativa", "Porque n é sempre par", "Não há motivo"], 1],
  ["Uma amostra com desvio padrão 0 tem:", ["Valores todos iguais", "Média zero", "Mediana zero", "Valores negativos"], 0],
  ["Qual medida é mais sensível a valores extremos?", ["Mediana", "Moda", "Média", "Quartil"], 2],
  ["A unidade da variância é:", ["A mesma dos dados", "O quadrado da unidade dos dados", "Adimensional", "Percentual"], 1],
].map(([question_text, options, correct_option_index], index) => ({ id: id("r0000000"), quiz_id: quizzes[0].id, question_text, options, correct_option_index, order_index: index, created_at: at(-2, 18) }));
const quizAttempts = [{ id: id("k0000000"), quiz_id: quizzes[0].id, user_id: USER_ID, answers: [1, 0, 0, 2, 1], score: 4, completed_at: at(-2, 19) }];

const errorsDoubts = [
  { notebook_id: notebooks[0].id, description: "Quando usar desvio padrão populacional vs. amostral?", is_resolved: false },
  { notebook_id: notebooks[0].id, description: "Errei o cálculo da variância esquecendo de elevar ao quadrado", is_resolved: true },
].map((e) => ({ id: id("d0000000"), created_at: at(-4, 20), ...e }));

const pages = [
  { title: "Ideias para o produto", page_type: "nota", is_favorite: true },
  { title: "Reunião — kickoff Aurora", page_type: "nota" },
  { title: "Receitas favoritas", page_type: "nota" },
  { title: "Framework de decisões", page_type: "nota", is_favorite: true },
  { title: "Leituras de 2026", page_type: "nota" },
  { title: "Lançamento do app — plano", page_type: "projeto" },
  { title: "Diário de hoje", page_type: "nota_do_dia" },
].map((p, i) => ({ ...base, id: id("p0000000"), is_archived: false, is_favorite: false, updated_at: at(-i, 15), ...p }));

const blocks = [
  { page_id: pages[0].id, block_type: "titulo1", content: { text: "Ideias para o produto" }, order_index: 0 },
  { page_id: pages[0].id, block_type: "texto", content: { text: "Explorar um modo de planejamento semanal guiado pela Vex." }, order_index: 1 },
  { page_id: pages[0].id, block_type: "checklist", content: { text: "Validar com 5 usuários", checked: false }, order_index: 2 },
  { page_id: pages[0].id, block_type: "lista", content: { text: "Resumo semanal automático toda sexta" }, order_index: 3 },
  { page_id: pages[1].id, block_type: "texto", content: { text: "Participantes: Ana, Carol, Pedro. Escopo fechado para a fase 1, entrega em 6 semanas." }, order_index: 0 },
  { page_id: pages[2].id, block_type: "texto", content: { text: "Bolo de cenoura da vó, risoto de cogumelos e o molho de tomate rápido." }, order_index: 0 },
  { page_id: pages[3].id, block_type: "callout", content: { text: "Decisões reversíveis: decida rápido. Irreversíveis: escreva os prós e contras antes." }, order_index: 0 },
  { page_id: pages[5].id, block_type: "texto", content: { text: "Marcos: beta fechado em outubro, loja em novembro, campanha em dezembro." }, order_index: 0 },
  { page_id: pages[6].id, block_type: "texto", content: { text: "Dia produtivo. Terminei a proposta e fui à academia." }, order_index: 0 },
].map((b) => ({ id: id("q0000000"), created_at: now, updated_at: now, ...b }));

const pageLinks = [
  [pages[0].id, pages[3].id],
  [pages[0].id, pages[5].id],
  [pages[1].id, pages[5].id],
  [pages[4].id, pages[3].id],
].map(([source_page_id, target_page_id]) => ({ id: id("l0000000"), source_page_id, target_page_id, created_at: now }));

const pageTags = [
  [pages[0].id, "produto"],
  [pages[0].id, "vex"],
  [pages[1].id, "trabalho"],
  [pages[3].id, "decisões"],
  [pages[5].id, "produto"],
].map(([page_id, tag]) => ({ id: id("g0000000"), page_id, tag, created_at: now }));

const library = [
  { title: "Hábitos Atômicos", subtitle: "James Clear", item_type: "book", status: "em_andamento", progress_current: 142, progress_total: 320, progress_unit: "páginas", rating: null, year: 2018 },
  { title: "Duna", subtitle: "Frank Herbert", item_type: "book", status: "concluido", rating: 5, year: 1965 },
  { title: "Severance", item_type: "series", status: "em_andamento", progress_current: 6, progress_total: 10, progress_unit: "episódios", year: 2022 },
  { title: "Oppenheimer", item_type: "movie", status: "quero_consumir", year: 2023 },
  { title: "O Poder do Hábito", subtitle: "Charles Duhigg", item_type: "book", status: "quero_consumir", year: 2012 },
].map((l) => ({ ...base, id: id("r0000000"), is_archived: false, is_favorite: false, tags: [], progress_mode: l.progress_total ? "numerico" : null, ...l }));

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
  topics,
  summaries,
  assessments,
  study_sessions: studySessions,
  quizzes,
  quiz_questions: quizQuestions,
  quiz_attempts: quizAttempts,
  errors_doubts: errorsDoubts,
  pages,
  blocks,
  page_links: pageLinks,
  page_tags: pageTags,
  library_items: library,
  folders,
  documents,
  gamification_stats: [{ user_id: USER_ID, xp: 1840, tasks_completed: 42, habit_or_goal_checkins: 96, library_items_completed: 7, quizzes_completed: 5, quizzes_90_plus: 2, checkin_days_completed: 18, updated_at: now }],
  user_badges: [],
  vex_conversations: [
    { ...base, id: id("v0000000"), title: "Planejar a semana", updated_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    { ...base, id: id("v0000000"), title: "Quanto gastei com mercado?", updated_at: new Date(Date.now() - 26 * 3600000).toISOString() },
    { ...base, id: id("v0000000"), title: "Ideias para o aniversário da Bia", updated_at: new Date(Date.now() - 96 * 3600000).toISOString() },
    { ...base, id: id("v0000000"), title: "Resumo do livro Hábitos Atômicos", updated_at: new Date(Date.now() - 288 * 3600000).toISOString() },
    { ...base, id: id("v0000000"), title: "Treino para meia maratona", updated_at: new Date(Date.now() - 1080 * 3600000).toISOString() },
  ],
  vex_messages: [],
  billing_subscriptions: [],
  billing_usage_monthly: [{ user_id: USER_ID, month_start: `${monthKey(0)}-01`, vex_ai_responses: 12, vex_web_searches: 2, updated_at: now }],
  daily_checkins: [
    [-6, 3, 2, 3, null],
    [-5, 4, 3, 4, null],
    [-4, 3, 3, 2, "Noite curta, reunião cedo."],
    [-3, 4, 4, 4, null],
    [-2, 5, 4, 4, "Corrida de manhã fez diferença."],
    [-1, 4, 3, 4, null],
    [0, 4, 4, 3, null],
  ].map(([offset, mood, energy, sleep_quality, note]) => ({ ...base, id: id("z0000000"), checkin_date: dateKey(offset), mood, energy, sleep_quality, note })),
  pomodoro_sessions: [
    [0, 9, 30, "completed"],
    [0, 14, 60, "completed"],
    [-1, 10, 30, "completed"],
    [-1, 15, 15, "died"],
    [-2, 9, 60, "completed"],
    [-3, 20, 30, "completed"],
  ].map(([offset, hour, minutes, status]) => ({ ...base, id: id("p0000000"), started_at: at(offset, hour), ended_at: at(offset, hour, status === "died" ? 7 : minutes), duration_minutes: minutes, status })),
  shopping_list_items: [
    { ...base, id: id("s0000000"), name: "Café em grãos", quantity: "1 pacote", is_purchased: false },
    { ...base, id: id("s0000000"), name: "Detergente", quantity: "2", is_purchased: false },
    { ...base, id: id("s0000000"), name: "Aveia", quantity: "500 g", is_purchased: false },
    { ...base, id: id("s0000000"), name: "Frutas", quantity: null, is_purchased: true },
  ],
  ideas: [
    { ...base, id: id("i0000000"), title: "App de receitas com IA", description: "Sugere receitas com o que tem na geladeira.", created_at: at(-3, 21) },
    { ...base, id: id("i0000000"), title: "Newsletter sobre finanças para freelancers", description: null, created_at: at(-9, 8) },
    { ...base, id: id("i0000000"), title: "Horta vertical na varanda", description: "Temperos e ervas para cozinhar.", created_at: at(-15, 18) },
  ],
  projects: [
    { ...base, id: "j0000000-0000-4000-8000-000000000901", title: "Reforma da varanda", description: "Plantas, iluminação e móveis.", status: "ativo" },
    { ...base, id: "j0000000-0000-4000-8000-000000000902", title: "Portfólio 2026", description: null, status: "ativo" },
    { ...base, id: "j0000000-0000-4000-8000-000000000903", title: "Organizar fotos da família", description: null, status: "concluido" },
  ],
  project_tasks: [
    { id: id("r0000000"), project_id: "j0000000-0000-4000-8000-000000000902", task_id: tasks[5].id, user_id: USER_ID, created_at: now },
    { id: id("r0000000"), project_id: "j0000000-0000-4000-8000-000000000902", task_id: tasks[8].id, user_id: USER_ID, created_at: now },
    { id: id("r0000000"), project_id: "j0000000-0000-4000-8000-000000000901", task_id: tasks[7].id, user_id: USER_ID, created_at: now },
  ],
  plans: [
    { ...base, id: "o0000000-0000-4000-8000-000000000901", title: "Virar designer de produto", description: "Migrar de carreira com portfólio e certificação.", plan_type: "anual", status: "ativo", period_start: `${new Date().getFullYear()}-01-01`, period_end: `${new Date().getFullYear()}-12-31` },
    { ...base, id: "o0000000-0000-4000-8000-000000000902", title: "Plano de outubro", description: null, plan_type: "mensal", status: "ativo", period_start: dateKey(2), period_end: dateKey(32) },
  ],
  redemption_codes: [
    { id: id("x0000000"), code: "QQ-PARC-7K2M", tier: "parceiro", note: "Convite para o Bruno", created_by: USER_ID, redeemed_by: "22222222-0000-4000-8000-000000000001", redeemed_at: at(-40, 9), created_at: at(-42, 9) },
    { id: id("x0000000"), code: "QQ-LIFE-9XQ4", tier: "lifetime", note: null, created_by: USER_ID, redeemed_by: null, redeemed_at: null, created_at: at(-2, 16) },
  ],
  plan_goals: [
    { id: id("q0000000"), plan_id: "o0000000-0000-4000-8000-000000000901", goal_id: goals[2].id, user_id: USER_ID, created_at: now },
    { id: id("q0000000"), plan_id: "o0000000-0000-4000-8000-000000000901", goal_id: goals[0].id, user_id: USER_ID, created_at: now },
  ],
  useful_contacts: [
    { ...base, id: id("c0000000"), name: "Marcos", category: "Eletricista", phone: "(11) 98765-4321" },
    { ...base, id: id("c0000000"), name: "Dra. Helena", category: "Dentista", phone: "(11) 3456-7890" },
    { ...base, id: id("c0000000"), name: "Auto Center Vila", category: "Mecânico", phone: null },
  ],
  vehicles: [{ ...base, id: "k0000000-0000-4000-8000-000000000901", nickname: "Onix prata", brand: "Chevrolet", model: "Onix LT", year: 2021, plate: "BRA2E19" }],
  vehicle_important_dates: [
    { id: id("d0000000"), vehicle_id: "k0000000-0000-4000-8000-000000000901", user_id: USER_ID, label: "Seguro", date: dateKey(12), created_at: now },
    { id: id("d0000000"), vehicle_id: "k0000000-0000-4000-8000-000000000901", user_id: USER_ID, label: "Revisão 40 mil km", date: dateKey(45), created_at: now },
  ],
  assets: [
    { ...base, id: id("a0000000"), name: "Notebook de trabalho", category: "Eletrônicos", location: "Escritório", estimated_value: 6800, warranty_id: null },
    { ...base, id: id("a0000000"), name: "Bicicleta", category: "Esporte", location: "Garagem", estimated_value: 2400, warranty_id: null },
  ],
  important_purchases: [
    { ...base, id: id("b0000000"), title: "Cadeira ergonômica", estimated_price: 1890, priority: "alta", is_purchased: false },
    { ...base, id: id("b0000000"), title: "Fone com cancelamento de ruído", estimated_price: 1200, priority: "media", is_purchased: false },
    { ...base, id: id("b0000000"), title: "Luminária de mesa", estimated_price: 240, priority: "baixa", is_purchased: true },
  ],
};

export const rpcFixtures = {
  list_all_accounts: [
    { id: USER_ID, email: "ana.souza@exemplo.com", display_name: "Ana", username: "ana.souza", role: "dono", account_tier: "padrao", created_at: at(-60, 9) },
    { id: "22222222-0000-4000-8000-000000000001", email: "bruno.lima@exemplo.com", display_name: "Bruno Lima", username: "bruno", role: "usuario", account_tier: "parceiro", created_at: at(-41, 14) },
    { id: "22222222-0000-4000-8000-000000000002", email: "carol@exemplo.com", display_name: "Carol Mendes", username: null, role: "usuario", account_tier: "lifetime", created_at: at(-12, 10) },
    { id: "22222222-0000-4000-8000-000000000003", email: "diego.alves@exemplo.com", display_name: null, username: "diegoa", role: "usuario", account_tier: "padrao", created_at: at(-3, 18) },
  ],
  get_system_overview: [{ total_users: 4, total_tasks: 318, total_events: 142, total_transactions: 906, total_documents: 57, total_pages: 214 }],
  list_secret_keys: [
    { key: "gemini_api_key", has_value: true, updated_at: at(-20, 9) },
    { key: "gemini_model", has_value: true, updated_at: at(-20, 9) },
    { key: "tavily_api_key", has_value: false, updated_at: null },
    { key: "google_client_id", has_value: true, updated_at: at(-30, 9) },
  ],
  get_my_document_storage_quota: [{ used_bytes: 1_462_000, quota_bytes: 25 * 1024 * 1024, max_file_bytes: 10 * 1024 * 1024, is_plus: false }],
  has_google_calendar_connection: false,
  has_security_pin: false,
  is_username_available: true,
  list_my_sessions: [
    { id: "qa-session", created_at: at(-12, 9), refreshed_at: at(0, 8), user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36", ip: "189.40.12.8" },
    { id: "11111111-0000-4000-8000-000000000002", created_at: at(-30, 20), refreshed_at: at(-3, 22), user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", ip: "177.92.4.110" },
  ],
  list_my_security_login_history: [],
  sync_my_gamification_badges: null,
  consume_billing_quota: { allowed: true, used: 12, limit: 50 },
};
