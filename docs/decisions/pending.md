# Pendências reais (dependem do usuário ou de pesquisa externa no momento da implementação)

## Bloqueios que precisam do usuário
- **E-mail transacional — resolvido**: Resend configurado (SMTP no painel do Supabase, host
  smtp.resend.com) e domínio `biocypher.tech` verificado pelo usuário. Confirmado em
  10/09/2026 com um signup real de ponta a ponta: `POST /auth/v1/signup` retornou sucesso (sem o
  antigo `550 domain not verified`) e o e-mail de confirmação chegou de verdade. Sem pendência.
- **pnpm 12.3.4**: existe (confirmado via `pnpm install`), mas a instalação global via npm foi
  bloqueada por policy de `allow-scripts`. Repo está funcionando com pnpm 9.15.9 localmente; não é
  bloqueante, só revisitar quando convier.
- **Lote de testes ponta a ponta — concluído em 10/09/2026**: Nota do Dia, Lixeira com retenção,
  Detecção de duplicados por hash, Bases + Views persistidas e Calendário Financeiro — 30/30
  checks passaram contra o Supabase real (usuário de teste removido ao final). Sem pendência.
- **Notificações push — confirmado de ponta a ponta com o usuário em 11/09/2026**. Sem pendência.
- **WebAuthn/Passkey — implementado, corrigido em 11/09/2026 (2 rodadas)**:
  - **1ª tentativa (errada)**: usei `client.auth.mfa.webauthn.register()`/`.authenticate()` —
    existe nos tipos do supabase-js mas deu erro em produção ("MFA enroll is disabled for
    WebAuthn"), mesmo depois do usuário habilitar "Passkeys" no painel do Supabase. Pesquisei a
    documentação oficial (`search_docs`) e descobri o motivo: `auth.mfa.webauthn` **não é uma
    funcionalidade ativa no Supabase Cloud** — a própria doc de "Auth MFA" lista só TOTP e
    telefone como fatores suportados hoje. É um caminho existente só nos tipos do cliente, não
    implementado no servidor.
  - **API certa**: Passkey no Supabase não é um "segundo fator" empilhado sobre a senha — é uma
    **forma alternativa de login sem senha**, via `auth.registerPasskey()` (cadastro, cerimônia
    completa numa chamada), `auth.signInWithPasskey()` (login direto, credencial discoverable —
    não pede e-mail antes) e `auth.passkey.list()/.update()/.delete()` (gerenciar). Exige dois
    opt-ins de infraestrutura, nenhum deles óbvio: (1) `createClient(url, key, { auth: {
    experimental: { passkey: true } } })` no código — sem isso o cliente nem tenta; adicionado em
    `packages/database/src/client.ts` (afeta todo `createSupabaseClient()`, não só a Vex/Segurança);
    (2) "Enable Passkey authentication" no painel do Supabase (Authentication → Passkeys) com
    Relying Party ID/Origins configurados pro domínio em uso (`localhost`/`http://localhost:5173`
    em dev) — feito pelo usuário.
  - `packages/auth/src/mfa.ts` voltou a ser só TOTP (com nota explicando por que `mfa.webauthn`
    não é usado). Novo `packages/auth/src/passkey.ts` com a API certa. `/seguranca` ganhou seção
    "Passkeys" (cadastrar, renomear, remover — sem pedir nome antes, o Supabase deriva um nome do
    autenticador automaticamente). `/mfa` voltou a ser só TOTP (Passkey não se encaixa no modelo
    "desafio depois da senha" — é usado direto na tela de login). `/login` ganhou botão "Entrar
    com Passkey" (`auth.signInWithPasskey()`). Typecheck e build limpos.
  - **Confirmado pelo usuário em 11/09/2026**: "Adicionar passkey" e "Entrar com Passkey"
    funcionando de ponta a ponta no navegador real. Sem pendência.
- **Documentos — Versionamento confirmado ponta a ponta pelo usuário em 11/09/2026**: enviar
  documento, enviar nova versão, histórico em "Versões" e "Restaurar" — todos funcionando no
  navegador real. Durante o teste apareceu um bug transitório (o seletor nativo de arquivo não
  abria só em `localhost:5173`, sem erro no console; sumiu sozinho depois de testar numa aba
  anônima — provavelmente uma permissão/estado específico daquela aba, não um bug de código, já
  que não havia handler nenhum interceptando o clique e outros sites abriam o seletor normalmente
  no mesmo navegador). Sem pendência.
- **Documentos — Pastas, Garantias, `document_type` editável e Perfil confirmados pelo usuário em
  11/09/2026**: criar pasta + atribuir documento + filtrar, cadastrar garantia, trocar tipo do
  documento + filtrar por tipo, editar Perfil (nome/bio) em `/seguranca` — todos testados no
  navegador real e funcionando. Sem pendência.
- **Edição de Perfil — implementada e confirmada (11/09/2026)**: a tabela `profiles` já existia
  desde o início (trigger cria a linha no signup) mas nenhum código nunca lia/escrevia nela. Novo
  `packages/auth/src/profile.ts` (`getProfile`/`updateProfile`/`ProfileInput`) + `useProfile.ts`
  (hook local, mesmo padrão de `useMfaFactors`/`usePasskeys` — sem TanStack Query, que é convenção
  só dos `modules/*`, não de `packages/auth`). Nova seção "Perfil" no topo de `/seguranca` (nome
  de exibição, nome de usuário, bio). `updateProfile()` traduz os dois erros esperados do banco
  pra mensagem amigável: `23505` (username duplicado, é `unique`) e `23514` (formato inválido,
  constraint `username_format` exige `^[a-z0-9_]{3,20}$` — mas a coluna é `citext`, então o `~` do
  Postgres vira case-insensitive automaticamente, por isso o username real do dono ("Cypher",
  maiúsculo) já passava). Testado ao vivo contra o Supabase real (autônomo, dado original
  restaurado) e depois confirmado pelo usuário no navegador em 11/09/2026. Sem foto de perfil
  (upload de `avatar_url` fica pra quando houver um componente de upload de imagem reutilizável)
  nem Gamification Core (Level/XP/Badges/Títulos — fonte de dados separada, ainda não existe). Sem
  pendência.

- **Vida Pessoal — módulo novo, Bloco 1 (Planejamento) implementado (11/09/2026)**: escopo inteiro
  recriado direto com o usuário via brainstorming (o Xmind original dessa parte foi perdido) — ver
  `docs/decisions/vida-pessoal-design.md` pro design completo dos 3 blocos. Bloco 1: `plans`
  (Plano é uma visão ampla — ex. "Ser um designer" — diferente de Meta, que continua específica e
  mensurável; `plan_goals` agrupa Metas já existentes sem duplicar), `projects` (agrupador de
  Tarefas já existentes via `project_tasks`, nunca duplica o Kanban), `ideas` (caixa de captura
  simples, sem status/categoria). Novo módulo `@qqorvex/module-vida-pessoal`
  (`modules/pessoal/vida-pessoal`), rota `/vida-pessoal`. `computePlanLabel()`/`computePlanPeriod()`
  são puras (testadas isoladamente com os 3 tipos de plano, incluindo virada de ano em dezembro).
  Testado ao vivo contra o Supabase real (dados temporários, removidos ao final): Plano+Meta+
  vínculo, Projeto+Tarefa+vínculo e Ideia inseridos com sucesso; apagar a Meta vinculada remove só
  a relação (o Plano sobrevive); apagar a Tarefa vinculada remove só a relação (o Projeto
  sobrevive). Typecheck e build limpos. **Ainda sem teste de clique real na UI** (formulários,
  dropdowns de vincular/desvincular) — fica pro usuário testar em `/vida-pessoal`. Blocos 2
  (Bem-estar: check-in diário, Pomodoro) e 3 (Vida Prática: Contatos Úteis, Veículos, Bens e
  Inventário, Compras Importantes, Lista de Compras) ainda não implementados — próximas fases,
  mesmo design já aprovado. **Bloco 1 confirmado pelo usuário no navegador em 11/09/2026.**

- **Vida Pessoal — Bloco 2 (Bem-estar) implementado (11/09/2026)**: `daily_checkins` (mood/
  sleep_quality/energy 1–5 com `check` no banco, `unique(user_id, checkin_date)` — upsert por dia,
  mesmo padrão de `habit_logs`) e `pomodoro_sessions` (`duration_minutes` 15/30/60,
  `status` `completed`/`died`). Mecânica igual ao app Forest (confirmada pelo usuário): a sessão só
  é gravada quando termina — nunca existe linha "em andamento"; sair da aba (`visibilitychange`)
  ou clicar "Cancelar" grava como `died`, terminar o tempo grava como `completed`.
  `countCompletedPomodorosToday()`/`countCompletedPomodorosThisWeek()` são puras (testadas
  isoladamente com sessões `completed`/`died` misturadas e datas cruzando o início da semana).
  UI: `DailyCheckinForm` (5 carinhas de humor + escalas 1–5 de sono/energia + nota opcional,
  mostra resumo com "Editar" depois de preenchido hoje) e `PomodoroTimer` (seletor 15/30/60min,
  árvore que "cresce" via `scale` proporcional ao progresso, contagem de árvores hoje/na semana).
  `createVidaPessoalHojeProvider()` novo — mostra "Fazer check-in de hoje" no Hoje só quando ainda
  não foi feito (Planos/Projetos/Ideias continuam fora do Hoje, "não vira feed"). Testado ao vivo
  contra o Supabase real (dados temporários, removidos ao final): upsert de check-in não duplica
  (2 upserts no mesmo dia → 1 linha só, valores atualizados), `mood` fora de 1–5 rejeitado pela
  constraint, sessão de pomodoro inserida corretamente. Typecheck e build limpos. **Confirmado
  pelo usuário no navegador em 11/09/2026** (check-in salvo, Pomodoro completando/cancelando
  corretamente).

- **Vida Pessoal — Bloco 3 (Vida Prática) implementado (11/09/2026)**: `useful_contacts` (NÃO é
  agenda genérica — decisão explícita do usuário, só profissionais/serviços úteis),
  `vehicles`+`vehicle_important_dates` (IPVA/seguro/revisão, mesmo formato de
  `document_important_dates`; documentos do veículo — CRLV, apólice — reaproveitam
  `document_relations` já existente via `AttachDocumentPanel` de `@qqorvex/module-documentos`,
  nenhuma tabela nova pra isso), `assets` (Bens e Inventário, mais amplo que Garantias, com
  `warranty_id` opcional `on delete set null` — mesmo padrão de `transactions.document_id`),
  `important_purchases` (prioridade baixa/média/alta, sem vínculo com Finanças na v1 — YAGNI
  consciente), `shopping_list_items` (quantidade em texto livre). Novos hooks em
  `hooks/useVidaPratica.ts` (arquivo separado de `useVidaPessoal.ts` pra não crescer demais, mesmo
  princípio de `useGoals.ts`/`useHabits.ts`/`useRoutines.ts` em Metas & Hábitos). UI: 5 painéis
  (`UsefulContactsPanel`, `VehiclesPanel`, `AssetsPanel`, `ImportantPurchasesPanel`,
  `ShoppingListPanel`) na nova aba "Vida Prática" — `/vida-pessoal` ganhou abas internas
  (Planejamento/Bem-estar/Vida Prática) no lugar de tudo empilhado numa página só.
  `createVidaPessoalHojeProvider()` ganhou uma segunda fonte: datas importantes de Veículos nos
  próximos 14 dias (mesma janela que Documentos usa), junto do lembrete de check-in já existente.
  Testado ao vivo contra o Supabase real (dados temporários, removidos ao final): as 6 tabelas
  inseridas com sucesso, apagar a garantia vinculada a um bem só limpa a referência (`warranty_id`
  vira `null`, o bem sobrevive), apagar um veículo remove suas datas importantes em cascata.
  Typecheck e build limpos. **Confirmado pelo usuário no navegador em 11/09/2026** (contato útil,
  veículo com data importante, bem com vínculo de garantia, compra importante e item de lista —
  todos funcionando). Com isso, o design completo de `docs/decisions/vida-pessoal-design.md` está
  implementado e confirmado (os 3 blocos). Sem pendência.

- **Integrações da Agenda — escopo definido via brainstorming em 11/09/2026** (ver
  `docs/decisions/integracoes-agenda-design.md`): antes só existia a nota "depende de OAuth
  externo", sem nunca ter sido detalhado o quê exatamente construir. Decisão: 2 fases
  independentes — Fase 1 (Zoom, implementada agora) e Fase 2 (Google Calendar, sincronização
  bidirecional completa, ainda a detalhar/construir).
  - **Fase 1 (Zoom) implementada (11/09/2026)**: como o Qqorvex é de um usuário só, o app Zoom é
    do tipo **Server-to-Server OAuth** (Zoom Marketplace) — sem redirecionamento/consentimento por
    usuário, só 3 credenciais (Account ID, Client ID, Client Secret) trocadas direto por um token
    quando preciso. Nova Edge Function `create-zoom-meeting` (`verify_jwt=true`, diferente de
    `send-notifications` que usa segredo próprio porque é acionada pelo cron — esta é acionada por
    um usuário logado de verdade): função de propósito único, só fala com a API do Zoom (troca as
    credenciais por token, cria a reunião via `POST /users/me/meetings`), nunca escreve no banco.
    Novo `createZoomMeeting()` + hook `useCreateZoomMeeting()` em `@qqorvex/module-agenda`: chama
    a Edge Function e, com o `join_url` retornado, chama `createEvent()` que já existia
    (`category: 'reuniao'`, `meetingLink`) — reaproveita toda a lógica de criação já existente
    (`findConflicts()` incluso), a Edge Function não duplica nada disso. Novo componente
    `NewZoomMeetingForm` (título + início/fim) na aba "Reuniões" da Agenda — cria a reunião no
    Zoom e o evento na Agenda numa única ação, sem precisar criar o evento manualmente antes
    (decisão explícita do usuário). O formulário manual de Reunião (colar link à mão) continua
    existindo sem mudanças. Typecheck e build limpos; Edge Function implantada. Credenciais reais
    do usuário recebidas e guardadas em `app_secrets` (`zoom_account_id`/`zoom_client_id`/
    `zoom_client_secret`). Dois problemas encontrados e corrigidos durante o teste ao vivo (v1→v3
    da função): (1) **CORS** — essa é a primeira função chamada direto do navegador
    (`supabase.functions.invoke`, diferente de `send-notifications` que só roda servidor-a-servidor
    via cron); sem cabeçalhos CORS e resposta ao `OPTIONS`, o navegador bloqueia a chamada antes
    dela chegar na função ("Failed to send a request to the Edge Function"); (2) **mensagem de
    erro genérica** — `FunctionsHttpError` do supabase-js só traz "non-2xx status code"; o corpo
    de verdade da resposta vem em `error.context` (a `Response` crua) e precisa ser lido à parte
    pra mostrar o motivo real. Com isso corrigido, apareceu um problema do lado do Zoom (não do
    código): o app Server-to-Server vem criado como rascunho e precisa ser **ativado**
    manualmente em Manage → app → Activation no Zoom Marketplace — sem isso a API retorna
    `invalid_client`/"The app has been disabled by the developer". **Confirmado pelo usuário em
    11/09/2026**: reunião criada de verdade no Zoom, evento apareceu na Agenda com o link
    funcionando. Sem pendência.
  - **Fase 2 (Google Calendar) implementada (11/09/2026)**: `events` ganhou `google_event_id`/
    `google_updated_at` (relação 1:1, sem tabela de mapeamento); novas `google_calendar_connections`
    (RLS: usuário só lê/apaga a própria, só a Edge Function escreve — a troca do código OAuth
    acontece fora de uma sessão de usuário normal), `pending_google_deletions` (`deleteEvent()`
    insere aqui quando o evento apagado já tinha `google_event_id`, sem mudar o comportamento de
    exclusão que já existia) e `google_oauth_states` (token opaco de `state` gerado pelo cliente
    antes de redirecionar — evita precisar de segredo de assinatura). Duas Edge Functions novas:
    `google-oauth-callback` (`verify_jwt=false` — é o Google chamando via redirecionamento do
    navegador, sem JWT nenhum; consome o `state` pra saber de qual usuário era a solicitação, troca
    o código pelo `refresh_token`, cria o calendário dedicado "Qqorvex" via API, guarda a conexão)
    e `sync-google-calendar` (`verify_jwt=false`, mesmo segredo de cron de `send-notifications`,
    `pg_cron` a cada 10 min — processa exclusões pendentes, puxa mudanças do Google, empurra
    mudanças do Qqorvex, "quem editou por último vence" comparando timestamps). Cliente:
    `buildGoogleAuthUrl()`, `useConnectGoogleCalendar`/`useDisconnectGoogleCalendar`/
    `useGoogleCalendarConnection`, componente `GoogleCalendarSection` na nova seção "Integrações"
    em `/seguranca`. Nova env var `VITE_GOOGLE_CLIENT_ID` (não é secreta). Testado: guarda anti-
    segredo-errado do `sync-google-calendar` confirmada em produção (401 com segredo errado, 200
    com o certo, `pg_cron` agendado a cada 10 min), schema das 3 tabelas novas + colunas novas em
    `events` verificado ao vivo (inserção/limpeza de dados temporários). Advisors limpos.
    Usuário criou o app OAuth no Google Cloud Console e forneceu Client ID/Client Secret
    (guardados em `app_secrets`). Três bugs reais encontrados e corrigidos durante o teste ao
    vivo: (1) **RLS faltando** — `google_oauth_states` só tinha policy de INSERT; o Supabase
    precisa reler a linha recém-inserida (`.insert().select()`) mesmo sendo o mesmo usuário
    inserindo, e sem policy de SELECT isso falhava silenciosamente (o botão "Conectar" não fazia
    nada visível) — adicionada `google_oauth_states_select_own`; (2) **API não ativada** — erro
    claro do próprio Google (`Google Calendar API has not been used...`), corrigido ativando a API
    no Cloud Console; (3) **timestamp de corte calculado cedo demais** — `last_synced_at` era
    calculado no início do processamento de cada conexão, antes dos próprios `update()` da função
    (que reescrevem `events.updated_at` via trigger); isso fazia o mesmo evento parecer "mudado de
    novo" no ciclo seguinte e ser reenviado ao Google infinitamente — corrigido calculando o
    timestamp só depois de todas as escritas terminarem. **Confirmado pelo usuário em
    11/09/2026, ponta a ponta nos 3 sentidos**: evento criado no Qqorvex apareceu no Google
    (push), evento criado no Google (no calendário "Qqorvex" certo, não no pessoal) apareceu no
    Qqorvex (pull), e apagar um evento no Qqorvex removeu do Google também (via
    `pending_google_deletions`). Sem pendência — a integração está ativa e sincronizando de
    verdade a cada 10 minutos.
  - (adicionar aqui qualquer outra feature autônoma implementada depois desta, antes da próxima
    rodada de testes com o usuário)

## Supabase — status
- Projeto: `qqorvex` (id `uowipikbumbaprckdvkg`), org `sCypher-me's Org`, `sa-east-1`, R$0/mês.
- URL e publishable key em `apps/qqorvex/.env` (gitignored) / `.env.example` (chave não é secreta).
- Migrations aplicadas (`supabase/migrations/`):
  1. `profiles.sql` — perfil básico (display_name/username/avatar_url/bio), RLS própria linha,
     trigger de auto-criação no signup.
  2. `profiles_hardening.sql` — corrige achados do advisor (search_path, extensão fora de
     `public`, RPC do trigger exposta).
  3. `tasks.sql` — `tasks` (Kanban de 3 estados via enum, prioridade, prazo, tags, subtarefas via
     `parent_task_id`), `task_checklist_items`, `task_dependencies` (com proteção anti-autorreferência),
     RLS completa (select/insert/update/delete só do dono, inclusive nas tabelas filhas via join).
  4. `events.sql` — `events` (título, horário, dia inteiro, local, link, categoria livre, buffers,
     `task_id` opcional com `on delete set null`), `event_reminders`, RLS completa.
  5. `goals_habits.sql` — `goals`, `goal_milestones`, `goal_checkins`, `habits`, `habit_logs`
     (unique por `habit_id`+`log_date`), `goal_habit_relations`, RLS completa.
  6. `estudos.sql` — `notebooks`, `topics`, `summaries`, `flashcards` (+ campos de repetição
     espaçada), `flashcard_reviews`, `errors_doubts`, `assessments`, `study_sessions`, RLS
     completa via join ao Caderno dono.
  7. `segundo_cerebro.sql` — `pages`, `blocks`, `page_properties`, `page_tags`, `page_links`
     (anti-autorreferência), `bases`, `base_pages`, `base_formulas`, RLS completa.
  8. `biblioteca.sql` — `library_items` (15 tipos, progresso, avaliação 1–5), `library_item_creators`,
     `library_consumption_cycles`, `library_collections` + `library_collection_items`,
     `library_item_relations` (anti-autorreferência), RLS completa.
  9. `documentos.sql` — `documents`, `folders`, `document_relations` (referência genérica a
     entidades de outros módulos), `document_important_dates`, `warranties`, RLS completa, +
     bucket privado `documents` no Storage com RLS em `storage.objects` por prefixo `{user_id}/`.
  10. `financas.sql` — `accounts`, `cards`, `categories`, `recurring_transactions`
      (recorrência + assinatura via `is_subscription`), `installments`, `transactions`
      (`document_id` → Documentos, checagem de transferência exigindo conta destino), `budgets`,
      RLS completa.
  - `get_advisors(security)` limpo depois de cada migration.
- Testado ponta a ponta com usuários reais (criados via signup e via SQL+pgcrypto para contornar o
  rate limit de e-mail): trigger de profile, RLS negando leitura/escrita anônima, CRUD completo de
  tasks/events/goals/habits/notebooks/flashcards/pages/blocks/bases/library_items/documents,
  trigger de `updated_at`, checklist item, dependência entre tarefas, rejeição de enum inválido,
  rejeição de evento com fim antes do início, confirmação de que apagar uma tarefa vinculada a um
  evento só desfaz a referência sem apagar o evento, hierarquia de submeta, marcos com progresso
  calculado, check-in, upsert de registro de hábito por dia (não duplica), relação meta↔hábito,
  rejeição de `progress_percent` fora do intervalo 0–100, matemática da repetição espaçada
  batendo com o valor persistido, confirmação de que apagar um tópico preserva resumos/flashcards
  relacionados (só limpa a referência), link wiki + backlink funcionando, chave de propriedade
  duplicada rejeitada, autolink de página rejeitado, confirmação de que apagar uma página não
  apaga páginas que a referenciam, avaliação fora de 1–5 rejeitada, autorrelação de item
  rejeitada, ciclo de consumo/coleção/relação entre itens funcionando, upload real de arquivo no
  Storage com URL assinada baixando o conteúdo certo, isolamento por usuário no Storage (anon não
  lista a pasta de outro usuário), cálculo de fim de garantia batendo com o exemplo do próprio
  Xmind (compra 08/09/2026 + 24 meses → 08/09/2028), exclusão de documento limpando tanto a
  linha quanto o objeto físico no Storage, saldo atual/projetado batendo com o cálculo manual,
  transferência não alterando saldo global, próxima cobrança de assinatura batendo com o exemplo
  do Xmind (Spotify anual 09/10/2026 → 09/10/2027), parcelamento de R$ 3.600 em 12x gerando
  exatamente 12 parcelas de R$ 300, e rejeição de valor negativo/transferência sem destino/status
  inválido/categoria duplicada. Todos os usuários/dados de teste foram removidos ao final
  (cascade zerou as tabelas; Storage ficou vazio).
- `packages/database`: `createSupabaseClient()` + tipos gerados via `generate_typescript_types`
  (regenerar sempre que uma migration mudar o schema — não editar `types.ts` à mão).
- `packages/auth`: `AuthProvider`/`useAuth` (signIn/signUp/signOut por e-mail+senha) + `RequireAuth`.
  **2FA (TOTP) implementado** (10/09/2026) via MFA nativo do Supabase Auth (`auth.mfa`) — sem
  schema/segredo próprio, o Supabase guarda e valida o fator. `mfa.ts` expõe
  `enrollTotp`/`verifyTotpEnrollment`/`verifyTotpChallenge`/`unenrollFactor`/`listMfaFactors`/
  `getAssuranceLevel`/`isMfaPending`; `RequireAuth` checa a assurance level da sessão e redireciona
  pra `/mfa` quando o usuário logou só com senha mas tem 2FA ativo (precisa completar `aal1` →
  `aal2`). UI: `/seguranca` (ativar/desativar, mostra QR code + secret manual) e `/mfa` (tela de
  desafio pós-login). Testado ponta a ponta contra o Supabase real (11 checks, incluindo gerar um
  código TOTP válido de verdade a partir do secret retornado e confirmar a transição
  `aal1`→`aal2`): nada pendente antes de ativar, enroll funciona, código errado rejeitado, código
  real confirma o enrollment, fator aparece como `verified`, login só com senha fica em `aal1`
  quando há 2FA ativo, completar o desafio eleva pra `aal2`, desativar remove o fator. Passkeys já
  implementados também (ver entrada própria abaixo).
  **Sessões/dispositivos implementado (11/09/2026, ver
  `docs/decisions/central-seguranca-sessoes-design.md`)** — primeiro sub-projeto da Central de
  Segurança mais completa (PIN fica para depois, como sub-projeto independente). Achado técnico
  central: o schema `auth` não é exposto pela API automática do Supabase por segurança, então
  listar/revogar sessões individuais (com `user_agent`/`ip`/`refreshed_at`) exige duas funções
  Postgres novas (`list_my_sessions`/`revoke_my_session`, `security definer`, só enxergam
  `auth.uid()`) — sem tabela nova. `revoke_my_session` recusa revogar a própria sessão atual
  (compara com o claim `session_id` do JWT). "Sair de todos os outros dispositivos" reaproveita
  `supabase.auth.signOut({ scope: "others" })`, já pronto no SDK, sem função nova. Novo
  `packages/auth/src/sessions.ts` (`listSessions`/`revokeSession`/`getCurrentSessionId`/
  `parseUserAgent`, parser leve por regex sem dependência nova) + `useSessions.ts` (mesmo padrão
  local de `useMfaFactors`/`usePasskeys`). Nova seção "Dispositivos" em `/seguranca`. Durante o
  teste, o advisor de segurança acusou `anon` conseguindo executar as duas funções (Supabase
  concede `EXECUTE` a `anon`/`authenticated` automaticamente na criação de qualquer função) —
  corrigido com `revoke execute ... from anon` explícito (revogar de `public` não bastou, porque o
  grant a `anon` é direto). Testado ao vivo contra o Supabase real simulando `auth.uid()`/
  `auth.jwt()` via `set_config` no SQL Editor: listagem correta das 3 sessões reais do usuário,
  recusa de revogar a própria sessão atual, revogação bem-sucedida de uma sessão órfã diferente
  (nunca afetando a sessão ativa real), e isolamento entre usuários confirmado (um `user_id` falso
  não vê nem consegue apagar sessão de outro usuário). Typecheck e build limpos. **Ainda sem teste
  de clique real na UI** — fica pro usuário testar, idealmente logado em dois navegadores ao mesmo
  tempo.
  **PIN do Cofre implementado na sequência (11/09/2026, ver
  `docs/decisions/central-seguranca-pin-design.md`)** — terceiro sub-projeto da Central de
  Segurança, junto com a evolução da barreira do Cofre da Vex de bloqueio total pra "autorizar com
  PIN". PIN destrava só o Cofre de Documentos (não é login do app), validado no servidor via
  `profiles.pin_hash` (`pgcrypto`, bcrypt) + `has_security_pin`/`set_security_pin`/
  `verify_security_pin` (`security definer`). PIN de 6 dígitos mínimo; 5 tentativas erradas
  bloqueiam por 5 minutos. Dois bugs reais corrigidos durante o teste: (1) recriar
  `set_security_pin` com uma assinatura diferente (`current_pin` novo) criou um *overload* em vez
  de substituir — a versão antiga sem exigir PIN atual ficou viva em paralelo, corrigido com `drop
  function` explícito antes; (2) `set_security_pin` não conferia o bloqueio de tentativas ao
  validar o PIN atual, abrindo uma segunda porta pra força bruta contornando o limite do
  `verify_security_pin` — corrigido. Novo `packages/auth/src/pin.ts`+`usePin.ts`; seção "PIN do
  Cofre" em `/seguranca`. `@qqorvex/module-documentos` ganhou `toggleVault()` + hook + botão
  "Marcar no Cofre" no `DocumentCard`; `/documentos` mascara documentos do Cofre ("🔒 Documento no
  Cofre", sem nome/ações) até desbloquear com o PIN (estado de sessão de navegação, não persiste).
  Na Vex, `toggle_important_by_name` ganhou `pin` opcional — documento do Cofre sem PIN certo
  continua recusado, mas agora com PIN correto (verificado no servidor, nunca comparado na
  ferramenta) a ação é permitida; `list_documents` continua sempre excluindo o Cofre da listagem.
  PIN pedido na própria conversa (reaproveita o mecanismo de "pergunte o que falta" da Fase 4),
  não numa etapa de confirmação separada — trade-off aceito conscientemente (fica registrado no
  histórico da conversa, mas o histórico já é 100% privado por RLS). Testado ao vivo contra o
  Supabase real simulando `auth.uid()` via `set_config`: cadastro, verificação certa/errada,
  contador de tentativas, bloqueio na 5ª tentativa, PIN correto continuando recusado enquanto
  bloqueado, troca de PIN exigindo o atual em todos os cenários — tudo restaurado ao estado
  original ao final. Typecheck e build limpos. **Ainda sem teste de clique real na UI** — fica pro
  usuário. Com isso, os 3 sub-projetos identificados da Central de Segurança (sessões/dispositivos,
  PIN, integração com a Vex) estão implementados; sessões/dispositivos completas e "desbloqueio
  geral do app" (diferente do PIN do Cofre) continuam fora do escopo atual, se algum dia fizerem
  sentido como pendência separada.
- `modules/hoje` (`@qqorvex/module-hoje`): agregador puro via `registerHojeProvider()` /
  `useHojeSummary()`; Hoje nunca importa módulos de domínio diretamente.
- `modules/organizacao/tarefas` (`@qqorvex/module-tarefas`): primeiro módulo de domínio real.
  Kanban de exatamente 3 estados (`nao_iniciado`/`em_andamento`/`concluido`); "atrasada" e
  "bloqueada" são condições calculadas em `service.ts` (`deriveTaskConditions`), nunca estados
  extras persistidos; `wouldCreateCycle()` valida dependências antes de inserir; captura rápida
  exige só título; `createTasksHojeProvider()` alimenta o Hoje (tarefas de hoje/atrasadas/em
  andamento/alta prioridade) sem acoplar os dois módulos. UI: `QuickCapture`, `KanbanBoard`,
  `TaskCard` com drag & drop entre colunas via `@dnd-kit/core` (10/09/2026) — os botões "mover
  para" continuam como alternativa acessível/touch, não foram removidos.
- Fontes oficiais (Space Grotesk, Manrope, JetBrains Mono) auto-hospedadas em
  `packages/design-system/src/fonts` (subsets latin/latin-ext), sem CDN externo em runtime.
- `modules/organizacao/agenda` (`@qqorvex/module-agenda`): segundo módulo de domínio. Semana
  reduzida com seleção de dia (`WeekStrip`) + timeline do dia (`DayAgenda`); captura rápida de
  evento com toggle de dia inteiro (`QuickEventForm`); `findConflicts()` detecta sobreposição
  (considerando buffers) e exige confirmação explícita ("criar mesmo assim" / "escolher outro
  horário"), nunca bloqueia silenciosamente; `findFreeSlots()` calcula janelas livres num
  intervalo, pronta para a Vex responder "tenho horário livre?"; `createAgendaHojeProvider()`
  alimenta o Hoje com eventos do dia sem acoplar os módulos.
- `modules/organizacao/metas-habitos` (`@qqorvex/module-metas-habitos`): terceiro módulo de
  domínio. Hierarquia de meta limitada a principal+submeta (`canBeSubGoal()`, validado em TS, não
  no banco); progresso "por marcos" calculado via `computeMilestoneProgress()`; progresso
  "derivado" mostra estado indisponível em vez de simular valor (Finanças ainda não existe);
  `computeCurrentStreak()` calcula sequência de hábito de forma neutra (sem score de disciplina);
  registro de hábito é upsert por dia (não duplica ao registrar de novo); `createGoalsHabitsHojeProvider()`
  alimenta o Hoje com metas de prazo próximo e hábitos previstos para hoje.
- `modules/conhecimento/estudos` (`@qqorvex/module-estudos`): quarto módulo de domínio. Algoritmo
  de repetição espaçada (variante SM-2) isolado em `computeNextReview()` — trocável sem tocar
  schema/histórico, como o Xmind exige; hierarquia de tópico limitada a 1 nível
  (`canBeSubTopic()`); `createEstudosHojeProvider()` alimenta o Hoje com contagem de flashcards
  vencidos e avaliações dos próximos 7 dias.
- `modules/conhecimento/segundo-cerebro` (`@qqorvex/module-segundo-cerebro`): quinto módulo de
  domínio. `evaluateFormula()` é um parser/avaliador próprio (tokenizer + parser recursivo,
  sem `eval`/`Function`) para a Fórmula Simples das Bases — testado diretamente com
  `node --experimental-transform-types` contra o arquivo real (9 casos, incluindo rejeição de
  `require(...)`). `page_links` dá backlinks (query por `target_page_id`) sem duplicar dado.
  `base_pages` é só membership — página continua existindo fora da Base. `createSegundoCerebroHojeProvider()`
  só mostra páginas favoritadas (o módulo não exige card no Hoje).
- `modules/conhecimento/biblioteca` (`@qqorvex/module-biblioteca`): sexto módulo de domínio.
  `computeProgressPercent()` deriva percentual de progresso numérico/percentual sem inventar
  valor quando o dado não existe; ciclos de consumo (`library_consumption_cycles`) permitem
  reler/reassistir sem duplicar o item; `createBibliotecaHojeProvider()` só mostra "Continuar: X"
  quando há item em andamento — não vira feed. UI: `GalleryGrid`, única visualização (sem
  Lista/Tabela/Kanban paralelos, conforme o Xmind).
- `modules/gestao/documentos` (`@qqorvex/module-documentos`): sétimo módulo de domínio, primeiro
  a usar Supabase Storage de verdade. `uploadDocument()` faz upload real + insere metadados numa
  operação; `deleteDocument()` remove o objeto físico e a linha juntos; `getDownloadUrl()` gera
  URL assinada de 10 min. `computeWarrantyEndDate()` é puro (soma meses à data de compra).
  `createDocumentosHojeProvider()` alimenta o Hoje com garantias/datas importantes nos próximos
  14 dias. Cofre (`is_vault`) é só um marcador — sem reautenticação/criptografia extra ainda.
- `modules/gestao/financas` (`@qqorvex/module-financas`): oitavo módulo de domínio.
  `computeBalances()` (saldo atual/projetado, transferências excluídas dos totais globais),
  `computeNextOccurrenceDate()` e `computeInstallmentAmounts()` são todos puros/testados com os
  exemplos exatos do Xmind. `createFinancasHojeProvider()` alimenta o Hoje com saldo atual e
  cobranças dos próximos 7 dias.
- App (`apps/qqorvex`): `/login` funcional, `/`, `/tarefas`, `/agenda`, `/metas-habitos`,
  `/estudos`, `/estudos/:notebookId`, `/segundo-cerebro`, `/segundo-cerebro/:pageId`,
  `/biblioteca`, `/documentos` e `/financas` protegidas por `RequireAuth`, `QueryClientProvider`
  (TanStack Query) no root, `ModuleRegistrations` registra os providers de Tarefas, Agenda,
  Metas & Hábitos, Estudos, Segundo Cérebro, Biblioteca, Documentos e Finanças no Hoje.
- **`packages/vex`**: `VexProvider` (interface), `EchoProvider` (fallback grátis/local por
  padrão de texto pt-BR), `OllamaProvider` (cliente HTTP real, não presumido rodando —
  nem Ollama nem LM Studio estavam disponíveis neste ambiente ao checar). `runVexTurn()` +
  `confirmVexToolCall()` fazem o Tool Engine + Permission & Safety Engine em miniatura: consulta
  executa direto, mudança persistente exige confirmação explícita (testado com o código real
  contra o Supabase: task só é criada/concluída depois de `confirmVexToolCall`, nunca antes).
  `checkQuerySafety()` é o Query Guard (bloqueio de conteúdo adulto/erótico por padrão de texto).
  Ferramentas cobrem os 8 módulos de domínio — sempre só chamando a API pública dos módulos,
  nunca o Supabase direto (Documentos só tem `list_documents`; upload não é um comando de texto;
  Finanças tem `get_financial_summary`/`create_transaction`, sem tocar recorrência/parcelamento
  por texto ainda). UI: `VexChat` (modal), acionado pelo botão "Falar com a Vex" no Hoje.
  **Fase 1 do "Vex Context Engine" implementada (11/09/2026)** — ver
  `docs/decisions/vex-context-engine-design.md` pro roteiro completo em 7 fases (escopo definido
  via brainstorming com o usuário). Conversas persistidas: novas `vex_conversations`/`vex_messages`
  (migration `20260911000001_vex_conversas.sql`, RLS padrão — mensagem-filha via join à conversa
  dona); só guardamos `role in ('user','assistant')` porque é só isso que `runVexTurn` usa como
  `messages: ChatMessage[]` — mensagens `tool` continuam efêmeras (nunca voltam pro histórico) e a
  nova mensagem `system` (personalidade, `VEX_SYSTEM_PROMPT` em `packages/vex/src/personality.ts`)
  é montada em runtime a cada chamada, nunca persistida. Novo diretório
  `packages/vex/src/conversations/` (`repository.ts` + `hooks.ts`, mesmo padrão TanStack Query dos
  demais módulos) expõe listar/criar/renomear/apagar conversa e listar/anexar mensagem.
  `VexChat.tsx` ganhou uma lista retrátil de conversas (botão ☰ no cabeçalho): trocar de conversa
  recarrega o histórico do banco, "Nova conversa" começa vazia (só cria a linha no primeiro envio),
  renomear é inline. Antes não existia nenhuma mensagem `system` — a Vex respondia sem nenhuma
  instrução de tom; agora ela tem personalidade definida (conversa natural, nunca inventa dado
  faltante, nunca finaliza mudança persistente sem confirmação). Indicador "digitando..." (3
  pontinhos animados) enquanto aguarda o provider ou a execução de uma ferramenta. Testado ao vivo
  contra o Supabase real (conversa + 2 mensagens inseridas, lidas via join, `on delete cascade`
  confirmado ao apagar a conversa). Typecheck e build limpos. **Ainda sem teste de clique real na
  UI** (fica pro usuário testar no navegador).
  **Fase 2 implementada na sequência (11/09/2026)**: nova rota-layout `ProtectedLayout`
  (`RequireAuth`+`Outlet`+`VexPanel`) substitui o `RequireAuth` repetido em cada uma das 13 rotas de
  `App.tsx` — é onde a aba fixa da Vex passa a existir, visível em toda página autenticada (menos
  na própria `/vex`). O antigo modal `VexChat` foi removido; o corpo do chat virou
  `VexConversationView` (`apps/qqorvex/src/vex/`, sem chrome de janela), decorado por `VexPanel`
  (aba retrátil na borda direita, conteúdo ainda `lazy()` pelos mesmos 8 módulos de ferramentas
  pesados de sempre) e pela nova página `VexPage` (rota `/vex`, chrome de tela cheia com "Voltar
  para Hoje" igual às outras páginas). Novo `VexSessionContext` compartilha
  `activeConversationId` entre painel e página — abrir uma conversa num ponto de entrada e
  continuar no outro sem perder o fio (o histórico em si já vinha do banco desde a Fase 1). O
  botão "Falar com a Vex" na Hoje agora navega pra `/vex` em vez de abrir modal. Typecheck e build
  limpos; `VexConversationView` confirmado como chunk separado no bundle de produção. **Ainda sem
  teste de clique real na UI** (fica pro usuário testar no navegador).
  **Fase 3 implementada na sequência (11/09/2026)**: correção de premissa encontrada ao construir —
  nem `TaskCard` nem `DocumentCard` tinham "expandir" (cards sempre totalmente visíveis), então o
  gatilho de "item em foco" virou clicar no corpo do card (fora de botões/alça de arrastar), com
  destaque visual (borda cyan). Novo `CurrentItemContext` (`apps/qqorvex/src/vex/`) —
  `{type: "tarefa"|"documento", id, label} | null`, provido no `ProtectedLayout`, limpo
  automaticamente a cada troca de rota (nunca sobrevive a navegar pra outro módulo). `TaskCard`/
  `KanbanBoard`/`DocumentCard` ganharam `isFocused`/`onFocus` como props simples — os módulos não
  conhecem a Vex, só as páginas do app (`Tarefas.tsx`/`Documentos.tsx`) ligam ao Context.
  `VexConversationView` injeta o item em foco como mensagem `system` extra a cada chamada (nunca
  persistida): "Contexto atual: a pessoa está vendo a Tarefa 'X' (id: ...) na tela agora" — dá ao
  modelo o ID literal pra usar. Nova ferramenta `update_task_by_id` (edita título/prazo/status por
  ID exato, diferente de `complete_task_by_title` que só existia por aproximação de texto) + nova
  `updateTask()` em `@qqorvex/module-tarefas` (atualização genérica por ID) provam o fluxo de ponta
  a ponta com o exemplo original do usuário ("muda o prazo disso pra amanhã"). Documentos ganhou só
  o rastreamento — ferramenta de edição de documento é escopo da Fase 5. Testado ao vivo contra o
  Supabase real (update de prazo+status+completed_at, dado de teste removido ao final). Typecheck e
  build limpos; sem migration. **Ainda sem teste de clique real na UI** (fica pro usuário testar no
  navegador).
  **Fase 4 implementada na sequência (11/09/2026)**: ao investigar o exemplo original do usuário
  ("100 reais" faltando motivo/entrada-saída/recorrência), descobri que `create_transaction` já
  exigia `name`/`amount`/`transactionType` no schema — 2 dos 3 campos já eram obrigatórios. O que
  faltava de verdade era recorrência: `recurring_transactions` existe no banco, mas nenhuma
  ferramenta a toca. `create_transaction` ganhou `isRecurring` (obrigatório); se `true`, não cria
  nada — explica que recorrência ainda não é criável pelo chat (fica pra Fase 5, que vai cobrir
  ferramentas novas de verdade) e oferece criar só o avulso de hoje. `VEX_SYSTEM_PROMPT` ficou mais
  diretivo (todos os módulos): antes de chamar ferramenta que cria/altera algo, conferir se todos
  os dados pedidos estão na conversa — se faltar algo, perguntar em vez de chamar a ferramenta. O
  mecanismo real continua sendo o `parameters.required` de cada ferramenta (já existia); o prompt é
  o que reforça o modelo respeitar isso e não inventar valor. Typecheck e build limpos; sem
  migration.
  **Fase 5 implementada na sequência (11/09/2026)**: "cobertura completa" de verdade seria um
  escopo enorme de uma vez (cada módulo tem dezenas de funções de repository nunca expostas à
  Vex) — escolhi um lote focado de uma ação nova por módulo, sempre reaproveitando função já
  existente (sem capacidade nova no banco): `delete_event_by_title` (Agenda, usa `deleteEvent`),
  `update_goal_status_by_title` (Metas & Hábitos, usa `updateGoalStatus`), `delete_notebook_by_name`
  (Estudos, usa `deleteNotebook`, cascata já apaga resumos/flashcards relacionados),
  `archive_page_by_title` (Segundo Cérebro, usa `archivePage`), `update_library_item_status_by_title`
  (Biblioteca, usa `updateItemStatus`), `toggle_important_by_name` (Documentos, usa
  `toggleImportant`), `create_recurring_transaction` (Finanças, usa `createRecurringTransaction`
  já existente) — esta última fecha o gancho deixado na Fase 4: `create_transaction` com
  `isRecurring: true` agora orienta o modelo a chamar essa ferramenta nova (pede a frequência)
  em vez de só recusar. Tarefas ficou fora do lote por já estar bem coberta desde a Fase 3
  (`update_task_by_id`). Todas exigem confirmação. Testado ao vivo contra o Supabase real
  (`is_archived` em página e `recurring_transactions` inserida/removida, dados de teste removidos
  ao final — as demais reaproveitam funções de repository já testadas em sessões anteriores).
  Typecheck e build limpos; sem migration.
  **Fase 6 implementada na sequência (11/09/2026)**: toda a capacidade de "guardar conteúdo" pro
  exemplo original (Tarefa, Segundo Cérebro, Estudos, Documentos) já existia nos repositories —
  só faltava expor como ferramenta. `create_task` ganhou `description` opcional (campo já existia,
  nunca exposto). Novas `create_page_with_content` (Segundo Cérebro — cria página + bloco de texto,
  reaproveita `createPage`+`createBlock`), `create_summary_by_notebook_name` (Estudos — acha o
  Caderno pelo nome via `listNotebooks`, cria com `createSummary`; se não achar, pergunta se quer
  criar um Caderno novo em vez de inventar um), `create_text_document` (Documentos — transforma o
  texto num `Blob` de verdade e reaproveita `uploadDocument`, mesma deduplicação por hash). Ganhou
  `userId` como novo parâmetro de `createDocumentosTools()` (antes só recebia o client — o módulo
  de Documentos era o único sem escrita real disparada pela Vex). `VEX_SYSTEM_PROMPT` generaliza
  "pesquisa livre → pedir pra salvar como algo concreto" para qualquer módulo, não só Estudos
  (correção pedida pelo usuário no brainstorming original desta fase). Biblioteca ficou de fora —
  é sobre rastrear itens de mídia, não guardar corpo de texto. Testado ao vivo contra o Supabase
  real (página+bloco de texto e Resumo em Caderno, inseridos e removidos). `create_text_document`
  não foi testado via clique real (depende de upload real no Storage) — reaproveita `uploadDocument`
  já testado extensivamente em sessões anteriores, o que é novo é só o wrapper texto→Blob. Typecheck
  e build limpos; sem migration.
  **Fase 7 implementada na sequência (11/09/2026) — última fase do roteiro**: descoberta ao
  investigar — `documents.is_vault` já existe como coluna no banco, mas nenhuma UI ainda permite
  marcar um documento como Cofre, então esta é uma barreira preventiva, não a correção de um risco
  já explorável hoje. `list_documents` passou a excluir documentos com `is_vault: true` da
  listagem — a Vex nunca menciona a existência deles por padrão. `toggle_important_by_name` confere
  `is_vault` do documento encontrado antes de agir e recusa se for `true` (o `listDocuments()`
  interno dessa ferramenta busca em todos os documentos, não só nos não-Cofre, por isso precisava
  do próprio check). Sem mecanismo de "autorizar no momento" — construir uma liberação segura de
  verdade depende de reautenticação real (Central de Segurança, que ainda não existe); fingir uma
  autorização sem essa infraestrutura seria menos seguro que simplesmente recusar, então até lá o
  Cofre é bloqueio total para a Vex. Testado ao vivo contra o Supabase real (documento fake com
  `is_vault: true` inserido e removido ao final). Typecheck e build limpos; sem migration.
  **Com isso, as 7 fases do roteiro do Vex Context Engine
  (`docs/decisions/vex-context-engine-design.md`) estão implementadas.** Nenhuma foi testada via
  clique real na UI pelo usuário ainda — fica para o próximo lote de testes. Trabalho futuro sobre
  a Vex deve começar por uma nova rodada de brainstorming, não como continuação implícita deste
  roteiro.

## Pendências técnicas conscientes (simplificações do v1, não esquecidas)
- **Tarefas recorrentes implementadas (12/09/2026, escopo definido via brainstorming — ver
  `docs/decisions/tarefas-recorrentes-design.md`)**: primeiro dos dois sub-projetos de
  "recorrência" adiados desde a sessão original (eventos recorrentes fica para depois, sub-projeto
  independente — módulo diferente). Frequências diária/semanal/mensal (sem dias específicos da
  semana, mesmo corte já feito em Hábitos). Nova `recurring_tasks` (RLS padrão própria linha;
  `recurring_status` reaproveitado de Finanças, não recriado) + `computeNextTaskOccurrenceDate()`
  (`module-tarefas/service.ts`) + `generateTaskOccurrence()` (repositório). Diferente do padrão
  manual de Finanças ("Gerar cobrança agora"), aqui a geração é **automática via cron**: a Edge
  Function `send-notifications` (já roda a cada 5 min) ganhou uma 5ª fonte que gera a ocorrência e
  avisa por push, reimplementando `computeNextTaskOccurrenceDate()` linha por linha (verificado
  idêntico contra a função original antes de embutir, mesmo padrão da fonte de fatura de cartão).
  Tarefa gerada é independente da recorrência depois de criada. Novo `RecurringTasksPanel` em
  `/tarefas` (aba "Recorrentes"). Testado isoladamente (8 checks) e ao vivo em produção via `curl`
  direto na Edge Function: geração com `due_date` correto, avanço da data, catch-up incremental
  correto, recorrência pausada corretamente ignorada. Usuário recebeu 3 notificações de teste
  reais (mesmo padrão já aceito nesta sessão pra orçamento/hábito). Dados de teste removidos.
  Typecheck e build limpos. **Ainda sem teste de clique real na UI** — fica pro usuário.
  **Eventos recorrentes implementados na sequência (12/09/2026, ver
  `docs/decisions/eventos-recorrentes-design.md`)** — segundo e último sub-projeto de
  "recorrência", mesma arquitetura de Tarefas adaptada à Agenda. Reaproveita os enums
  `task_recurrence_frequency`/`recurring_status` (sem duplicar). Decisão-chave: geração automática
  colidindo com outro evento **cria mesmo assim e avisa por push** (não há ninguém pra confirmar
  "criar mesmo assim"/"escolher outro horário" — fluxo manual — no momento do cron); a Edge
  Function reimplementa `findConflicts()` (overlap + buffers) só pra escolher a mensagem, nunca pra
  bloquear. Sincronização com Google Calendar não precisou de nenhuma mudança — a ocorrência
  gerada é só mais uma linha em `events`, o `sync-google-calendar` já a pega sozinho. Nova
  `recurring_events` (`start_time`/`end_time` guardam só a hora; a data vem de
  `next_occurrence_date`) + `computeNextEventOccurrenceDate()` + `generateEventOccurrence()`.
  `send-notifications` ganhou uma 6ª fonte. Novo `RecurringEventsPanel` em `/agenda` (aba
  "Recorrentes"). Testado isoladamente (7 checks, incluindo verificação cruzada do conflito contra
  `findConflicts()` original) e ao vivo em produção via `curl`: geração com horário correto,
  criação mesmo com conflito forçado (confirmando a decisão de produto), recorrência pausada
  ignorada. Usuário recebeu 2 notificações de teste reais. Dados de teste removidos. Typecheck e
  build limpos. **Ainda sem teste de clique real na UI** — fica pro usuário. Com isso, os dois
  sub-projetos de recorrência adiados desde a sessão original estão implementados.
- **Tarefas — "Todas as Tarefas" + Tags & Filtros implementadas** (11/09/2026, autônomo):
  descoberta explícita da própria spec (Kanban só cobria Caixa de Entrada + 3 estados +
  Subtarefas/Checklist + Dependências, sem lugar nenhum pra ver canceladas ou subtarefas, nem
  filtrar por tag/prioridade). Novo `listAllTasks()` (sem os filtros `is_cancelled`/
  `parent_task_id` de `listActiveTasks()`, que continua intocado — Kanban não muda em nada) +
  `updateTaskCancelled()` (cancelar não é um estado do Kanban, é só a flag `is_cancelled` — agora
  gerenciável, antes não tinha UI nenhuma pra isso). Novo hook `useAllTasks` (chave de query
  `["tasks", "all"]`, prefixo de `["tasks"]` — as mutations já existentes invalidam ela de graça,
  sem precisar tocar em nenhuma). Correção de um bug real encontrado ao construir isso:
  `deriveTaskConditions()` calculava "atrasada" sem checar `is_cancelled` — nunca dava pra
  perceber antes porque `listActiveTasks()` sempre excluía canceladas antes de chegar nessa
  função; uma tarefa cancelada com prazo vencido não deveria aparecer como "atrasada". Novo
  componente `TaskListView` (filtro por status/prioridade/tag + checkbox "mostrar canceladas",
  lista plana com badges de atrasada/bloqueada/cancelada e tags). `/tarefas` ganhou abas
  Kanban/Todas as Tarefas. Testado ao vivo contra o Supabase real (tarefa atrasada com tags +
  tarefa cancelada, ambas inseridas e removidas) e **confirmado pelo usuário no navegador em
  11/09/2026**. Typecheck e build limpos. Sem migration —
  reaproveita só as policies de RLS já existentes em `tasks`. Visões Inteligentes, Modelos,
  Planejamento assistido pela Vex e Histórico/Arquivo continuam fora do escopo (dependem de mais
  definição de produto ou da Vex ter mais capacidades).
- **Agenda — Calendário Completo (Dia/Semana/Mês/Lista) implementado** (10/09/2026): seletor de
  visão na página `/agenda`. `WeekView` mostra a semana inteira com os eventos de cada dia já
  visíveis (não só a tira de seleção da `WeekStrip`, mantida para a visão Dia); `MonthView` é uma
  grade de 6 semanas (dias fora do mês esmaecidos mas clicáveis, ponto indicando dia com evento,
  clicar num dia leva para a visão Dia); `ListView` agrupa cronologicamente por data os próximos
  60 dias a partir da data selecionada. Todas reaproveitam `listEventsInRange()` (já existia,
  genérica por intervalo) e os novos utilitários puros em `dateUtils.ts`
  (`startOfWeek`/`endOfWeek`/`startOfMonth`/`endOfMonth`/`addDays`/`addMonths`/`isSameDay`),
  testados diretamente (11 checks: virada de semana/mês/ano, grade de 6 semanas cobrindo o mês
  inteiro).
- **Agenda — Reuniões dedicadas implementadas** (10/09/2026): não é uma entidade nova — reaproveita
  `events.category`/`events.meeting_link`, que já existiam sem UI. `QuickEventForm` ganhou seletor
  de categoria (Compromisso/Reunião/Prazo/Pessoal) e, quando a categoria é "Reunião", um campo de
  link opcional — continua a mesma captura rápida, então passa pela mesma checagem de conflito
  (`findConflicts`) das demais categorias, sem formulário paralelo. Nova aba "Reuniões" na página
  (5ª visão, ao lado de Dia/Semana/Mês/Lista) mostra `MeetingsView`: só eventos com
  `category === "reuniao"`, agrupados por dia, com botão "Entrar" abrindo o link em nova aba.
  Testado ponta a ponta contra o Supabase real (4 checks): reunião persistindo category+
  meeting_link corretamente, filtro por categoria isolando só as reuniões (compromisso comum não
  aparece). Ainda sem integrações Google Calendar/Meet/Zoom (precisam de OAuth apps e credenciais
  externas — decisão que depende do usuário).
- **Infraestrutura de notificações (Web Push + pg_cron + Edge Function) implementada**
  (10/09/2026, autônomo): "Lembretes têm tabela (`event_reminders`) mas nada os dispara" —
  agora dispara de verdade, sem nenhum serviço pago (Web Push é protocolo aberto; só precisa de
  um par de chaves VAPID, geradas localmente). Novas tabelas `push_subscriptions` (inscrição de
  cada dispositivo, RLS por dono) e `app_secrets` (chaves VAPID + segredo do cron — RLS ativada
  sem nenhuma policy pra anon/authenticated, só o `service_role` da Edge Function consegue ler;
  o advisor acusa "RLS enabled no policy" mas é intencional). `event_reminders` ganhou `sent_at`
  pra nunca notificar 2x. Extensões `pg_cron`/`pg_net` habilitadas (`pg_net` na schema
  `extensions`, corrigindo o aviso do advisor de "extension in public"). Edge Function
  `send-notifications` (Deno, `supabase/functions/send-notifications/index.ts`) roda a cada 5 min
  via `cron.schedule` (agendado direto no banco, não versionado — contém o segredo do cron em
  texto puro na definição do job, então não devia ir pro arquivo de migration); autentica por
  header `X-Cron-Secret` comparado contra `app_secrets` (não por JWT — por isso implantada com
  `verify_jwt=false`, uso explicitamente previsto pela própria ferramenta de deploy pra funções
  com autenticação própria); usa `npm:web-push` (import direto, sem precisar reimplementar
  VAPID/aes128gcm na mão) e a `SUPABASE_SERVICE_ROLE_KEY` que o runtime da função já injeta
  sozinho (não precisei configurar nenhum secret manualmente). Cliente: novo pacote
  `@qqorvex/notifications` (`isPushSupported`/`registerServiceWorker`/`subscribeToPush`/
  `savePushSubscription`/`unsubscribeCurrentDevice`, hook `useNotifications`), service worker em
  `apps/qqorvex/public/sw.js`, seção "Notificações" em `/seguranca` com botão "Ativar
  notificações". Agenda ganhou o elo que faltava: `QuickEventForm` agora tem um seletor de
  lembrete (5 min/15 min/30 min/1h/1 dia antes) que cria o `event_reminders` junto com o evento
  (`createEvent()` faz os dois numa chamada). Testado: a Edge Function foi chamada de verdade em
  produção (segredo errado → 401; segredo certo → 200) e, com um evento e lembrete reais, um
  lembrete "vencido" foi corretamente identificado, processado e marcado como enviado (`sent_at`
  preenchido) enquanto um lembrete de um evento 3 dias no futuro corretamente não foi tocado; uma
  inscrição push falsa (chaves inventadas) foi tratada sem quebrar a função (erro engolido, sem
  crash) — confirma que uma inscrição inválida de um usuário não trava o processamento dos
  demais. O cron já rodou sozinho em produção com sucesso (`cron.job_run_details`). **Confirmado
  de ponta a ponta em 11/09/2026**: usuário ativou notificações de verdade em `/seguranca`
  (inscrição real gravada em `push_subscriptions`), foi criado um evento+lembrete de teste já
  vencido, a Edge Function foi disparada manualmente (`notificationsSent: 1`) e o usuário
  confirmou que a notificação apareceu no dispositivo. Evento de teste removido ao final — a
  inscrição push real do usuário permanece ativa para uso normal. Sem pendência.
  Outras fontes de notificação (hábitos, orçamento, garantias) podem ser adicionadas depois como
  mais uma consulta na mesma Edge Function, sem mudar o schema.
- **Metas & Hábitos — Rotinas implementadas** (10/09/2026): novas tabelas `routines` +
  `routine_habits` (migration `20260909000012_routines.sql`, RLS completa, junção N:N no mesmo
  padrão de `goal_habit_relations` — Rotina nunca copia o hábito, só referencia).
  `RoutinesPanel` permite criar rotina, adicionar/remover hábitos existentes e marcar
  Concluído/Parcial/Pulado do dia para todos os hábitos da rotina de uma vez (reaproveita
  `logHabit()`, que já era upsert por dia). Testado ponta a ponta contra o Supabase real (13
  checks): PK composta rejeitando relação duplicada, hábito sobrevivendo à remoção da rotina e à
  exclusão da própria rotina (cascata só na relação), upsert por dia funcionando dentro da rotina.
  Usuário e dados de teste removidos ao final. Ainda sem Revisão Semanal nem Insights descritivos
  — "recursos opcionais" no Xmind. **Relação meta↔hábito exposta na UI** (11/09/2026, autônomo):
  `goal_habit_relations` já existia no banco desde a sessão anterior, mas nada nunca lia/escrevia
  nela pela UI. Novo `unlinkGoalHabit()` (só existia `linkGoalHabit`/`listGoalHabitRelations`) +
  hooks `useGoalHabitRelations`/`useLinkGoalHabit`/`useUnlinkGoalHabit`. `GoalCard` ganhou seção
  "Hábitos vinculados" (vincular/desvincular), mesmo padrão de UI embutida já usado pros marcos
  dentro do próprio card e pra `RoutineCard` com hábitos de rotina. Testado ao vivo contra o
  Supabase real (meta+hábito+vínculo criados e removidos). Typecheck e build limpos. Sem
  migration. **Confirmado pelo usuário no navegador em 11/09/2026.** "Sugerir tarefas a partir de
  marco" e qualquer decomposição fica para quando a Vex tiver essa capacidade.
- **Progresso "derivado" de Finanças implementado (12/09/2026, escopo definido via
  brainstorming — ver `docs/decisions/metas-progresso-derivado-design.md`)**: `progress_type =
  'derivado'` nunca funcionou de verdade — `GoalCard` mostrava "indisponível (módulo de origem
  ainda não existe)" desde quando Finanças de fato não existia. Decisão: meta derivada acompanha o
  **saldo absoluto de uma Conta específica** vs. um valor-alvo (não "quanto foi acrescentado desde
  a criação da meta" — mais simples). Nova coluna `goals.progress_source_account_id` (`on delete
  set null`, mesmo padrão de `task_id`/`assessment_id`); `progress_numeric_target` (já existia,
  nunca usado) virou o valor-alvo. Nova `computeAccountBalance()` em
  `@qqorvex/module-financas/service.ts` (soma entrada/saída/transferência da conta, só transações
  `concluida`) e `computeDerivedProgress()` em `@qqorvex/module-metas-habitos/service.ts`.
  `@qqorvex/module-metas-habitos` passou a depender de `@qqorvex/module-financas` diretamente
  (mesmo precedente de Estudos importando Agenda/Biblioteca). Novo `updateGoalProgressSource()` +
  hook; `GoalCard` ganhou seção "Progresso financeiro" (vincular Conta+alvo, ou ver saldo/percentual
  e desvincular), mesmo padrão de UI embutida de Marcos/Hábitos vinculados — configurado dentro do
  card já criado, não na captura rápida (`NewGoalForm` continua só título, regra do Xmind). Testado
  isoladamente (9 checks: saldo com transferência entre contas, transação futura ignorada,
  percentual capado/piso, alvo zero/negativo) e ao vivo contra o Supabase real (`on delete set
  null` confirmado — apagar a Conta preserva a meta). Typecheck e build limpos. **Ainda sem teste
  de clique real na UI** — fica pro usuário.
- **Estudos — Quiz/Testes gerados pela Vex implementado** (11/09/2026, autônomo, escopo definido
  via brainstorming — ver `docs/decisions/estudos-quiz-design.md`): era o outro item do backlog
  deixado de lado quando o usuário escolheu o Vex Context Engine primeiro; agora que a Vex tem
  tool-calling real, ficou possível. Quiz é uma entidade nova (diferente de `assessments`, que é só
  um registro manual de prova externa, sem conteúdo). Novas `quizzes`/`quiz_questions`/
  `quiz_attempts` (migration `20260911000002_estudos_quiz.sql`, RLS via join ao Caderno dono nas
  duas primeiras, `user_id` direto na terceira). Fonte do conteúdo: os Resumos já escritos no
  Caderno; formato fixo de 5 perguntas de múltipla escolha, 4 alternativas cada; retentativas
  guardam histórico de tentativas. Só a Vex gera (`generate_quiz_by_notebook_name` em
  `packages/vex/src/tools/estudosTools.ts`) — nunca um botão direto no módulo, pra não quebrar a
  regra "a Vex nunca é chamada de dentro de um módulo". Decisão técnica: em vez de pedir pro modelo
  preencher um schema aninhado grande (array de perguntas) como argumento de tool-call — onde
  modelos locais pequenos falham com mais frequência — a ferramenta recebe só o nome do Caderno e
  faz uma **segunda chamada dedicada ao `provider.chat()`, sem tools**, pedindo o quiz em JSON como
  texto livre; `parseGeneratedQuiz()` (novo, `service.ts`) valida o formato antes de persistir
  qualquer coisa (nunca confia cegamente no LLM). Sem Resumo no Caderno, a ferramenta recusa a
  gerar do zero. Novo `computeQuizScore()` (puro) corrige no cliente. UI: seção "Quizzes" em
  `EstudosCadernoPage` (lista simples, sem formulário de criação — só leitura+responder) com
  `QuizTakingForm` (novo componente, rádio-buttons por alternativa, feedback de certo/errado após
  corrigir). Testado ao vivo contra o Supabase real (quiz+perguntas+tentativa inseridos,
  `correct_option_index` fora de 0–3 rejeitado, cascata do Caderno removendo tudo, dados de teste
  removidos ao final) e `computeQuizScore()`/`parseGeneratedQuiz()` testados isoladamente (10
  checks). Typecheck e build limpos. **Geração real via Ollama (fim a fim) ainda não testada** —
  mesma limitação de sempre pra testar `runVexTurn` fora do Vite; fica pro usuário pedir um Quiz de
  verdade no chat. Study Capability Pack por área (Tecnologia, Matemática, Saúde etc.) continua
  fora do escopo — é um conceito mais amplo que uma única feature. Editor de resumo é `<textarea>`
  simples (o Xmind pede suporte a tabelas/imagens/fórmulas/links internos — fica para quando houver
  um editor rich-text real no Design System). Sem Materiais & Referências (relação com Biblioteca/
  Documentos/Segundo Cérebro/Ideias — nenhum desses módulos existe ainda) nem Avaliações gerando
  evento derivado na Agenda (Agenda existe, mas essa integração cross-module ainda não foi ligada).
- **Segundo Cérebro — Grafo de Conhecimento (visual) implementado** (10/09/2026): reaproveita
  `pages`/`page_links` que já existiam (nenhuma migration nova — o grafo é só uma visualização
  sobre o schema atual). `listAllPageLinks()` traz todos os links do usuário (RLS já isola por
  dono via join); `GraphView` calcula o layout com `d3-force` (simulação de 300 ticks, sem
  interatividade de arrastar na v1) e desenha nós/arestas em SVG puro — clicar num nó navega para
  a página. Alternância Lista/Grafo na página `/segundo-cerebro`. Testado ponta a ponta contra o
  Supabase real (7 checks: link aparece via RLS, página isolada não aparece em nenhum link,
  backlink correto, apagar a página de origem remove o link em cascata sem apagar a página
  referenciada) + teste isolado da simulação de forças (3 checks: nenhuma posição `NaN`, nós não
  colapsam no mesmo ponto, nó isolado não fica sobreposto aos ligados).
- **Segundo Cérebro — Nota do Dia implementada** (11/09/2026, autônomo): não é entidade nova —
  reaproveita `pages` com `page_type = "nota_do_dia"` e título = data ISO (`formatDailyNoteTitle`),
  usado como chave de idempotência. `getOrCreateDailyNote()` segue o mesmo padrão de
  `createEventForAssessment`/`getOrCreateCurrentStatement`: reabrir no mesmo dia sempre volta pra
  mesma página, nunca duplica. Botão "Nota do Dia" na página Hoje (`useEnsureDailyNote`) cria/abre
  e navega direto pra `/segundo-cerebro/:pageId`. **Ainda sem teste ponta a ponta contra o
  Supabase real** (fica pro lote de testes que precisam do usuário — ver seção de bloqueios).
- **Segundo Cérebro — Bases (UI) + Views persistidas implementadas** (11/09/2026, autônomo):
  descoberta ao mexer nisso — o repositório já tinha `listBases`/`createBase`/`listBasePages`/
  `addPageToBase`/`listBaseFormulas`/`createBaseFormula` de uma sessão anterior, mas **nenhuma UI
  jamais usou essas funções**; implementei a tela inteira agora (não só "persistir a view" como o
  pendente original sugeria). Nova coluna `bases.view_config` (jsonb, uma view por Base na v1, não
  múltiplas views nomeadas) guarda ordenação (`sortByProperty`/`sortDirection`) e filtro por texto
  (`filterText`) — `updateBaseViewConfig()`. `BasesPanel` (aba "Bases" em `/segundo-cerebro`, ao
  lado de Lista/Grafo): criar/excluir Base, adicionar/remover página, criar/remover fórmula (`key`
  + expressão), tabela mostrando cada página com uma coluna calculada por fórmula (reaproveita
  `evaluateFormula`/`buildFormulaContext`, já existentes e testados em sessão anterior — nenhum
  motor novo). Ordenar por uma fórmula e filtrar por título persistem automaticamente
  (`onChange`/`onBlur`) e voltam a valer ao reabrir a Base. **Ainda sem teste ponta a ponta contra
  o Supabase real** (fica pro lote de testes que precisam do usuário).
  **Histórico de Versões/Checkpoints implementado (12/09/2026, escopo definido via
  brainstorming — sem Xmind disponível nesta sessão, mesmo espírito de Vida Pessoal — ver
  `docs/decisions/segundo-cerebro-checkpoints-design.md`)**: checkpoint é manual (botão "Salvar
  checkpoint", não automático a cada edição) e guarda um snapshot completo (título + todos os
  blocos) da página naquele momento. Nova `page_checkpoints` (RLS via join à página dona).
  `restoreCheckpoint()` segue o mesmo espírito "git revert" de Documentos
  (`restoreDocumentVersion()`): arquiva o estado atual como um checkpoint automático antes de
  aplicar o antigo — nunca é "git reset", nada desaparece do histórico. Novo `CheckpointsPanel` na
  página do Segundo Cérebro. Testado ao vivo contra o Supabase real reproduzindo os passos exatos
  de `restoreCheckpoint()`: checkpoint original salvo, bloco editado, restaurado — confirmado que
  o conteúdo voltou ao original E que os dois checkpoints (original + o automático da versão
  editada) sobreviveram. Cascata ao apagar a página confirmada. Typecheck e build limpos. **Ainda
  sem teste de clique real na UI** — fica pro usuário. Menções não vinculadas/sugeridas pela Vex e
  detecção de duplicatas semânticas continuam fora do escopo — dependem da Vex. Editor de bloco
  continua uma lista simples de texto (sem slash commands, sem os ~18 tipos de bloco ainda com UI
  própria, embora o enum já os suporte no banco). Rollup em Bases está fora do escopo da v1 por
  decisão do próprio Xmind.
- **Biblioteca — Detecção de duplicados implementada** (11/09/2026, autônomo): v1 lean
  consciente — sem ISBN/DOI no schema (o Xmind marca campos ricos por tipo como "evolução
  futura"), então a checagem é por título normalizado (minúsculas + espaços colapsados, sem
  remover acentos) + mesmo `item_type`, puramente client-side contra os itens já carregados na
  tela (diferente de Documentos, que precisa de hash de arquivo e checagem no servidor — aqui não
  há conteúdo binário, e a lista de itens já está em memória via `useLibraryItems`). Novo
  `normalizeTitle()`/`findDuplicateItem()` em `service.ts` (puros, testados isoladamente: mesmo
  título com espaços/maiúsculas diferentes bate, tipos diferentes não colidem). `NewItemForm`
  ganhou aviso "Já existe um item chamado..." com "Adicionar mesmo assim" — mesmo padrão de
  confirmação de conflito já usado em Documentos/Agenda. **Confirmado pelo usuário no navegador
  em 11/09/2026.** Sem mesclagem (unir dois itens já
  existentes) — decisão consciente de manter o escopo em "detectar", não "resolver
  automaticamente"; mesclar implicaria mover ciclos de consumo/criadores/coleções de um item pro
  outro, uma operação bem mais arriscada de fazer sem confirmação explícita de produto. Typecheck
  e build limpos; sem migration (feature 100% client-side). Metadata Provider Layer (importar por
  URL/ISBN/DOI), conteúdo episódico estruturado (temporadas/episódios), capas/thumbnails com
  cache, nem Insights/Retrospectiva continuam fora do escopo — dependem de API externa de
  metadados ainda não escolhida.
- **Documentos — Lixeira com retenção implementada** (11/09/2026, autônomo): reaproveita a tabela
  `documents` já existente (`deleted_at`, nova coluna) — "Excluir" agora move pra lixeira em vez
  de apagar na hora; a exclusão física (Storage + linha) só acontece quando o usuário esvazia
  manualmente (`purgeDocument`) ou quando o prazo de retenção (30 dias, `TRASH_RETENTION_DAYS`)
  expira, verificado por uma "varredura preguiçosa" na própria leitura da lixeira
  (`listTrashedDocuments`) — sem precisar de scheduler/cron próprio, que ainda não existe.
  `TrashPanel` (toggle "Ver Lixeira" em `/documentos`) mostra dias restantes até expirar, com
  Restaurar/Excluir para sempre. Lógica de datas testada isoladamente (9 checks: expiração exata
  no prazo, contagem regressiva, retenção customizável). **Ainda sem teste ponta a ponta contra o
  Supabase real** (fica pro lote de testes que precisam do usuário).
- **Documentos — Detecção de duplicados por hash implementada** (11/09/2026, autônomo): nova
  coluna `content_hash` em `documents`; `computeFileHash()` calcula SHA-256 do conteúdo no cliente
  via Web Crypto (testado contra o vetor de teste oficial `SHA-256("abc")`, mais casos de mesmo
  conteúdo → mesmo hash e conteúdo diferente → hash diferente). `uploadDocument()` verifica
  duplicata (mesmo hash, não excluído) *antes* de gastar espaço no Storage — se encontrar, lança
  `DuplicateDocumentError` em vez de subir; a UI (`UploadForm`) captura esse erro específico e
  oferece "Enviar mesmo assim" (mesmo padrão de confirmação de conflito já usado na Agenda), que
  reenvia com `force: true`. **Ainda sem teste ponta a ponta contra o Supabase real** (fica pro
  lote de testes que precisam do usuário). Ainda sem OCR/extração de texto — "definido na
  implementação"/"evolução futura" no Xmind. Cofre (`is_vault`) ganhou reautenticação de verdade via
  PIN (11/09/2026, ver `docs/decisions/central-seguranca-pin-design.md`) — mascarar/desmascarar na
  UI e liberação explícita da Vex; criptografia local do conteúdo em si continua fora do escopo.
  Pastas e Garantias já têm telas dedicadas, e
  `document_type` agora é editável de verdade com filtro na listagem (ver entradas de 11/09/2026
  abaixo) — Comprovantes & Notas e Contratos são só filtros do mesmo enum, sem tela própria
  separada (decisão consciente de v1 lean: não duplicar a listagem de Documentos por tipo).
- **Documentos — Versionamento implementado** (11/09/2026, autônomo, migration
  `20260909000020_documentos_versionamento.sql`): nova coluna `documents.current_version`
  (default 1) e nova tabela `document_versions` (RLS via join ao documento dono, mesmo padrão de
  `document_important_dates`). `documents` continua representando sempre a versão atual — a
  mesma regra de "fonte de verdade nunca duplicada" usada no resto do projeto. `uploadNewVersion()`
  arquiva o estado atual (`storage.copy()` do objeto original para
  `{user_id}/{document_id}/versions/{n}/{nome}`, depois `storage.remove()` do caminho antigo,
  depois insere a linha em `document_versions`) antes de subir o novo conteúdo por cima do
  caminho "atual" — nunca há uma janela em que dois objetos disputam o mesmo caminho de Storage.
  `restoreDocumentVersion()` é simétrico a um `git revert`, não a um `git reset`: arquiva o estado
  atual do mesmo jeito, depois copia o conteúdo da versão escolhida de volta pro caminho "atual"
  — `current_version` sempre avança, a versão restaurada continua no histórico. Verificado que a
  RLS existente do bucket `documents` (`(storage.foldername(name))[1] = auth.uid()`) já cobre o
  novo subcaminho `.../versions/...` sem precisar de policy nova, porque o primeiro segmento
  continua sendo o `user_id`. Deliberadamente sem checagem de duplicados nas versões (é uma
  preocupação diferente da deduplicação entre documentos distintos, que já existe em
  `uploadDocument`). UI: `DocumentCard` ganhou botão "Versões" (mostra `vN` quando `> 1`);
  `VersionHistoryPanel` (substitui o card ao clicar) lista o histórico com "Restaurar" por versão
  e um botão "Enviar nova versão". Typecheck e build limpos; migration aplicada e advisors
  conferidos limpos no Supabase real; RLS/schema verificados ao vivo via SQL direto. **Ainda sem
  teste ponta a ponta do fluxo de upload/cópia/restauração em si** — ao contrário dos testes
  anteriores desta sessão (que usavam dados temporários direto via SQL sob a conta real), este
  fluxo depende de operações reais de Storage (`upload`/`copy`/`remove`) que só fazem sentido
  através do cliente autenticado num navegador de verdade (ou de um usuário descartável confirmado
  por e-mail, que exige relay do link de confirmação pelo usuário) — mesma categoria de limitação
  que bloqueou o teste automatizado do Passkey. Fica pro lote de testes que precisam do usuário:
  enviar um documento, depois uma nova versão do mesmo, conferir que "Versões" mostra o histórico,
  restaurar uma versão antiga e conferir que o conteúdo/nome voltou.
- **Documentos — `document_type` agora é editável de verdade (11/09/2026, autônomo)**: descoberta
  ao mexer no filtro por tipo — `uploadDocument()` sempre gravava `"outro"` na hora do upload (o
  parâmetro existia na função desde a sessão anterior, mas nenhuma UI nunca passava outro valor) e
  não havia nenhuma forma de reclassificar depois. Isso tornava o enum de 10 tipos
  (nota_fiscal/recibo/contrato/garantia/comprovante/certificado/documento_pessoal/fatura/manual/
  outro) praticamente inútil na prática, e por isso "Comprovantes & Notas"/"Contratos" nunca
  puderam virar filtro dedicado. Corrigido: novo `updateDocumentType()` no repositório + hook
  `useUpdateDocumentType`; `UploadForm` ganhou um `<select>` de tipo no momento do envio;
  `DocumentCard` ganhou um `<select>` de tipo (reclassificar a qualquer momento, mesmo padrão do
  seletor de pasta já existente); nova constante `DOCUMENT_TYPE_LABELS` (rótulos em pt-BR, única
  fonte pros três lugares não divergirem) em `service.ts`; `/documentos` ganhou um filtro "Todos os
  tipos"/tipo específico ao lado do filtro de pasta. Verificado ao vivo contra o Supabase real
  (documento temporário: criado com `outro`, atualizado pra `contrato`, removido ao final).
  Typecheck e build limpos.
- **Documentos — Pastas e Garantias ganharam telas dedicadas** (11/09/2026, autônomo): ambas já
  tinham schema e funções de repositório prontas de sessões anteriores (`listFolders`/
  `createFolder`, `createWarranty`/`listWarranties`), só faltava UI. Novo `moveDocumentToFolder()`
  + `deleteFolder()`. `FoldersPanel` (criar/listar/excluir pasta, filtro "Todas"/pasta específica
  na listagem de `/documentos`) e `WarrantiesPanel` (cadastrar produto+data de compra+duração,
  vínculo opcional com um documento/nota fiscal já existente, lista com aviso "Vencida" quando
  `end_date` já passou). `DocumentCard` ganhou um `<select>` de pasta por documento. Verificado ao
  vivo contra o Supabase real via SQL direto (dados temporários, removidos ao final): pasta +
  documento + garantia inseridos com `folder_id` batendo, mover documento pra "sem pasta"
  (`folder_id = null`) funcionando. Typecheck e build limpos.
- **Finanças — UI de contas/cartões/categorias/recorrências/parcelamentos/orçamentos
  implementada** (10/09/2026): `AccountsPanel` (nome + tipo), `CardsPanel` (apelido), `CategoriesPanel`
  (nome + entrada/saída), `RecurringTransactionsPanel` (cobre Recorrências e Assinaturas na mesma
  tela — a diferença é só o checkbox `is_subscription`; botões "Gerar cobrança agora"
  `useGenerateOccurrence` e Pausar/Reativar `useUpdateRecurringStatus`), `InstallmentsPanel`
  (compra parcelada via `useCreateInstallmentPurchase`), `BudgetsPanel` (limite por categoria de
  saída e mês `YYYY-MM`, filtra categorias de entrada). `NewTransactionForm` deixou de ser
  simplificado: agora pede Categoria (filtrada por Entrada/Saída) e Conta, e Transferência exige
  Conta de destino diferente da de origem (mesmo padrão de `events`/`task_id`: nunca duplica dado,
  só referencia). `createAccount()` ganhou parâmetro opcional `accountType`. Todos os painéis
  ligados em `Financas.tsx`. Typecheck e build limpos. Testado ponta a ponta contra o Supabase
  real (17 checks): tipo de conta persistido, categoria duplicada (mesmo nome+kind) rejeitada,
  movimentação com categoria/conta, transferência sem conta destino rejeitada pela constraint do
  banco, transferência válida aceita, avanço de 12 meses na próxima cobrança batendo com o
  exemplo do Xmind (Spotify), pausar recorrência, parcelamento de R$ 3.600 em 12x gerando as 12
  parcelas de R$ 300 (soma batendo com o total), e orçamento duplicado (mesma categoria+mês)
  rejeitado pela constraint única. Usuário e dados de teste removidos ao final. Anexo de
  comprovante via Documentos já funciona (botão "Comprovante" expande `AttachDocumentPanel` em
  cada movimentação, ver integração cross-module acima) — só não dá para anexar já na criação, é
  sempre um passo depois. Alertas automáticos de orçamento e Calendário Financeiro dedicado foram
  implementados depois (ver entradas mais abaixo).
  **Integração Finanças ↔ Veículos implementada (12/09/2026, bounded — mesmo padrão de
  `account_id`/`card_id`/`document_id` já existentes)**: Documentos↔Veículos já funcionava (CRLV/
  apólice via `AttachDocumentPanel`, genérico), mas não dava pra saber quanto se gastou com um
  veículo específico. Nova `transactions.vehicle_id` (`on delete set null`, apagar o veículo
  preserva a movimentação) + `computeVehicleSpending()` (pura, só saídas `concluida`, mesmo padrão
  de `computeAccountBalance` desta sessão). `NewTransactionForm` ganhou seletor de Veículo opcional
  — usa um formato mínimo (`{id, nickname}`, não o tipo `Vehicle` de `@qqorvex/module-vida-pessoal`)
  pra não criar dependência de pacote na direção errada (Finanças não conhece Veículos). A lista de
  veículos é buscada em `Financas.tsx` (nível do app) via `@qqorvex/module-vida-pessoal` e passada
  como prop — Finanças continua sem depender de Vida Pessoal. Na direção oposta,
  `@qqorvex/module-vida-pessoal` passou a depender de `@qqorvex/module-financas` (mesmo precedente
  de módulo importando módulo já usado por Estudos→Agenda/Biblioteca e Metas→Finanças nesta
  sessão): `VehicleCard` mostra "Total gasto: R$X" calculado ao vivo. Testado isoladamente (3
  checks) e ao vivo contra o Supabase real (`on delete set null` confirmado). Typecheck e build
  limpos; sem teste de clique real na UI.
  **Forma de pagamento na movimentação manual implementada** (11/09/2026, autônomo): descoberta ao
  mexer nisso — a coluna `payment_method` (enum `dinheiro`/`pix`/`debito`/`credito`/`boleto`/
  `transferencia`/`outra`) já existia no banco desde a migration original, mas nenhuma UI nunca a
  expunha (só o Cartão tinha seletor). `NewTransactionForm` ganhou o seletor (escondido quando um
  Cartão é escolhido — crédito já fica implícito nesse caso, sem perguntar de novo);
  `TransactionList` passou a mostrar a forma de pagamento na movimentação. Nova constante
  `PAYMENT_METHOD_LABELS` em `service.ts` (fonte única dos rótulos pt-BR pros dois lugares não
  divergirem). Testado ao vivo contra o Supabase real (movimentação com `pix`, removida ao
  final). Typecheck e build limpos. Sem migration. **Confirmado pelo usuário no navegador em
  11/09/2026.**
- **Finanças — Fatura/fechamento de cartão implementada** (10/09/2026): `cards` ganhou
  `closing_day`/`due_day` (1–28, evita borda de mês curto); nova tabela `card_statements`
  (competência `YYYY-MM`, `closing_date`, `due_date`, status `aberta`/`fechada`/`paga`,
  `unique(card_id, reference_month)`, RLS completa). O total da fatura **nunca é persistido** —
  `computeStatementTotal()` soma as transações do cartão no período em tempo real, mesmo padrão de
  Saldo Atual/Projetado. `computeCurrentClosingDate()`/`computeStatementPeriod()`/
  `computeStatementDueDate()` são puras (testadas isoladamente, 9 checks, incluindo o caso do
  fechamento cair no mês seguinte ao vencimento — ex.: fecha dia 25, vence dia 5 → cai em
  novembro). `getOrCreateCurrentStatement()` é idempotente por `card_id`+competência (mesmo padrão
  de `createEventForAssessment`) e só persiste a fatura quando o usuário efetivamente marca como
  paga — até lá é só cálculo em TS. `CardStatementPanel` (expansível a partir de `CardsPanel`, botão
  "Ver fatura") mostra o período atual, total, vencimento, botão "Marcar fatura como paga"
  (habilitado só depois do fechamento) e histórico. `NewTransactionForm` ganhou seletor de cartão
  (opcional, oculto em Transferência) para dar para criar uma compra no cartão pela própria UI.
  Testado ponta a ponta contra o Supabase real (8 checks): `closing_day`/`due_day` persistidos e
  fora de 1–28 rejeitado, transação vinculada ao cartão, fatura duplicada (mesmo cartão+
  competência) rejeitada pela constraint única, marcar como paga funcionando, apagar o cartão
  removendo a fatura em cascata sem apagar a transação (`card_id` vira `null`, mesmo padrão de
  `task_id`/`account_id`). Usuário e dados de teste removidos ao final. Alertas automáticos de
  vencimento próximo foram implementados depois (ver "Notificações — quarta fonte" mais abaixo).
  Segue sem transição automática de status para "fechada" (é só um valor de exibição calculado por
  data; a app nunca escreve esse status, só "aberta"→"paga" diretamente ao marcar como paga).
- **Finanças — Calendário Financeiro dedicado implementado** (11/09/2026, autônomo):
  `FinancialCalendarView` (grade de mês própria de Finanças — utilitários de data duplicados
  localmente em `service.ts` em vez de importar de `@qqorvex/module-agenda`, respeitando "módulos
  não acessam internals uns dos outros"). Ponto sólido = movimentação real (`transactions`) no
  dia; ponto contornado = cobrança de recorrência ativa projetada
  (`recurring_transactions.next_occurrence_date`) — nunca cria uma transação fantasma só para
  aparecer no calendário. Clicar num dia mostra a lista do que há nele (real + projetado) abaixo
  da grade. Seção "Calendário Financeiro" em `/financas`, com navegação de mês. Lógica de grade
  testada isoladamente (6 checks: início de mês/semana, virada de ano, grade de 6 semanas
  cobrindo o mês). **Ainda sem teste ponta a ponta contra o Supabase real** (fica pro lote de
  testes que precisam do usuário).
- **Notificações — segunda fonte: alertas de orçamento (Finanças) implementada** (11/09/2026,
  autônomo, reaproveitando a infra de notificações já existente): "alertas automáticos de
  orçamento" estava marcado como pendência desde a implementação de Finanças. Nova coluna
  `budgets.alert_sent_at` (um alerta por competência — mês novo é linha nova, então "já alertei"
  nunca precisa resetar). A Edge Function `send-notifications` (v2) agora também soma os gastos
  do mês por categoria a partir de `transactions` (nunca persiste o total, mesmo padrão de
  `computeBalances()`) e compara com `limit_amount`; se estourou, envia o push e marca
  `alert_sent_at`. Testado em produção com dados reais temporários (categoria + orçamento de R$
  100 + gasto de R$ 150, limpos ao final): orçamento identificado como estourado, notificação
  realmente entregue (`notificationsSent: 1` — como a inscrição push real do usuário ainda estava
  ativa, ele **recebeu de fato uma notificação de teste "Orçamento estourado"** nesse processo),
  `alert_sent_at` marcado, segunda chamada não re-alerta (idempotente). Sem pendência — pronto
  pra uso real assim que o usuário criar orçamentos de verdade em `/financas`.
- **Notificações — terceira fonte: lembrete de hábito diário (Metas & Hábitos) implementada**
  (11/09/2026, autônomo): "Notificações" estava marcado como pendência desde a implementação do
  módulo. Nova coluna `habits.last_reminder_sent_date` (evita lembrar 2x no mesmo dia). A Edge
  Function `send-notifications` (v3) verifica hábitos `frequency_type = 'diaria'` com
  `preferred_time` definido e `status = 'ativo'`: se já passou do horário preferido, ainda não foi
  lembrado hoje e não tem registro (`habit_logs`) pra hoje, envia o push e marca
  `last_reminder_sent_date`. v1 lean consciente: só cobre frequência diária — dias específicos e
  "X vezes por semana" exigiriam calcular "está previsto hoje?" de forma mais complexa, fica pra
  depois. Testado em produção com dados reais temporários (2 hábitos, mesmo horário preferido no
  passado: um sem registro de hoje, outro já registrado) — o sem registro foi lembrado de verdade
  (`habitsReminded: 1` de `habitsChecked: 2`, o registrado foi corretamente ignorado),
  `last_reminder_sent_date` marcado só no lembrado, segunda chamada não repete (idempotente).
  Como a inscrição push real do usuário estava ativa, **ele recebeu de fato uma notificação de
  teste "Não esqueça: Hábito teste A"** nesse processo. Dados de teste removidos ao final. Sem
  pendência — pronto pra uso real assim que o usuário definir um horário preferido num hábito
  diário em `/metas-habitos`.
- **Notificações — quarta fonte: lembrete de fatura de cartão perto do vencimento implementada**
  (11/09/2026, autônomo): "alertas automáticos de vencimento próximo (dependem de scheduler, que
  ainda não existe)" estava desatualizado — o scheduler já existia desde as fontes 2/3. Nova
  coluna `card_statements.due_reminder_sent_at`. A Edge Function `send-notifications` (v4)
  replica exatamente `computeCurrentClosingDate()`/`computeStatementDueDate()` de
  `@qqorvex/module-financas` (Edge Function não importa pacotes do monorepo, só arquivos remotos/
  npm — reimplementação verificada linha por linha contra as funções originais com os mesmos 3
  casos de teste, incluindo o caso documentado de fechar dia 25/vencer dia 5 rolando pro mês
  seguinte, antes de embutir). Para cada cartão com fechamento/vencimento configurados: calcula a
  fatura atual, cria a linha em `card_statements` se ainda não existir (mesmo comportamento de
  `getOrCreateCurrentStatement()`, só que disparado pelo cron em vez de um clique em "Ver
  fatura"), e avisa se o vencimento está a até 3 dias — sem repetir (`due_reminder_sent_at`) nem
  avisar fatura já paga. Testado em produção com dados temporários: (1) cartão com vencimento
  longe (~24 dias) processado sem criar fatura nem alertar, confirmando que só entra na janela de
  fato; (2) cartão com vencimento exatamente em 3 dias (fechamento hoje, vencimento em 3 dias)
  criou a fatura e marcou o lembrete corretamente; segunda chamada não repetiu (idempotente). Pra
  não arriscar acordar o usuário durante o teste noturno, a inscrição push real dele foi removida
  temporariamente antes do teste (confirmando `notificationsSent: 0`) e restaurada exatamente
  igual (mesmo `id`/endpoint/chaves/`created_at`) logo depois — **nenhuma notificação real foi
  enviada** durante este teste, diferente das fontes 2/3 anteriores. Dados de teste removidos ao
  final. Sem pendência — pronto pra uso real assim que o usuário configurar fechamento/vencimento
  num cartão em `/financas`.
- **Code-splitting por rota implementado** (11/09/2026, autônomo): resolve o aviso do Vite de
  bundle > 500kB. Todas as páginas em `App.tsx` viraram `React.lazy()` dentro de um único
  `<Suspense>` na raiz do roteador; `VexChat` (dentro da Hoje) também virou `lazy` — a Vex monta
  ferramentas dos 8 módulos de domínio e só vale a pena carregar se o usuário realmente clicar
  "Falar com a Vex". Resultado: cada página agora é o próprio chunk (poucos KB cada, carregado só
  quando visitada) em vez de tudo ir no bundle inicial. O chunk principal ainda passa de 500kB
  (~566kB) porque `ModuleRegistrations` (raiz do app) continua registrando os provedores da Hoje
  de todos os 8 módulos de forma eager, de propósito — é o que garante que a Hoje sempre mostre
  dados corretos mesmo se for a primeira página visitada, sem depender de o usuário já ter aberto
  outro módulo antes; separar isso teria custo de complexidade/risco de comportamento
  (Hoje incompleta) desproporcional ao ganho, então o aviso restante é aceito conscientemente. O
  que importa de verdade (tamanho transferido via rede, gzip) já caiu: ~200KB gzip no chunk
  principal + chunks de página de poucos KB sob demanda, contra ~727kB brutos tudo junto antes.
  Typecheck e build limpos; rotas conferidas manualmente (200 OK) depois da mudança.
- **Vex conectada a um provider real (Ollama) — implementado** (10/09/2026): usuário instalou o
  Ollama localmente e baixou `qwen2.5:7b` (suporta "tools", confirmado). `ResilientProvider`
  (novo, `packages/vex/src/providers/`) decora um provider primário com fallback automático — se
  o `OllamaProvider` falhar (Ollama fora do ar, erro de rede), a conversa cai pro `EchoProvider`
  sem travar, e volta a tentar o Ollama sozinho na mensagem seguinte. `VexChat` usa esse par por
  padrão; modelo configurável via `VITE_OLLAMA_MODEL` (`.env.example` atualizado). Testado:
  `OllamaProvider` contra um Ollama real (`POST /api/chat` com `tools`, recebeu tool call real no
  formato exato que o código espera) e `ResilientProvider` isoladamente (5 checks: usa o
  primário, cai pro fallback sem propagar exceção, expõe `name` do primário, recupera sozinho na
  chamada seguinte). **Confirmado funcionando de ponta a ponta pelo usuário no navegador**
  (chat real, `Falar com a Vex` no Hoje, contra o `qwen2.5:7b` local via Ollama) — não deu pra
  automatizar esse fluxo completo (`runVexTurn` + ferramenta real + Supabase) fora do Vite nesta
  sessão (a árvore de módulos da Vex encadeia imports relativos sem extensão que o bundler
  resolve mas o Node cru não, mesmo com `--experimental-transform-types`), então a verificação
  manual do usuário foi o teste que fechou essa frente nesta sessão.
  **Atualização (11/09/2026) — Vex Context Engine, 7 fases completas** (ver
  `docs/decisions/vex-context-engine-design.md`): o parágrafo acima descrevia limitações que já
  não existem mais. Memory Engine implementado (conversas persistidas em `vex_conversations`/
  `vex_messages`, lista/renomear/trocar de conversa); Context Engine implementado (item em foco na
  tela via `CurrentItemContext`, injetado como contexto na conversa); painel retrátil + página
  `/vex` em tela cheia (substituindo o modal antigo); preenchimento incompleto (a Vex pergunta o
  que falta em vez de inventar); cobertura de ferramentas expandida (editar/mover/mudar
  status/apagar em Agenda, Metas & Hábitos, Estudos — incluindo Quiz/Testes gerados —, Segundo
  Cérebro, Biblioteca, Documentos e Finanças, além de recorrência de verdade); pesquisa+salvar
  como Tarefa/Página/Resumo/Documento em qualquer módulo; barreira do Cofre evoluída de bloqueio
  total pra "autorizar com PIN" (Central de Segurança). Segue sem: Intent Router mais sofisticado
  que um modelo de tool-calling genérico, Event Engine, modos Contextual/Ambient/Guided/Web, Vex
  Voice (explicitamente fora da v1 no próprio Xmind), mesclar página, analisar recibo. Safety
  Engine continua só Query Guard por palavra-chave; Content/Media/Output Guard, SearXNG (Vex Web) e
  NSFWJS (imagens) dependem de infraestrutura que ainda não existe. Confirmação continua binária
  (auto-executa ou pede confirmação) em vez dos níveis 0–4 descritos no Xmind para Finanças.

- **Integração cross-module** (Documentos ↔ Finanças ↔ Estudos): `AttachDocumentPanel` +
  `useRelatedDocuments`/`useAttachDocument`/`useDetachDocument` (novos em
  `@qqorvex/module-documentos`) e `listRelatedDocuments`/`removeDocumentRelationByEntity`
  (novos em `repository.ts`) reaproveitam `document_relations` sem migration nova. Plugado hoje
  em Finanças (comprovante por movimentação, expansível na `TransactionList`) e Estudos
  (documentos relacionados ao Caderno). Testado ponta a ponta: anexar, desanexar preservando o
  arquivo, mesmo documento relacionado a dois módulos ao mesmo tempo, e exclusão da movimentação
  não afetando o documento nem a relação com Estudos.
- **Integração cross-module** (Biblioteca ↔ Estudos, Agenda ↔ Estudos): implementada — tabela
  dedicada `notebook_library_items` (N:N simples, `on delete cascade` dos dois lados, não
  `document_relations` porque não é polimórfica) para "Usar em um Caderno"
  (`relateLibraryItem`/`unrelateLibraryItem`/`listRelatedLibraryItems` em
  `@qqorvex/module-estudos`, UI em `RelatedLibraryItemsPanel` reaproveitando a API pública de
  `@qqorvex/module-biblioteca`); `events.assessment_id` (nullable, `on delete set null`, mesmo
  padrão de `task_id`) para avaliação gerar evento derivado (`createEventForAssessment`,
  idempotente — reusa o evento existente em vez de duplicar, chamando só a API pública de
  `@qqorvex/module-agenda`). Ligado em `EstudosCaderno.tsx` ("Criar evento na Agenda" por
  avaliação + painel de itens da Biblioteca). Typecheck limpo em `module-estudos`, `module-agenda`,
  `module-biblioteca` e no app. **Testado ponta a ponta em 10/09/2026** contra o Supabase real
  com usuário confirmado por e-mail de verdade (Resend já verificado): 15 checks — relacionar/
  desrelacionar item da Biblioteca a um Caderno, PK composta rejeitando relação duplicada,
  Biblioteca continuando dona do item após desrelacionar, apagar o Caderno removendo a relação em
  cascata sem apagar o item, `createEventForAssessment` criando o evento derivado e sendo
  idempotente na segunda chamada (não duplica), e apagar a avaliação preservando o evento com
  `assessment_id` virando `null` (mesmo padrão de `task_id`). Usuário e dados de teste removidos
  ao final. Faltam ainda: qualquer integração envolvendo Veículos (módulo Vida Pessoal já existe,
  mas nenhuma integração cross-module com ele foi construída ainda).

- **Biblioteca — Metadata Provider Layer (Google Books + TMDB) — implementado** (12/09/2026, ver
  `docs/decisions/biblioteca-metadata-provider-design.md`): busca automática de metadados por
  título pra livro (Google Books, sem chave) e filme/série (TMDB, chave pública em
  `VITE_TMDB_API_KEY` — dado de filme é público, mesmo padrão de baixo risco já usado para
  `VITE_GOOGLE_CLIENT_ID`; chamada direta do cliente, sem Edge Function, porque nenhuma das duas
  exige proteger um segredo de verdade). Nenhuma migration nova — `library_items` já tinha
  `cover_url`/`description`/`year`/`origin_url`/`subtitle` e `library_item_creators` já existia
  no schema desde a sessão original, ambos sem nenhuma função de repositório ou UI até agora.
  Novo `modules/conhecimento/biblioteca/src/metadataProviders.ts`
  (`searchGoogleBooks`/`searchTmdb`), novo `listItemCreators`/`addItemCreator` em
  `repository.ts`, novo hook `useCreateLibraryItemWithCreators`, `NewItemForm` ganhou seletor de
  tipo (antes sempre gravava `item_type: "other"`), busca com resultados clicáveis e capa/ano
  exibidos, `GalleryGrid` ganhou capa e rótulos em pt-BR do tipo (`LIBRARY_ITEM_TYPE_LABELS`, novo
  em `service.ts`, também corrige a Galeria mostrando o enum cru antes). TMDB não devolve
  diretor/elenco na busca (exigiria uma segunda chamada a `/credits` por item) — deliberadamente
  fora do escopo da v1, filme/série ficam sem `creators`. Typecheck limpo em
  `module-biblioteca` e no app, build de produção limpo. Testado ponta a ponta contra o Supabase
  real: insert/select em `library_item_creators` (primeira vez que essa tabela é exercida desde
  que existe) sob o usuário confirmado, RLS funcionando, dado de teste removido ao final; nenhum
  novo achado nos advisories de segurança. **Pendência do usuário**: falta cadastrar uma chave
  grátis em themoviedb.org/settings/api e preencher `VITE_TMDB_API_KEY` no `.env` local — sem
  ela, a busca de filme/série retorna vazio (livro via Google Books já funciona sem chave).

- **Documentos — OCR de recibos/notas (Tesseract.js) — implementado** (12/09/2026, ver
  `docs/decisions/documentos-ocr-design.md`): botão "Extrair texto" em documentos de imagem
  (`mime_type` começando com `image/`) roda Tesseract.js 100% no navegador (português, sem
  chave, sem Edge Function, import dinâmico confirmado como chunk próprio no build) e persiste o
  resultado em `documents.extracted_text` (nova coluna, única migration desta feature). Gatilho é
  manual (não roda em todo upload); texto já extraído vira "Ver texto extraído" com painel e
  botão "Copiar texto". Novo `modules/gestao/documentos/src/ocr.ts`
  (`extractTextFromImage`), `isImageMimeType()` em `service.ts`, `updateExtractedText()` em
  `repository.ts`, hook `useExtractText`. Typecheck limpo em `module-documentos` e no app, build
  de produção limpo. Testado contra o Supabase real: insert/update/select/delete de
  `extracted_text` num documento de teste, sem novos achados nos advisories de segurança.
  **Confirmado pelo usuário no navegador (15/09/2026)**: como a ferramenta de navegador
  autônoma não tem ação de "escolher arquivo" pro seletor nativo do sistema (só digitação/clique,
  sem upload real), pedi pro usuário subir um recibo de teste que gerei (imagem sintética com
  Pillow via Python, texto "RECIBO DE TESTE / Valor total: R$ 123,45 / Data: 15/09/2026") em
  `/documentos`. Primeira tentativa deu "Falha no upload" — não era bug do app: o preview
  compartilhado ainda tinha em `localStorage` uma sessão válida (`sb-...-auth-token`) de uma conta
  de teste (`khyron.box@gmail.com`) que eu já tinha apagado do banco em `auth.users` momentos
  antes; qualquer escrita autenticada com esse token falha porque o `user_id` não existe mais.
  Limpei a sessão órfã (`localStorage.removeItem`), o usuário criou uma conta nova (mesmo e-mail,
  reaproveitado) e confirmou pelo e-mail de verdade, subiu a imagem de novo e clicou em "Extrair
  texto": o Tesseract.js extraiu as 3 linhas exatamente iguais à imagem. Funcionando de ponta a
  ponta. **Lição registrada pra não repetir**: depois de apagar um usuário de teste via SQL direto
  em `auth.users`, sempre limpar também a sessão em `localStorage` do preview compartilhado (ou
  pedir pro usuário recarregar a página e logar de novo do zero) antes de pedir um novo teste —
  senão a sessão órfã do usuário apagado engana o cliente (que acha que está autenticado) até a
  primeira escrita falhar. Conta de teste e documento apagados ao final, cascata confirmada sem
  dado órfão — sem pendência. (O objeto de fato no Storage do recibo de teste fica órfão — sem FK
  cascade de `auth.users` pra `storage.objects` — mas fica inacessível por RLS pra sempre, já que
  o prefixo do caminho é o UUID do usuário apagado; risco/custo irrelevante, não vale a
  complexidade de limpar via API admin só por isso.)

- **Gamification Core (Level/XP/Badges/Títulos) — implementado** (12/09/2026, ver
  `docs/decisions/gamification-core-design.md`): novo módulo `modules/pessoal/gamificacao`
  (`@qqorvex/module-gamificacao`), sem Xmind detalhado pra consultar — desenho refeito do zero
  via brainstorming, mesmo espírito de Vida Pessoal. XP só nas quatro ações centrais de
  produtividade (Tarefa concluída = 10, check-in de Hábito/Meta = 5, Quiz respondido em Estudos =
  20 — ajustado de "Avaliação concluída" porque `assessments` não tem campo de status —, item da
  Biblioteca concluído = 15). Nível sempre derivado do XP total (nunca guardado), Título fixo por
  faixa de nível, Badges num catálogo fixo checado contra contadores. `awardXp()` mora dentro do
  repository de Tarefas/Metas-Hábitos/Estudos/Biblioteca (não da página do app) pra premiar XP
  também quando a conclusão acontece via chat da Vex, que chama os repositories direto; nunca
  lança (erro de gamificação não pode derrubar a ação principal). Duas tabelas novas
  (`gamification_stats`, `user_badges`), RLS por `user_id`, sem função `security definer`. Widget
  compacto no Hoje + seção completa (progresso + badges) em `/seguranca`. Typecheck e build
  limpos em todo o monorepo (19 workspace projects). Testado contra o Supabase real (upsert de
  stats, `unique(user_id, badge_key)` rejeitando duplicata) e curva de nível/título verificada via
  script isolado. **Confirmado via UI real (15/09/2026)**: concluí uma tarefa de teste com o
  usuário `khyron.box@gmail.com` e o widget do Hoje atualizou de `0/100 XP` pra `10/100 XP` na
  hora, sem reload. Badges continuam bloqueados (nenhum contador bateu o limiar com só 1 ação de
  teste) — comportamento esperado, não testado especificamente. Dado de teste removido ao final.
  Sem pendência.

- **Segundo Cérebro — Editor de Blocos Rico (v1) — implementado** (12/09/2026, ver
  `docs/decisions/segundo-cerebro-editor-blocos-design.md`): a página de edição cobria só o tipo
  "texto" e nem tinha `updateBlock` no repository (só criar/apagar). Agora 11 dos 19 valores do
  enum `block_type` têm forma de conteúdo e edição de verdade (texto, título 1/2/3, lista,
  checklist, citação, callout, código, divisor, toggle) — tabela/imagem/arquivo/link/equação/
  embed/referências ficam pra uma 2ª rodada. Arquitetura de lista de blocos (um componente React
  por bloco, `key={block.id}` preservando estado local entre reordenações), não editor de texto
  único — bate direto com o schema já block-first, sem lib nova (Tiptap descartado por
  desproporcional). Slash command ("/" num bloco vazio abre menu inline) + dropdown sempre
  disponível pra trocar tipo. Enter cria bloco novo logo depois do atual via `createBlockAfter()`
  novo (empurra `order_index` seguintes, já que é inteiro sem espaço fracionário); Backspace no
  início de um bloco vazio apaga e volta o foco; reordenar é só botões ▲/▼ (`moveBlock()` novo,
  sem drag-and-drop na v1). Toggle não aninha blocos de verdade (`blocks` não tem
  `parent_block_id`) — é só `{summary, details}` colapsável. Salva no blur/Enter, não a cada
  tecla. Nenhuma migration — schema de `blocks` já suportava tudo. Typecheck e build limpos no
  monorepo inteiro. Testado contra o Supabase real: inserção no meio da lista com reindexação
  correta, troca de tipo com reset de conteúdo, swap de `order_index` via `moveBlock` — dado de
  teste removido ao final. **Confirmado via UI real (15/09/2026)**: slash command abrindo o menu
  com os 11 tipos, troca de tipo pelo dropdown resetando o conteúdo, botão ▲ trocando a ordem de
  dois blocos — tudo funcionando. Enter criando bloco novo e movendo o foco também confirmado,
  mas só depois de eu descobrir que a ação "Return" da ferramenta de navegador usada nesta sessão
  não entrega um evento de tecla real pro React (`onKeyDown` nunca disparava) — nada a ver com o
  código do app; confirmei isso despachando um `KeyboardEvent('keydown', {key: 'Enter'})` de
  verdade via JS, que funcionou de primeira e criou o bloco. Vale registrar pra não perder tempo
  de novo: nesta ferramenta de navegador, teclas como Enter/Backspace dentro de um input não
  chegam à página como evento de teclado de verdade — só clique e digitação de texto são
  confiáveis; qualquer teste que dependa de tecla precisa ser validado assim (JS direto) antes de
  reportar como bug. Dado de teste removido ao final. Sem pendência.

- **Fase de design — iniciada (12/09/2026)**, ver `docs/decisions/design-system-componentes-v1.md`.
  Os 4 itens funcionais do roteiro estão prontos; abordagem escolhida foi "biblioteca de
  componentes primeiro", decidida via brainstorming visual (Visual Companion, aceito pelo
  usuário). Primeira rodada: `Card` (`packages/ui/src/components/Card.tsx`, cantos 10px, sombra
  discreta, borda de destaque cyan/gold) e variantes de botão `chip`/`chip-accent` (sem borda,
  fundo tintado sutil — aditivas, `secondary`/`ghost` originais preservados porque são usados em
  dezenas de contextos fora do escopo desta rodada). **Bug real encontrado e corrigido**: a
  detecção automática de conteúdo do Tailwind v4 nunca escaneava `packages/*`/`modules/*` (só
  alcançáveis a partir de `apps/qqorvex` via symlink do pnpm dentro do `node_modules` excluído) —
  classes usadas só dentro de um módulo, nunca duplicadas numa página do app, saíam
  silenciosamente do CSS de produção (confirmado com `object-cover`/`line-clamp-2` da Biblioteca).
  Corrigido com `@source` explícito em `global.css`; CSS de produção cresceu de 18.160 para 26.590
  bytes. Typecheck e build limpos no monorepo inteiro. `Card` ainda não foi adotado por nenhuma
  página — isso é a próxima fase ("página por página").
  **Atualização**: `Input`/`Select`/`Textarea` também implementados (`FormField.tsx`) — rodada
  visual inicial (caixa fechada/preenchido/underline) foi rejeitada em bloco ("algo mais
  estilizado e bonito"); escolhida a mesma "assinatura" do Card (barra lateral, cinza→Gold em
  foco via `focus-within`, sem JS), label embutido e obrigatório na API (ganho de acessibilidade
  — nenhum campo do app tinha `<label>` de verdade até agora, só `placeholder`). Typecheck e
  build limpos.
  **Atualização**: `Badge` também implementado — ponto indicador colorido + fundo tintado sutil,
  sem borda, reaproveitando os tokens `success-bg`/`error-bg`/`warning-bg`/`info-bg` já
  existentes. `tone` e o texto (`children`) são obrigatórios na API, garantindo a regra "nunca
  comunicar estado só por cor" por construção. Typecheck e build limpos.
  **Atualização**: `Modal`/`ConfirmDialog` também implementados — centralizado, backdrop
  escurecido, mesma casca visual do Card, via `createPortal`. `ConfirmDialog` reaproveita o
  `Button` já existente (`chip`/`destructive`). Ainda sem uso real em nenhuma página (muitos
  "Excluir" do app hoje não têm confirmação nenhuma — plugar isso é trabalho da fase "página por
  página"). Typecheck e build limpos.
  **Atualização — biblioteca de componentes v1 fechada**: `Sidebar` também implementado — sem
  ícones (pedido explícito do usuário), seções agrupando os 9+ módulos, item ativo com a mesma
  "assinatura" (barrinha + fundo tintado cyan) de Card/Input, via `NavLink` do react-router
  (novo peer dependency de `@qqorvex/ui`). Com Card, Input/Select/Textarea, Badge,
  Modal/ConfirmDialog e Sidebar prontos, a rodada "biblioteca de componentes primeiro" está
  fechada — próxima fase é "página por página" (nenhum componente ainda foi adotado em nenhuma
  página real). Typecheck e build limpos no monorepo inteiro.
  **Atualização — fase "página por página" iniciada**: `Sidebar` entrou de uma vez no layout
  (`ProtectedLayout.tsx`, escondida em `/vex` junto com a aba da Vex, mesmo `if` que já existia).
  `HojePage` foi a primeira página migrada: fileira de botões de navegação removida (virou
  redundante com a Sidebar), resumo do dia agora usa `Card`, cada item com `priority` (campo que
  já existia em `HojeItem` sem uso até agora) ganha um `Badge`. Typecheck e build limpos no
  monorepo inteiro. **Não confirmado em navegador real** (ambiente sem browser) — falta o usuário
  rodar `pnpm dev` e conferir o layout com a Sidebar nas ~15 páginas (as outras 14 ainda têm nav
  solta redundante ao lado da Sidebar nova, inofensiva até serem migradas).
  **Atualização (15/09/2026) — as ~14 páginas restantes migradas**: todas as páginas passaram a
  usar `Card`/`Badge`/`Input`/`ConfirmDialog` em vez de `div`s cruas com bordas manuais; os links
  soltos "Voltar para Hoje" (redundantes com a Sidebar) saíram de Finanças, Segurança e Vida
  Pessoal — os breadcrumbs hierárquicos de verdade (ex.: Caderno → Estudos, Página → Segundo
  Cérebro) ficaram, porque não são navegação de topo duplicada. `Card` ganhou `forwardRef`
  (`packages/ui/src/components/Card.tsx`) — necessário pro `TaskCard` continuar funcionando com
  `@dnd-kit/core` (`setNodeRef` precisa do nó DOM real), exceção documentada no próprio componente.
  Também plugado `ConfirmDialog` nos ~20 componentes de módulo que disparavam exclusão direto sem
  confirmar (`NotebookCard`, `PageCard`, `DocumentCard`, `GalleryGrid`, `GoalCard`, `HabitCard`,
  `TaskCard`, `TaskListView`, `DayAgenda`/`ListView`/`MeetingsView`/`RecurringEventsPanel` da
  Agenda, `RecurringTasksPanel`, `PlanCard`/`ProjectCard`/`IdeaCard`/`VehiclesPanel`/
  `UsefulContactsPanel`/`ShoppingListPanel`/`ImportantPurchasesPanel`/`AssetsPanel` da Vida
  Pessoal, `TrashPanel` da Documentos — só a exclusão permanente, "Restaurar" continua sem
  confirmação por ser reversível —, `BasesPanel`, `TransactionList`, `RoutinesPanel`), com `Badge`
  nos status que antes eram só texto ou pills coloridas à mão (status de Tarefa/Meta/Hábito/Rotina/
  Movimentação/Item da Biblioteca/Plano/Projeto/Compra Importante). Em `Segurança`, os 9 blocos
  viraram `Card` e ganharam confirmação: remover Passkey, encerrar uma sessão e "Sair de todos os
  outros dispositivos" (todos reversíveis só no sentido de logar de novo, mas o usuário pediu
  confirmação nesses três por serem ações de conta). Decisões conscientes de **não** aplicar
  `Card`/`ConfirmDialog`: `BlockRow` do Editor de Blocos (toolbar densa de ícones ✕/▲/▼ dentro de
  um bloco sendo editado — confirmar cada exclusão de bloco atrapalharia o fluxo, igual Notion não
  confirma); ações de "Desvincular"/"Remover relação" em várias telas (Metas↔Hábitos, Planos↔Metas,
  Projetos↔Tarefas, Bases↔Páginas, Estudos↔Biblioteca, Documentos anexados) — removem só a
  referência, nunca o dado em si, then ficaram só com `Button variant="chip"`; painéis onde a
  seção já é uma lista de `Card`s (Metas & Hábitos, Vida Pessoal Planejamento) não viraram um
  `Card` externo também, pra não aninhar Card dentro de Card sem necessidade. `FlashcardReviewCard`
  virou `Card accent="gold"` (dentro da seção "Flashcards", que já é `Card accent="cyan"` — o gold
  diferencia visualmente o aninhamento intencional). Typecheck limpo nos 18 workspace projects e
  build de produção limpo (mesmo aviso pré-existente do chunk >500kB, não piorou).
  **Não confirmado em navegador real**: criei um usuário de teste
  (`design-check-temp@biocypher.tech`) só pra abrir a tela de login — confirmei visualmente que
  `Input`/`Button` renderizam certo (barra lateral cinza→dourada em foco) —, mas não consegui
  seguir pras páginas atrás do login porque a confirmação de e-mail é obrigatória neste projeto
  (Resend real) e forçar a confirmação direto no banco foi corretamente bloqueado pelo classificador
  de segurança do Claude Code como "enfraquecimento de segurança" (bypassar verificação de e-mail).
  Não tentei contornar — apaguei o usuário de teste (sem dados, só a linha em `auth.users`) e segui
  sem login real. Falta o usuário rodar `pnpm --filter qqorvex dev` e abrir pelo menos Tarefas,
  Agenda, Documentos, Vida Pessoal, Finanças e Segurança pra confirmar visualmente que nada ficou
  quebrado (typecheck/build garantem que compila e monta, não garantem que o espaçamento/alinhamento
  ficou bom). Criado `.claude/launch.json` (`qqorvex-dev`, porta 5173) pra próximas sessões
  conseguirem abrir a preview sem reconfigurar — necessário apontar `runtimeExecutable` pro
  `node .../pnpm/bin/pnpm.mjs` em vez de `pnpm`/`pnpm.cmd` direto, porque o binário nativo do pnpm
  instalado globalmente nunca terminou de se auto-instalar (mesma causa-raiz da pendência de
  "pnpm 12.3.4" registrada no topo deste arquivo) e o `.cmd` gerado pelo npm tenta chamar um
  caminho que não existe.
  **Confirmado em navegador real (15/09/2026)**: o usuário pediu explicitamente pra usar
  `khyron.box@gmail.com` como e-mail de cadastro de teste (endereços inventados sob
  `biocypher.tech` não existem de verdade, o e-mail nunca chega — registrado como preferência
  nova em memória, pra próximas sessões não repetirem o mesmo erro) e confirmou o cadastro pelo
  e-mail de verdade. Testado ao vivo: Tarefas (`TaskCard` como `Card` com destaque cyan +
  `ConfirmDialog` funcionando), Agenda (`DayAgenda`/`EventRow` idem), Finanças (`TransactionList`
  com `Badge tone="success"` "Concluída" + `ConfirmDialog`, Calendário Financeiro como `Card`),
  Vida Pessoal (`IdeaCard` + `ConfirmDialog`), Segurança (os 9 blocos como `Card`, `ConfirmDialog`
  em "Sair de todos os outros dispositivos" confirmado renderizando — via `find` no DOM, a captura
  de tela do navegador começou a falhar de forma intermitente no meio da sessão, provavelmente
  janela do preview atrás de outra no desktop do usuário, sem relação com o código). Nenhum
  problema visual encontrado. Usuário de teste (`khyron.box@gmail.com`) e todos os dados criados
  durante o teste (tarefa, evento, movimentação, ideia) apagados ao final, conforme pedido — sem
  pendência.

- **Segundo Cérebro — Editor de Blocos Rico, 2ª rodada (imagem/arquivo/link) — implementado**
  (15/09/2026, ver `docs/decisions/segundo-cerebro-editor-blocos-design.md`): dos 8 tipos
  deixados pra depois na v1, os 3 que reaproveitam infraestrutura já existente (upload/Storage de
  Documentos) — o resto (tabela, equação, embed, referência de página/entidade) fica pra uma 3ª
  rodada, cada um exigindo algo novo (grid de dados, renderer de matemática/KaTeX, iframe com
  sandboxing, picker de entidades). `imagem`/`arquivo` guardam só `{documentId: string | null}` —
  o Documento é sempre o dono do arquivo (reaproveita `uploadDocument()`/`getDownloadUrl()` de
  `@qqorvex/module-documentos`, nova dependência de workspace), o bloco só referencia, mesmo
  princípio do `AttachDocumentPanel`; "Trocar" só limpa a referência, nunca apaga o Documento.
  `link` guarda só `{url: string}` (sem `title` separado — YAGNI consciente, o texto da URL já é o
  rótulo). `BlockEditor` ganhou prop `userId` (novo, só usado por imagem/arquivo pra repassar pro
  `uploadDocument()`) e passa `useDocuments()` pra baixo; `SegundoCerebroPaginaPage` (app) passa
  `session.user.id`. Nenhuma migration — os 3 valores já existiam no enum `block_type` desde o
  início. Typecheck e build limpos no monorepo inteiro (18 projetos).
  **Confirmado em navegador real (15/09/2026)**, com uma reviravolta no processo: a primeira
  tentativa de upload do usuário deu "Falha no upload" — não era bug do bloco novo, era a mesma
  causa-raiz já documentada acima (sessão órfã de um teste anterior ainda em `localStorage`) se
  repetindo, porque eu tinha acabado de apagar outro usuário de teste sem lembrar de limpar a
  sessão do preview compartilhado dessa vez. Corrigido (limpei a sessão, resetei o bloco), pedi
  pro usuário testar de novo — mas o preview que aparece pra mim no pane compartilhado provou ser
  uma aba diferente da que o usuário usa (mudanças de um lado não aparecem automaticamente do
  outro sem recarregar), então troquei de estratégia: fiz o upload de verdade eu mesmo — busquei o
  arquivo de teste via `fetch()` de dentro do console do navegador (copiado antes pra
  `apps/qqorvex/public/`, servido pelo próprio Vite; tentar embutir a imagem como base64 direto no
  JS falhou com `atob` reclamando de encoding, não investiguei a causa exata, só troquei de
  abordagem) e chamei `uploadDocument()` de verdade contra o Supabase real, numa sessão
  autenticada de verdade — confirmando que o upload em si funciona (o "Falha no upload" original
  era mesmo só sessão órfã, não um bug novo). Com o Documento real criado, testei visualmente
  Imagem (prévia renderizada), Arquivo (nome + ícone 📎) e Link (com botão "Abrir"), troca de tipo
  pelo dropdown, "Trocar" (limpa a referência sem apagar o Documento — confirmado por SQL) e
  reordenar com ▲. **Lição de processo, além da de sessão órfã já registrada**: o preview
  compartilhado que aparece pra mim não é necessariamente a mesma aba que o usuário vê/usa —
  quando um teste depender de estado que só existe no navegador do usuário (tipo uma sessão
  recém-criada), ou eu confirmo tudo via SQL direto no Supabase (fonte de verdade real, não o
  DOM), ou aceito fazer a ação eu mesmo via console em vez de tentar sincronizar os dois lados.
  Usuário de teste e todos os dados (página, blocos, documento) apagados ao final — cascata
  confirmada por SQL. Sem pendência.

- **Segundo Cérebro — Editor de Blocos Rico, 3ª rodada (referência de página) — implementado**
  (15/09/2026, ver `docs/decisions/segundo-cerebro-editor-blocos-design.md`): dos 5 tipos que
  restavam depois da 2ª rodada, só este não exige nada novo (sem lib, sem infraestrutura) —
  reaproveita `usePages()` já existente, mesmo mecanismo do painel "Links internos" que já existia
  na página. Conteúdo `{pageId: string | null}`; sem página escolhida mostra um `<select>`
  (excluindo a própria página atual, igual "Links internos"); com página escolhida, mostra
  `<Link>` pro título (navega de verdade pra página referenciada) + botão "Trocar" (só zera
  `pageId`, nunca apaga a página). `BlockEditor` ganhou prop `currentPageId` (só o `pageId` já
  recebido, repassado por clareza) e passa `usePages()` pra baixo, igual fez com `useDocuments()`
  na 2ª rodada. Tabela, equação, embed e referência de entidade (cross-module, mais complexo que
  referência de página) ficam pra uma 4ª rodada. Nenhuma migration. Typecheck e build limpos no
  monorepo inteiro (18 projetos).
  **Confirmado em navegador real (15/09/2026)**: criei duas páginas de teste ("Pagina origem",
  "Pagina alvo"), adicionei um bloco "Referência de Página" na primeira apontando pra segunda,
  confirmei visualmente (📄 + título em cyan + "Trocar") e cliquei no link — navegou de verdade
  pra "Pagina alvo". Dessa vez o e-mail de confirmação atrasou (provavelmente limite de taxa do
  Supabase/Resend por reusar o mesmo endereço de teste várias vezes na mesma sessão) — usuário e
  eu esperamos alguns minutos e o e-mail chegou normalmente; não foi preciso nenhum outro
  contorno. Usuário de teste e as duas páginas apagados ao final — cascata confirmada por SQL. Sem
  pendência.

- **Segundo Cérebro — Editor de Blocos Rico, 4ª rodada (tabela) — implementado** (15/09/2026, ver
  `docs/decisions/segundo-cerebro-editor-blocos-design.md`): grid simples de strings
  (`{columns: string[], rows: string[][]}`), sem tipos de coluna nem fórmulas (isso já existe em
  Bases, propósito diferente — Bases é sobre Páginas com propriedades tipadas, Tabela aqui é só um
  grid solto dentro de uma página). Sem lib nova — `<table>` HTML puro. Padrão novo: célula/cabeçalho
  editável por `<input>` salvando no blur (igual todos os outros tipos), "+ Linha"/"+ Coluna" e ✕
  por linha/coluna pra remover (desabilitado quando resta só 1, pra nunca zerar a tabela sem
  querer). Overflow horizontal com scroll próprio (`overflow-x-auto`) pra tabelas largas não
  estourarem o layout da página. Nenhuma migration. Typecheck e build limpos no monorepo inteiro
  (18 projetos).
  **Confirmado em navegador real (15/09/2026)**: preenchi células, adicionei linha e coluna,
  removi uma coluna (a célula correspondente sumiu junto, confirmado por SQL) e removi uma linha —
  tudo persistindo certo no banco a cada ação. Usuário de teste e a página apagados ao final —
  cascata confirmada por SQL. Sem pendência.
  Com isso, a 4ª rodada do Editor de Blocos está fechada. Ficam pra uma 5ª rodada: equação
  (precisa de KaTeX ou similar), embed (precisa de estratégia de sandboxing de iframe) e
  referência de entidade (precisa de um picker cross-module) — os três exigem uma decisão de
  infraestrutura antes de implementar, diferente das rodadas 2/3/4 que só reaproveitaram o que já
  existia.

- **Segundo Cérebro — Editor de Blocos Rico, 5ª rodada (equação) — implementado** (15/09/2026, ver
  `docs/decisions/segundo-cerebro-editor-blocos-design.md`): conteúdo `{latex: string}`, renderiza
  com KaTeX (nova dependência, `katex@^0.18.7` + `@types/katex`) direto no navegador — sem
  servidor, sem serviço externo. Campo de fonte LaTeX (`<input>` de uma linha, mesmo padrão dos
  outros tipos de texto simples, incluindo Enter cria bloco novo) + prévia renderizada ao vivo
  logo abaixo (atualiza a cada tecla, não só no blur, porque `katex.render()` é barato — diferente
  de operações que batem no banco). LaTeX inválido mostra "Não consegui interpretar esse LaTeX."
  em vez de quebrar o bloco (`try/catch` em volta de `katex.render`).
  **`katex` é `import()` dinâmico, não estático** — mesmo padrão do Tesseract.js em
  `modules/gestao/documentos/src/ocr.ts`: a primeira tentativa usou `import katex from "katex"`
  estático no topo do arquivo e isso inflou o chunk principal do build de 598kB pra 861kB (172kB
  → 251kB gzip) — quem nunca usa um bloco de equação não deveria pagar esse custo de carregamento.
  Corrigido pra `import()` dinâmico dentro do `useEffect` que renderiza a prévia; o build voltou a
  598kB no chunk principal, com KaTeX isolado num chunk próprio de 262kB (78kB gzip) carregado só
  sob demanda. O CSS do KaTeX (`katex/dist/katex.min.css`) também é `import()` dinâmico, no mesmo
  ponto — só que isso expôs uma pegadinha de monorepo: `module-segundo-cerebro` é typecheckado
  por `tsc` puro (fora do Vite), que não sabe o que fazer com um import de `.css` sem uma
  declaração de módulo ambiente (`declare module "*.css"`) — precisei adicionar um `css.d.ts`
  local nesse pacote, e **também** em `packages/vex` (que reexporta ferramentas do Segundo
  Cérebro e, por importar o código-fonte via symlink do pnpm em vez de tipos compilados, acaba
  re-typecheckando o `BlockRow.tsx` sob seu próprio `tsconfig.json`, que não enxerga o `css.d.ts`
  do outro pacote). `apps/qqorvex` não precisou de nada porque já tem `"types": ["vite/client"]`
  no seu `tsconfig.json`, que já declara `*.css` globalmente. Nenhuma migration. Typecheck e build
  limpos no monorepo inteiro (18 projetos) depois da correção.
  **Confirmado em navegador real (15/09/2026)**: digitei `E = mc^2` e a prévia renderizou
  corretamente formatada (itálico, expoente); digitei um LaTeX quebrado (`\frac{1` sem fechar) e a
  mensagem de erro amigável apareceu sem quebrar o bloco nem a página. Usuário de teste e a página
  apagados ao final — cascata confirmada por SQL. Sem pendência.
  Ficam pra uma 6ª rodada: embed (sandboxing de iframe) e referência de entidade (picker
  cross-module).

- **Segundo Cérebro — Editor de Blocos Rico, 6ª rodada (referência de entidade) — implementado**
  (15/09/2026, ver `docs/decisions/segundo-cerebro-editor-blocos-design.md`): **v1 escopada só
  pra Tarefa** — decisão consciente, não pedida ao usuário antes de implementar (autonomia
  técnica reversível): Tarefas é o único módulo com um hook de "listar tudo" pronto
  (`useAllTasks()`); Eventos só tem `useEventsInRange()` (sempre por período, nunca "todos") —
  criar um hook novo só pra isso ficaria fora do espírito "reaproveitar o que já existe" das
  rodadas 2-5. Conteúdo `{entityType: "tarefa" | null, entityId: string | null}` — `entityType` já
  é um union aberto (não hard-coded só "tarefa") pra outros tipos entrarem sem migrar o formato
  depois. **Sem link navegável** — diferente de referência de página, Tarefas não tem rota de
  detalhe por item (só Kanban/Lista), então o bloco mostra um resumo inline read-only (📌 título +
  badge de status, lido ao vivo de `tasks` já carregado) em vez de um `<Link>`. Nova dependência
  de workspace: `module-segundo-cerebro` → `@qqorvex/module-tarefas` (sem ciclo — tarefas não
  depende de segundo-cerebro). Nenhuma migration. Typecheck e build limpos no monorepo inteiro (18
  projetos).
  **Confirmado em navegador real (15/09/2026)**: criei uma tarefa de teste, um bloco de referência
  apontando pra ela, e o resumo apareceu certo (📌 "Tarefa para referenciar" + badge "Não
  iniciado"). Usuário de teste, a página e a tarefa apagados ao final — cascata confirmada por
  SQL. Sem pendência.
  Com isso, a 6ª rodada está fechada. Fica só **embed** pra uma 7ª rodada (sandboxing de iframe —
  decisão de segurança, não só técnica) e mais tipos de entidade pra Referência de Entidade quando
  fizer sentido (Evento primeiro candidato, mas precisa de um hook "listar tudo" novo em
  `module-agenda` antes).

- **Segundo Cérebro — Editor de Blocos Rico, 7ª rodada (embed) — implementado, roteiro dos 19
  tipos completo** (15/09/2026, ver `docs/decisions/segundo-cerebro-editor-blocos-design.md`):
  a mais sensível das 7 rodadas por envolver conteúdo externo embutido via iframe — decisão de
  segurança, resolvida sem pedir aprovação prévia porque a abordagem escolhida é a mais
  conservadora possível, não a mais permissiva (decisão técnica reversível, dentro da autonomia já
  combinada). **Nunca renderiza um iframe de URL arbitrária** — `resolveEmbedUrl()` (novo, em
  `service.ts`) só converte URLs que batem com uma lista fixa de 5 provedores conhecidos (YouTube,
  Vimeo, Spotify, Figma, CodePen) pra sua URL de embed oficial; qualquer outra URL retorna `null`
  e a UI mostra "Esse link não é suportado" em vez de tentar embutir — sem essa checagem, um bloco
  de embed seria uma porta pra clickjacking/phishing disfarçado de conteúdo confiável. O iframe em
  si usa `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"` (sem
  `allow-top-navigation`, de propósito — o embed nunca pode navegar a aba pra fora da página).
  Conteúdo `{url: string}` — guarda a URL crua como o usuário colou, nunca a URL de embed
  transformada (a lógica de conversão pode evoluir sem precisar migrar dado já salvo). Nenhuma
  migration. Typecheck e build limpos no monorepo inteiro (18 projetos).
  **Bug real encontrado e corrigido durante o teste ao vivo**: a primeira versão usava
  `referrerPolicy="no-referrer"` no iframe (pensando em privacidade — não vazar a URL da nota pro
  provedor externo) e isso quebrou o embed do YouTube de verdade (Erro 153, "erro de configuração
  do player" — o YouTube exige conseguir ver a origem de quem está pedindo o embed pra liberar,
  mesmo pra vídeos sem nenhuma restrição, como o clássico "Never Gonna Give You Up" usado no
  teste). Corrigido pra `referrerPolicy="strict-origin-when-cross-origin"` (padrão do navegador —
  manda só a origem, não a URL completa da nota; ainda protege mais que o padrão de não mandar
  nada, sem quebrar os provedores). **Confirmado em navegador real (15/09/2026)**: link do YouTube
  renderizou o player de verdade (thumbnail + botão de play) depois da correção; link de um site
  qualquer (`example.com`) mostrou a mensagem "não suportado" corretamente, sem tentar embutir
  nada. Usuário de teste e a página apagados ao final — cascata confirmada por SQL. Sem pendência.
  **Com isso, o roteiro original dos 19 tipos de bloco do Editor de Blocos Rico está completo.**
  Fica só mais tipos de entidade pra Referência de Entidade, quando fizer sentido (Evento é o
  próximo candidato natural, precisa de um hook "listar tudo" novo em `module-agenda` primeiro).

- **Auditoria de segurança Supabase (advisors) — feita e corrigida (15/09/2026)**: com o roteiro
  do Editor de Blocos fechado, rodei `get_advisors(type=security)` como próximo passo crítico
  (app guarda PIN de cofre, documentos e dados financeiros — vale auditar antes de acumular mais
  features). Achados:
  - **Corrigido**: `has_security_pin`, `set_security_pin` e `verify_security_pin` (as 3 funções do
    PIN do Cofre) estavam com `EXECUTE` liberado pra `PUBLIC` (inclui `anon`), diferente de
    `list_my_sessions`/`revoke_my_session` que já restringiam a `authenticated`. Não era explorável
    hoje (todas checam `auth.uid()` internamente e falham sem sessão), mas era uma inconsistência
    de defesa-em-profundidade num app que guarda PIN de cofre — pedi aprovação explícita do usuário
    (é alteração em produção, bloqueada pelo classificador de permissão) e apliquei a migration
    `restrict_security_pin_functions_to_authenticated` (`REVOKE EXECUTE ... FROM public` +
    `GRANT ... TO authenticated` nas 3 funções). Advisor confirmou o achado sumiu depois.
  - **Revisado, correto por design, sem ação**: `app_secrets` tem RLS habilitado sem nenhuma
    policy — o advisor sinaliza isso como INFO, mas é exatamente o comportamento desejado pra uma
    tabela de segredos (nega acesso via PostgREST pra todo mundo; só `service_role`, que ignora
    RLS, deveria tocar nela). As 5 funções `SECURITY DEFINER` chamáveis por `authenticated`
    (PIN do Cofre + sessões) também são esperadas — é assim que a UI de `/seguranca` funciona,
    cada uma já filtra por `auth.uid()` internamente.
  - **Fora do escopo, decisão consciente do usuário (15/09/2026)**: "Leaked Password Protection"
    (checagem de senha vazada via HaveIBeenPwned) está desabilitada no projeto — não é um bug nem
    uma pendência de implementação, é um recurso exclusivo do **plano Pro do Supabase**
    (confirmado na doc oficial: "Leaked password protection is available on the Pro Plan and
    above"). O usuário está no plano gratuito e decidiu não assinar só por causa disso. Sem ação
    prevista; revisitar só se o projeto migrar pro plano Pro por outro motivo.

- **Segundo Cérebro — Referência de Entidade, 8ª rodada (Evento) — implementado** (15/09/2026, ver
  `docs/decisions/segundo-cerebro-editor-blocos-design.md`): o único item de infraestrutura
  pendente pro roteiro original de Referência de Entidade era um hook de "listar tudo" pra Evento
  (`module-agenda` só tinha `useEventsInRange()`, sempre por período). Adicionado
  `listAllEvents()`/`useAllEvents()` em `modules/organizacao/agenda`, mesmo padrão de
  `listAllTasks()`/`useAllTasks()` de `module-tarefas`. `EntityReferenceType` virou
  `"tarefa" | "evento"`. Picker agora tem `<optgroup>` "Tarefas"/"Eventos" (valor combinado
  `"tipo:id"` pra um único `<select>` continuar funcionando com os dois tipos sem estado
  intermediário). Resumo inline de evento: 📅 + título + data curta (`dd/mm`, extraída de
  `start_at`) — segue o mesmo padrão do resumo de tarefa (📌 + título + badge de status), sem link
  navegável, mesma razão de tarefa (Agenda não tem rota de detalhe por evento). Nova dependência de
  workspace: `module-segundo-cerebro` → `@qqorvex/module-agenda` (sem ciclo). Nenhuma migration.
  Typecheck e build limpos no monorepo inteiro (18 projetos).
  **Confirmado em navegador real (15/09/2026)**: criei uma tarefa e um evento de teste, um bloco de
  referência apontando pro evento (resumo "📅 Evento para referenciar (teste) · 15/09" apareceu
  certo, confirmado por SQL: `content = {"entityType":"evento","entityId":"..."}`), cliquei
  "Trocar" e apontei o mesmo bloco pra tarefa (resumo "📌 ... · Não iniciado" apareceu certo) —
  os dois caminhos do picker combinado funcionando. Usuário de teste, página, tarefa e evento
  apagados ao final — cascata confirmada por SQL (0 linhas órfãs). Sem pendência.

- **Testes automatizados (Vitest) — infraestrutura criada e 87 testes escritos (15/09/2026)**:
  com o roteiro de features e a auditoria de segurança fechados, o item de maior risco silencioso
  que restava era técnico, não de produto — o monorepo tinha **zero arquivos de teste** apesar de
  `pending.md` descrever repetidamente funções como "puras (testadas isoladamente)" ao longo de
  toda a sessão original (ex.: `computePlanPeriod`, `computeInstallmentAmounts`,
  `computeStatementDueDate`) — essas verificações foram manuais/ad-hoc na hora da implementação,
  nunca viraram um teste que sobrevive a uma mudança futura. O root `package.json` já tinha um
  script `"test": "pnpm -r --if-present test"` apontando pra essa lacuna, só que nenhum pacote
  tinha `vitest` nem um script `test` de verdade.
  **Setup**: `vitest@^3` (par de versão do Vite 6 já usado no app) como devDependency única na
  raiz, `vitest.config.ts` também na raiz (`environment: "node"`, `include` cobrindo
  `modules/**/*.test.ts` e `packages/**/*.test.ts`) — uma config só, não uma por pacote, porque
  testes de função pura não precisam do isolamento de `tsconfig` que `typecheck` tem por pacote.
  `package.json` raiz: `"test": "vitest run"`.
  **Cobertura**: `service.test.ts` ao lado de cada `service.ts` com função pura em 8 módulos —
  `financas` (19 testes: saldo atual/projetado, saldo de conta com transferência, gasto por
  veículo, próxima ocorrência de recorrência incluindo virada de ano, parcelamento com resto de
  centavos absorvido na última parcela, fechamento/vencimento/período de fatura de cartão),
  `vida-pessoal` (9: rótulo e período de Plano nos 3 tipos incluindo mês de dezembro e virada de
  década, contagem de Pomodoros por dia/semana), `gamificacao` (7: curva de nível/XP, progresso,
  título por faixa, catálogo de badges), `documentos` (6: data de garantia, caminhos de storage,
  expiração da Lixeira), `tarefas` (8: condição Atrasada/Bloqueada derivada — inclusive o caso de
  uma tarefa cancelada com prazo vencido não contar como atrasada —, detecção de ciclo de
  dependência direto e indireto, próxima ocorrência de recorrência), `estudos` (12: algoritmo de
  repetição espaçada tipo SM-2 nos 4 graus de resposta incluindo o piso do ease factor, validação
  do JSON de quiz gerado por LLM com formatos e casos inválidos, correção de quiz),
  `metas-habitos` (11: progresso por marcos, sequência de hábito consecutiva que quebra sem
  registro, progresso derivado saturando em 0–100%), `biblioteca` (6: progresso percentual/
  numérico, normalização de título, detecção de duplicata) e `agenda` (9: detecção de conflito de
  horário incluindo buffers, busca de intervalos livres, montagem da URL de OAuth do Google,
  próxima ocorrência de evento recorrente). 87 testes, todos passando.
  **1 bug real encontrado e corrigido no próprio teste**: o teste de `computePlanPeriod`/
  `computePlanLabel` usava `"longo_prazo"` como `PlanType`, mas o enum real (`NewPlanForm.tsx`) é
  `"quinquenal"` — erro só do teste em si (o código de produção sempre esteve certo), pego pelo
  `typecheck` do pacote, corrigido antes de commitar. Typecheck limpo nos 18 projetos (os
  `.test.ts` são typecheckados junto de cada pacote, sem config `vitest/globals` extra porque os
  testes importam `describe`/`it`/`expect` de `"vitest"` em vez de depender de globals). Build de
  produção idêntico ao anterior (599.33 kB no chunk principal) — nenhum `.test.ts` vaza pro bundle.
  Sem migration, sem UI, sem teste de navegador (é infraestrutura de desenvolvimento, não uma
  feature visível). Rodar com `pnpm test` (ou `npx vitest run`) na raiz.

- **Redesign visual completo — Design System v1.0 "Balanced Vex" aplicado (16/09/2026)**: depois
  de 4 rodadas de brainstorming visual malsucedidas nesta sessão (ver
  `docs/decisions/redesign-visual-brainstorm.md` pro histórico completo — a descoberta dos assets
  reais da Vex em `Vex/`/`Logotipos/`, o briefing "produto de verdade + lar da Vex", a referência
  da Persona 5), o usuário levou o design pra uma sessão separada e trouxe de volta **já aplicado
  direto no código** (103 arquivos, +7303/-3927 linhas, não commitado). Repo virou git de verdade
  nesse meio tempo (não era antes). Verifiquei tudo: typecheck limpo nos 18 projetos, build limpo
  (644kB no chunk principal), 87/87 testes passando, confirmado ao vivo no navegador (login com
  arte de corpo inteiro da Vex, Hoje com anel de nível e card ambiente da Vex, Finanças com o
  painel lateral da Vex reconhecendo "contexto atual"). Nova paleta mais contida/dessaturada
  (`#090b0e`/gold `#b88a54`/cyan `#43b9d2`) que a v1 baseada só no Xmind, sistema de classes `qv-*`
  em `tokens.css`, novo shell (`apps/qqorvex/src/app/shell/`: header, paleta de comando Cmd+K,
  painel da Vex), páginas novas (`AuthLayout`, `Gamificacao`, `Perfil`). Detalhes completos em
  `docs/design-system/tokens.md`, que agora é a fonte de verdade do design system (a versão
  anterior deste arquivo estava obsoleta). `designq.zip` (40MB, material bruto trazido da outra
  sessão) e `.superpowers/` adicionados ao `.gitignore`. **Pendências reais**: nada commitado
  ainda (perguntar antes do primeiro commit); decidir o que fazer com `designq.zip` em disco.

## Próximo passo lógico (arquitetural, não precisa de aprovação para começar)
1. ~~Vex Context Engine (7 fases completas)~~, ~~Estudos — Quiz/Testes gerados pela Vex~~ e
   ~~Biblioteca — detecção de duplicados~~ implementados nesta sessão (11/09/2026). Mesclagem de
   itens da Biblioteca continua fora do escopo por decisão consciente (ver entrada de Biblioteca
   acima), não é mais um "próximo passo" pendente.
2. ~~`packages/auth`: sessões/dispositivos~~ e ~~PIN do Cofre (+ barreira do Cofre da Vex evoluída
   pra "autorizar com PIN")~~ implementados (11/09/2026, ver entradas acima). Os 3 sub-projetos da
   Central de Segurança identificados nesta rodada estão fechados. Desbloqueio geral do app
   (diferente do PIN do Cofre) e sessões/dispositivos mais avançado (ex.: nomear dispositivos)
   continuam fora do escopo, só se surgirem como pendência nova.
