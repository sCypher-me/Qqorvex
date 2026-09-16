# Qqorvex — Arquitetura (resumo operacional)

Fonte de verdade completa: Xmind `Qqorvex` + `Continuação Qqorvex` (fora do repo). Este arquivo é
memória operacional condensada — não substitui os Xmind em caso de dúvida real.

## Regra de ouro
Custo de desenvolvimento e operação inicial = **R$0** (priorizar free tier / open source).
Idioma inicial: pt-BR, mas nada pode ser hardcoded de um jeito que impeça i18n futuro.

## Camadas
`apps/` (aplicação), `modules/` (domínios de produto), `packages/` (compartilhado), `supabase/` (backend).

- **Hoje** é agregador puro — nunca fonte de dados.
- **Vex nunca acessa o banco diretamente** — só via ferramentas/tools que chamam repositories dos módulos.
- **Módulos não acessam internals uns dos outros** — só a API pública (`index.ts`) de cada módulo.
- Fontes de verdade por domínio (não duplicar dados):
  - Tarefas → `modules/organizacao/tarefas`
  - Metas/Hábitos → `modules/organizacao/metas-habitos`
  - Estudos (Cadernos) → `modules/conhecimento/estudos`
  - Segundo Cérebro (páginas/blocos/bases) → `modules/conhecimento/segundo-cerebro`
  - Biblioteca (livros/filmes/séries/etc.) → `modules/conhecimento/biblioteca`
  - Gamification Core (Level/XP/Badges/Títulos) → `modules/pessoal/gamificacao`, fonte única; Perfil só referencia.
  - Auth/Backend → fonte única de credenciais, sessões, métodos de acesso.
- Sync desacoplado dos módulos: `UI → módulo → repository → local/cloud → Sync Engine`.
- Design System centralizado em `packages/design-system` (tokens/temas/tipografia/breakpoints/animações), consumido igualmente por Web/Windows/Android.
- Tutorial guiado é orientado a eventos públicos dos módulos, nunca escreve direto nos dados.

## Estrutura de pastas alvo (ver árvore completa nos Xmind)
```
apps/qqorvex        # React + Vite, empacotado via Tauri p/ Windows e Android
packages/           # ui, design-system, auth, billing, entitlements, admin, database,
                     # storage, sync, offline, vex, guided-tour, notifications,
                     # analytics, security, validation, config, shared
modules/            # hoje, gestao/{financas,documentos}, organizacao/{tarefas,agenda,metas-habitos},
                     # conhecimento/{estudos,segundo-cerebro,biblioteca}, pessoal/vida-pessoal
supabase/           # migrations, functions, seed
docs/               # este diretório (memória operacional)
```
Módulos são criados sob demanda, à medida que forem implementados — não criar centenas de
pastas vazias antecipadamente.

## Status atual (ver docs/decisions/pending.md para pendências)
- Monorepo pnpm + TS + Vite + React 19 + Tailwind v4 funcionando (`pnpm --filter qqorvex dev`).
- Testes automatizados: `vitest` na raiz (`pnpm test`), `service.test.ts` cobrindo as funções
  puras de 8 módulos (87 testes). Ver entrada de 15/09/2026 em `docs/decisions/pending.md`.
- `packages/design-system` com tokens reais de cor/tipografia extraídos do Xmind.
- `packages/ui` com primeiro componente (`Button`) usando os tokens.
- `apps/qqorvex` com shell de rotas (`/` Hoje, `/login` Login) — placeholders visuais, sem lógica.
- Supabase criado e conectado (projeto `qqorvex`, `sa-east-1`, free tier): schema `profiles` com
  RLS, trigger de auto-criação no signup, e advisors de segurança limpos. Ver `docs/decisions/pending.md`.
- `packages/database` (client Supabase + tipos gerados) e `packages/auth` (`AuthProvider`,
  `useAuth`, `RequireAuth`) prontos e testados ponta a ponta.
- `/login` funcional (entrar/criar conta por e-mail+senha); `/` (Hoje) protegida por auth real.
- 2FA (TOTP) implementado (10/09/2026) via MFA nativo do Supabase Auth: `/seguranca` pra ativar/
  desativar, `RequireAuth` redireciona pra `/mfa` quando a sessão está em `aal1` mas o usuário tem
  2FA ativo. Testado ponta a ponta (11 checks) gerando um TOTP real e confirmando a transição
  `aal1`→`aal2`. Passkey/WebAuthn (11/09/2026, 2 rodadas — a 1ª usou `mfa.webauthn`, que não é
  ativo no Supabase Cloud; corrigido pra API certa, ver `docs/decisions/pending.md`):
  `auth.registerPasskey()`/`auth.signInWithPasskey()`/`auth.passkey.*` — não é um 2º fator
  empilhado sobre a senha, é login alternativo sem senha. Exige `experimental: { passkey: true }`
  no `createSupabaseClient()` (`packages/database`) + "Enable Passkey authentication" no painel.
  `/seguranca` ganhou seção "Passkeys" (cadastrar/renomear/remover), `/login` ganhou "Entrar com
  Passkey". Confirmado pelo usuário no navegador em 11/09/2026 (cadastro e login funcionando).
  Edição de Perfil (11/09/2026): `profile.ts`/`useProfile.ts` (nome de exibição,
  username, bio — a linha em `profiles` já existia desde o início via trigger, só faltava
  ler/escrever nela); seção "Perfil" no topo de `/seguranca`. Testado ao vivo contra o Supabase
  real (dado original restaurado ao final).
  **Central de Segurança — Sessões/dispositivos (11/09/2026)**, primeiro sub-projeto da Central de
  Segurança completa (PIN é o próximo, ver `docs/decisions/central-seguranca-sessoes-design.md`):
  o schema `auth` não é exposto pela API automática do Supabase, então listar/revogar sessões
  passa por duas funções Postgres novas (`list_my_sessions`/`revoke_my_session`, `security
  definer`, só `auth.uid()`) em vez de tabela com RLS — `revoke_my_session` recusa revogar a
  própria sessão atual. "Sair de todos os outros" reaproveita `signOut({ scope: "others" })`, já
  pronto no SDK. Novo `packages/auth/src/sessions.ts` + `useSessions.ts`; seção "Dispositivos" em
  `/seguranca`. Testado simulando `auth.uid()`/`auth.jwt()` via `set_config` contra sessões reais:
  listagem correta, recusa de auto-revogação, revogação de sessão diferente e isolamento entre
  usuários confirmados.
  **Central de Segurança — PIN do Cofre (11/09/2026)**, terceiro sub-projeto (ver
  `docs/decisions/central-seguranca-pin-design.md`): PIN destrava só o Cofre de Documentos, não o
  app inteiro. `profiles.pin_hash` (`pgcrypto` bcrypt) + `has_security_pin`/`set_security_pin`/
  `verify_security_pin` (`security definer`); 6 dígitos mínimo, 5 erros bloqueiam por 5 minutos.
  Dois bugs reais de segurança corrigidos no teste: `create or replace` com assinatura nova cria
  *overload* em vez de substituir (a versão antiga sem exigir PIN atual ficou viva — corrigido com
  `drop function` explícito) e `set_security_pin` não respeitava o bloqueio de tentativas ao
  validar o PIN atual (segunda porta pra força bruta — corrigido). `@qqorvex/module-documentos`
  ganhou `toggleVault()`; `/documentos` mascara documentos do Cofre até desbloquear com o PIN
  (sessão de navegação, não persiste). Vex: `toggle_important_by_name` aceita `pin` opcional —
  documento do Cofre só é tocado com PIN correto (verificado no servidor); `list_documents`
  continua sempre excluindo o Cofre. PIN pedido na própria conversa da Vex (reaproveita "pergunte
  o que falta" da Fase 4), trade-off consciente de ficar no histórico (100% privado por RLS).
- Fontes oficiais (Space Grotesk, Manrope, JetBrains Mono) auto-hospedadas em
  `packages/design-system/src/fonts` (só subsets latin/latin-ext, pesos usados pela hierarquia
  tipográfica), sem dependência de Google Fonts/CDN em runtime.
- `modules/hoje` criado como agregador puro: expõe `registerHojeProvider()` (para módulos
  contribuírem itens) e `useHojeSummary()` (consumido pela página Hoje).
- **`modules/organizacao/tarefas`** (`@qqorvex/module-tarefas`) implementado — primeiro módulo de
  domínio real: tabelas `tasks`/`task_checklist_items`/`task_dependencies` com RLS, Kanban de
  exatamente 3 estados (`nao_iniciado`/`em_andamento`/`concluido`), condições derivadas
  (atrasada/bloqueada, nunca persistidas como estado extra), detecção de ciclo de dependências na
  camada de serviço, captura rápida (só título obrigatório), hooks TanStack Query, e um
  `createTasksHojeProvider()` que alimenta o Hoje sem o Hoje conhecer o módulo. Kanban com drag &
  drop entre colunas (`@dnd-kit/core`, 10/09/2026) além dos botões "mover para" (mantidos como
  alternativa acessível/touch). Rota `/tarefas` no app. Testado ponta a ponta com usuário real
  (signup+RLS+CRUD+enum+trigger+checklist+dependência). "Todas as Tarefas" + Tags & Filtros
  (11/09/2026, autônomo): `listAllTasks()` (sem os filtros de `listActiveTasks()`, que continua
  intocado), `updateTaskCancelled()`, componente `TaskListView` (filtro status/prioridade/tag +
  "mostrar canceladas"), aba nova em `/tarefas`. Corrigiu um bug real de `deriveTaskConditions()`
  no processo: "atrasada" não checava `is_cancelled` (nunca aparecia antes porque
  `listActiveTasks()` sempre excluía canceladas primeiro).
  **Tarefas recorrentes (12/09/2026, ver `docs/decisions/tarefas-recorrentes-design.md`)**:
  frequências diária/semanal/mensal; `recurring_tasks` nova (reaproveita `recurring_status` já
  criado por Finanças). Geração **automática via cron**, diferente do padrão manual de Finanças —
  a Edge Function `send-notifications` ganhou uma 5ª fonte que gera a ocorrência e avisa por push,
  reimplementando `computeNextTaskOccurrenceDate()` linha por linha (verificado idêntico). Tarefa
  gerada é independente da recorrência depois de criada. `RecurringTasksPanel` em nova aba
  "Recorrentes" de `/tarefas`. Testado ao vivo em produção via chamada direta à Edge Function
  (geração, avanço de data, catch-up incremental, recorrência pausada ignorada).
- **`modules/organizacao/agenda`** (`@qqorvex/module-agenda`) implementado — segundo módulo de
  domínio: tabelas `events`/`event_reminders` com RLS, `task_id` como referência opcional a
  Tarefas (`on delete set null`, relação nunca cópia), detecção de conflito por sobreposição
  (`findConflicts`, considerando buffers) exigindo confirmação explícita antes de criar mesmo
  assim, busca de horário livre (`findFreeSlots`), captura rápida de evento (`QuickEventForm`), e
  `createAgendaHojeProvider()` alimentando o Hoje. Calendário Completo (10/09/2026): seletor de
  visão Dia (`WeekStrip` + `DayAgenda`) / Semana (`WeekView`, eventos de cada dia já visíveis) /
  Mês (`MonthView`, grade de 6 semanas) / Lista (`ListView`, próximos 60 dias agrupados por data) /
  Reuniões (`MeetingsView`, recorte por `category === "reuniao"` com botão "Entrar" no
  `meeting_link`; `QuickEventForm` ganhou seletor de categoria + campo de link, sem formulário
  paralelo — passa pela mesma checagem de conflito), todas sobre `listEventsInRange()` e os
  utilitários puros de `dateUtils.ts`. `QuickEventForm` ganhou seletor de lembrete (5min–1 dia
  antes), criando o `event_reminders` junto com o evento. Rota `/agenda` no app. Integração Zoom (11/09/2026, Fase 1 de
  `docs/decisions/integracoes-agenda-design.md`): app Zoom Server-to-Server (sem redirecionamento
  OAuth por usuário — o app é de conta única), credenciais em `app_secrets`. Nova Edge Function
  `create-zoom-meeting` (`verify_jwt=true` — diferente de `send-notifications`, que é acionada
  pelo cron; esta é acionada por um usuário logado) só fala com a API do Zoom, nunca escreve no
  banco. `createZoomMeeting()`+`useCreateZoomMeeting()` chamam a função e depois `createEvent()`
  (já existente) com o `join_url` — reaproveita `findConflicts()` sem duplicar lógica.
  `NewZoomMeetingForm` na aba Reuniões cria reunião+evento numa ação só. Dois bugs corrigidos
  durante o teste ao vivo: CORS (primeira função chamada direto do navegador — precisa de
  cabeçalhos CORS e responder `OPTIONS`) e mensagem de erro genérica do supabase-js (o corpo real
  do erro vem em `error.context`, não em `error.message`). Confirmado pelo usuário no navegador —
  reunião criada de verdade no Zoom, evento com link funcionando na Agenda. Fase 2 — Google
  Calendar (11/09/2026): `events.google_event_id`/`google_updated_at` (relação 1:1, sem tabela de
  mapeamento); `google_calendar_connections` (RLS: usuário só lê/apaga a própria, só a Edge
  Function escreve), `pending_google_deletions` (`deleteEvent()` insere aqui sem mudar o
  comportamento de exclusão que já existia), `google_oauth_states` (token opaco de `state`, evita
  segredo de assinatura no cliente). Edge Functions `google-oauth-callback` (`verify_jwt=false` —
  é o Google chamando via redirecionamento, troca código por `refresh_token`, cria o calendário
  dedicado "Qqorvex") e `sync-google-calendar` (`verify_jwt=false`, `pg_cron` a cada 10 min, mesmo
  segredo de `send-notifications` — processa exclusões pendentes, sincroniza os dois sentidos,
  "quem editou por último vence"). `GoogleCalendarSection` na seção "Integrações" de `/seguranca`.
  Três bugs reais corrigidos no teste ao vivo: RLS faltando em `google_oauth_states` (precisa de
  policy de SELECT mesmo pro próprio usuário, porque `.insert().select()` relê a linha inserida),
  Google Calendar API não ativada no Cloud Console (erro claro do próprio Google), e o timestamp
  de corte (`last_synced_at`) sendo calculado cedo demais — antes dos próprios `update()` da
  função, que rebatem `events.updated_at` via trigger, causando reenvio infinito do mesmo evento.
  **Confirmado pelo usuário nos 3 sentidos**: push, pull (calendário "Qqorvex" correto, não o
  pessoal) e exclusão propagada via `pending_google_deletions`. Sincronizando de verdade a cada 10
  minutos. Ver `docs/decisions/pending.md` para o histórico completo dos bugs.
  **Eventos recorrentes (12/09/2026, ver `docs/decisions/eventos-recorrentes-design.md`)**: segundo
  e último sub-projeto de "recorrência" (Tarefas recorrentes veio antes — ver entrada própria).
  `recurring_events` reaproveita os enums `task_recurrence_frequency`/`recurring_status` (sem
  duplicar); `start_time`/`end_time` guardam só a hora, a data vem de `next_occurrence_date`.
  Decisão-chave: geração automática colidindo com outro evento **cria mesmo assim e avisa por
  push** (sem ninguém pra confirmar "criar mesmo assim" no momento do cron) — `send-notifications`
  reimplementa `findConflicts()` só pra escolher a mensagem. Sincronização com Google Calendar não
  precisou de mudança nenhuma — a ocorrência é só mais uma linha em `events`, `sync-google-calendar`
  já a pega sozinha. `RecurringEventsPanel` em nova aba "Recorrentes" de `/agenda`. Testado
  isoladamente (verificação cruzada do conflito contra `findConflicts()` original) e ao vivo em
  produção (geração, criação mesmo com conflito forçado, pausa respeitada).
- **Infraestrutura de notificações (Web Push + pg_cron + Edge Function)** implementada
  (11/09/2026): novo pacote `@qqorvex/notifications` (inscrição/desinscrição do navegador,
  service worker em `apps/qqorvex/public/sw.js`) + Edge Function `send-notifications` (Deno,
  `npm:web-push`, autenticada por segredo compartilhado guardado em `app_secrets` — não por JWT)
  rodando via `pg_cron`/`pg_net` a cada 5 minutos, já ativa em produção. Seis fontes ligadas
  (11/09–12/09/2026, testadas em produção com dados reais): lembretes de evento da Agenda
  (`event_reminders.sent_at` evita notificar 2x), alertas de orçamento estourado em Finanças
  (`budgets.alert_sent_at`, total gasto somado de `transactions` na hora, nunca persistido),
  lembrete de hábito diário ainda não registrado em Metas & Hábitos
  (`habits.last_reminder_sent_date`, só `frequency_type = 'diaria'` com `preferred_time` — v1
  lean consciente), lembrete de fatura de cartão perto do vencimento
  (`card_statements.due_reminder_sent_at` — fechamento/vencimento reimplementados na Edge Function
  a partir das mesmas fórmulas de `@qqorvex/module-financas`, já que a função não importa pacotes
  do monorepo; cria a fatura antecipadamente se preciso, mesmo comportamento de
  `getOrCreateCurrentStatement()` disparado pelo cron em vez de um clique), geração automática de
  Tarefas recorrentes (`recurring_tasks`, reimplementa `computeNextTaskOccurrenceDate()` de
  `@qqorvex/module-tarefas` linha por linha — ver entrada própria acima), e geração automática de
  Eventos recorrentes (`recurring_events`, reimplementa `computeNextEventOccurrenceDate()` e
  `findConflicts()` de `@qqorvex/module-agenda` — ver entrada própria acima). Seção "Notificações"
  em `/seguranca`. Chaves VAPID geradas localmente (sem serviço pago). Testado em produção (auth
  por segredo, lembrete vencido processado e marcado, lembrete futuro ignorado, inscrição
  inválida tratada sem derrubar a função, janela de vencimento de fatura respeitada e idempotente
  — este último teste removeu a inscrição push real temporariamente pra não disparar notificação
  de verdade durante o teste noturno, restaurada logo depois); entrega real confirmada pelo
  usuário em 11/09/2026 (ativou notificações de verdade, recebeu um push de teste no
  dispositivo).
- **`modules/organizacao/metas-habitos`** (`@qqorvex/module-metas-habitos`) implementado —
  terceiro módulo de domínio: `goals`/`goal_milestones`/`goal_checkins`/`habits`/`habit_logs`/
  `goal_habit_relations`, todos com RLS. Hierarquia de metas limitada a principal+submeta
  (validado em `service.ts`, não no banco); progresso "derivado" acompanha o saldo absoluto de uma
  Conta de Finanças vs. um valor-alvo (ver entrada própria abaixo); progresso "por marcos" é
  calculado a partir dos marcos concluídos; `computeCurrentStreak()` calcula sequência de hábito
  sem linguagem punitiva.
  `createGoalsHabitsHojeProvider()` alimenta o Hoje com metas de prazo próximo e hábitos previstos
  para hoje. Rotinas (10/09/2026): `routines`/`routine_habits` (junção N:N, mesmo padrão de
  `goal_habit_relations`), `RoutinesPanel` agrupa hábitos para check-off em conjunto (Concluído/
  Parcial/Pulado do dia para todos de uma vez). Lembrete de hábito diário via notificações push —
  ver "Notificações — terceira fonte" mais abaixo. Relação meta↔hábito exposta na UI (11/09/2026,
  autônomo): `unlinkGoalHabit()` novo, `GoalCard` ganhou seção "Hábitos vinculados" (a tabela já
  existia, só faltava UI — mesmo padrão de `document_type`/forma de pagamento nesta sessão). Rota
  `/metas-habitos` no app. Sem Revisão Semanal nem Insights — "recursos opcionais" no próprio
  Xmind. Testado ponta a ponta com usuário real.
  **Progresso "derivado" de Finanças implementado (12/09/2026, ver
  `docs/decisions/metas-progresso-derivado-design.md`)**: meta derivada acompanha o saldo absoluto
  de uma Conta específica (`goals.progress_source_account_id`, `on delete set null`) vs.
  `progress_numeric_target`. Nova `computeAccountBalance()` em `@qqorvex/module-financas` (soma
  entrada/saída/transferência da conta, só `concluida`) e `computeDerivedProgress()` em
  `@qqorvex/module-metas-habitos` — módulo passou a depender de `@qqorvex/module-financas`
  diretamente (mesmo precedente de Estudos importando Agenda/Biblioteca). `GoalCard` ganhou seção
  "Progresso financeiro" (vincular Conta+alvo dentro do card já criado — `NewGoalForm` continua só
  título). Testado isoladamente (9 checks) e ao vivo (`on delete set null` confirmado).
- **`modules/conhecimento/estudos`** (`@qqorvex/module-estudos`) implementado — quarto módulo de
  domínio: `notebooks` (Cadernos), `topics`, `summaries`, `flashcards` + `flashcard_reviews`,
  `errors_doubts`, `assessments`, `study_sessions`, todos com RLS via join ao Caderno dono.
  Algoritmo de revisão espaçada (`computeNextReview`, variante SM-2) isolado em `service.ts` —
  substituível sem tocar schema ou histórico, como o Xmind exige. Hierarquia de tópico limitada a
  1 nível (mesmo padrão de Metas). Deletar um tópico nunca apaga resumos/flashcards relacionados
  (`on delete set null`). `createEstudosHojeProvider()` alimenta o Hoje com contagem de flashcards
  vencidos e avaliações próximas. Rotas `/estudos` e `/estudos/:notebookId`. Testado ponta a ponta
  com usuário real, incluindo a matemática da repetição espaçada.
  **Quiz/Testes gerados pela Vex implementados** (11/09/2026, ver
  `docs/decisions/estudos-quiz-design.md`): entidade nova (`quizzes`/`quiz_questions`/
  `quiz_attempts`, RLS via join ao Caderno dono nas duas primeiras, `user_id` direto na terceira),
  diferente de `assessments` (só um registro manual de prova externa). Fonte do conteúdo: os
  Resumos do Caderno; 5 perguntas de múltipla escolha fixas por quiz; retentativas guardam
  histórico. Gerado só pela ferramenta `generate_quiz_by_notebook_name` da Vex (nunca um botão
  direto no módulo). A ferramenta recebe só o nome do Caderno e faz uma segunda chamada dedicada ao
  `provider.chat()` (sem tools) pedindo o quiz em JSON como texto livre — mais confiável que pedir
  pro modelo preencher um schema aninhado grande via argumento de tool-call, especialmente com
  modelos locais pequenos; `parseGeneratedQuiz()` valida o formato antes de persistir, nunca confia
  cegamente no LLM. `computeQuizScore()` (puro) corrige no cliente. UI: seção "Quizzes" em
  `EstudosCadernoPage` com `QuizTakingForm` (responder + feedback certo/errado). Study Capability
  Packs por área continuam fora do escopo — conceito mais amplo que esta feature.
- **`modules/conhecimento/segundo-cerebro`** (`@qqorvex/module-segundo-cerebro`) implementado —
  quinto módulo de domínio: `pages`, `blocks`, `page_properties`, `page_tags`, `page_links`
  (links wiki + backlinks), `bases`, `base_pages` (membership, não cópia), `base_formulas`.
  Motor de **Fórmula Simples** (`evaluateFormula`) é um parser/avaliador próprio (tokenizer +
  parser recursivo) que suporta aritmética, comparações, booleanos, `IF`/`CONCAT`/`DATEDIFF` —
  nunca `eval`/`Function`, testado diretamente (9 casos incluindo rejeição de chamada arbitrária
  tipo `require(...)`). Apagar uma página nunca apaga páginas que a referenciam (backlinks
  sobrevivem). `createSegundoCerebroHojeProvider()` alimenta o Hoje só com páginas favoritadas
  (o módulo não exige card no Hoje, conforme o Xmind). Grafo de Conhecimento (10/09/2026):
  `GraphView` visualiza `pages`/`page_links` existentes via layout `d3-force` (SVG, sem
  interatividade de arrastar na v1), alternância Lista/Grafo em `/segundo-cerebro`, clicar num nó
  navega para a página. Nota do Dia (11/09/2026): `getOrCreateDailyNote()` reaproveita `pages`
  (`page_type = "nota_do_dia"`, título = data ISO como chave de idempotência), botão "Nota do Dia"
  na Hoje cria/abre e navega direto — mesmo padrão idempotente de `createEventForAssessment`.
  Bases + Views persistidas (11/09/2026): `BasesPanel` (aba "Bases") é a primeira UI real sobre o
  repositório de Bases que já existia sem tela nenhuma; `bases.view_config` (jsonb) persiste
  ordenação por fórmula e filtro por título por Base, reaproveitando `evaluateFormula`/
  `buildFormulaContext` já existentes. Rotas `/segundo-cerebro` e `/segundo-cerebro/:pageId`.
  Testado ponta a ponta com usuário real (Nota do Dia e Bases ainda não — ver
  `docs/decisions/pending.md`). Histórico de Versões/Checkpoints (12/09/2026, ver
  `docs/decisions/segundo-cerebro-checkpoints-design.md`): checkpoint manual (botão "Salvar
  checkpoint") guarda snapshot completo (título + todos os blocos) em nova `page_checkpoints`.
  `restoreCheckpoint()` é "git revert", não "git reset" — arquiva o estado atual automaticamente
  antes de aplicar o antigo, mesmo espírito de `restoreDocumentVersion()` em Documentos.
  `CheckpointsPanel` na página. Testado ao vivo reproduzindo os passos exatos da restauração:
  conteúdo volta ao original, e os dois checkpoints (original + o automático da versão
  substituída) sobrevivem.
- **`modules/conhecimento/biblioteca`** (`@qqorvex/module-biblioteca`) implementado — sexto
  módulo de domínio: `library_items` (15 tipos: livro, filme, série, podcast, curso, jogo...),
  `library_item_creators`, `library_consumption_cycles` (releituras/rewatches sem duplicar o
  item), `library_collections` + `library_collection_items` (N:N), `library_item_relations`
  (adaptação/continuação/prequela/mesma franquia/baseado em/relacionado). `computeProgressPercent()`
  deriva percentual de progresso numérico ou percentual sem nunca inventar valor.
  `createBibliotecaHojeProvider()` só mostra "Continuar: X" quando há item em andamento — Hoje
  não vira feed. UI: Galeria em grade (única visualização, conforme o Xmind: "não oferecer
  Lista, Tabela ou Kanban paralelos"). Rota `/biblioteca`. Testado ponta a ponta contra o Supabase
  real (11 checks, incluindo ferramentas Vex). Detecção de duplicados (11/09/2026, autônomo):
  `normalizeTitle()`/`findDuplicateItem()` puros — sem ISBN/DOI no schema, compara título
  normalizado + `item_type`, 100% client-side contra os itens já carregados (sem hash de arquivo
  como em Documentos, aqui não há conteúdo binário). `NewItemForm` pede confirmação antes de criar
  mesmo assim. Sem mesclagem (decisão consciente — unir dois itens moveria ciclos/criadores/
  coleções, operação arriscada demais sem confirmação explícita de produto). Sem migration.
  Metadata Provider Layer (importação por URL), conteúdo episódico estruturado nem
  Insights/Retrospectiva — todos "evolução futura" no próprio Xmind ou dependentes de API
  externa.
- **`modules/gestao/documentos`** (`@qqorvex/module-documentos`) implementado — sétimo módulo de
  domínio, o primeiro a usar **Supabase Storage de verdade** (bucket privado `documents`, RLS em
  `storage.objects` isolando por `{user_id}/{document_id}/{file_name}`). `documents`, `folders`,
  `document_relations` (referência genérica polimórfica a entidades de outros módulos — Documentos
  nunca duplica o arquivo), `document_important_dates`, `warranties`
  (`computeWarrantyEndDate()` soma meses à data de compra, puro/sem SQL).
  `createDocumentosHojeProvider()` alimenta o Hoje com garantias/datas importantes nos próximos
  14 dias. Rota `/documentos`. Cofre (`is_vault`) existe só como marcador — a camada de
  reautenticação real fica para a futura Central de Segurança. Testado ponta a ponta contra o
  Supabase real: upload de arquivo de verdade, URL assinada baixando o conteúdo certo, isolamento
  por usuário no Storage (RLS), e exclusão limpando tanto a linha quanto o objeto físico. Lixeira
  com retenção (11/09/2026): "Excluir" agora move pra lixeira (`deleted_at`) em vez de apagar na
  hora; a exclusão física só acontece ao esvaziar manualmente ou quando o prazo (30 dias) expira,
  via varredura preguiçosa na própria leitura da lixeira — sem scheduler próprio. `TrashPanel` em
  `/documentos`. Detecção de duplicados por hash (11/09/2026): `content_hash` (SHA-256 via Web
  Crypto no cliente) verificado antes do upload — duplicata lança `DuplicateDocumentError`, UI
  oferece "Enviar mesmo assim" (mesmo padrão de conflito da Agenda). Lógica pura testada
  isoladamente (9 checks de retenção + 4 de hash, incluindo vetor de teste oficial do SHA-256) e
  confirmada ponta a ponta contra o Supabase real no lote de testes de 10/09/2026 (30/30 checks).
  Versionamento (11/09/2026): `documents.current_version` + tabela `document_versions` (RLS via
  join, mesmo padrão de `document_important_dates`) — `documents` sempre é a versão atual;
  `uploadNewVersion()` arquiva o estado anterior (copia o objeto de Storage pra
  `.../versions/{n}/{nome}`, remove o caminho antigo, insere a linha) antes de escrever o novo
  conteúdo por cima; `restoreDocumentVersion()` é simétrico e sempre avança `current_version` (como
  `git revert`, não `git reset`) em vez de apagar histórico. Sem checagem de duplicados aqui (é uma
  preocupação diferente da deduplicação entre documentos distintos). UI: botão "Versões" no
  `DocumentCard` abre `VersionHistoryPanel` (histórico + restaurar + enviar nova versão).
  Confirmado pelo usuário no navegador em 11/09/2026 (upload, nova versão, histórico e
  restauração). Pastas e Garantias (11/09/2026) ganharam telas dedicadas
  (`FoldersPanel`, `WarrantiesPanel`) — o schema e o repositório já existiam, só faltava UI;
  `moveDocumentToFolder()`/`deleteFolder()` novos, `DocumentCard` ganhou seletor de pasta por
  documento, listagem de `/documentos` filtra por pasta. `document_type` (11/09/2026) virou
  editável de verdade — antes `uploadDocument()` sempre gravava `"outro"` e não havia como
  reclassificar; `UploadForm` e `DocumentCard` ganharam seletor de tipo (`DOCUMENT_TYPE_LABELS`
  centraliza os rótulos pt-BR), `/documentos` ganhou filtro por tipo.
- **`modules/gestao/financas`** (`@qqorvex/module-financas`) implementado — oitavo módulo de
  domínio. `accounts`, `cards`, `categories`, `recurring_transactions` (cobre recorrências e
  assinaturas via `is_subscription`), `installments`, `transactions` (com `document_id`
  referenciando Documentos e checagem de transferência exigindo conta destino), `budgets`.
  `computeBalances()` calcula Saldo Atual (só concluídas) e Saldo Projetado (+ futuras/pendentes),
  excluindo transferências dos totais globais — puro TS, testado com valores reais. `generateOccurrence()`
  cria a cobrança como transação vinculada e avança `next_occurrence_date`
  (`computeNextOccurrenceDate`, testado com o exemplo exato do Xmind: Spotify anual 09/10/2026 →
  09/10/2027). `createInstallmentPurchase()` gera as N parcelas de uma vez
  (`computeInstallmentAmounts`, testado com o exemplo exato do Xmind: R$ 3.600 em 12x = R$ 300).
  `createFinancasHojeProvider()` alimenta o Hoje com saldo atual e cobranças dos próximos 7 dias.
  Rota `/financas`. Testado ponta a ponta contra o Supabase real (22 checks). UI completa: além da
  movimentação (agora com Categoria/Conta/Transferência com conta de destino no formulário),
  `AccountsPanel`, `CardsPanel`, `CategoriesPanel`, `RecurringTransactionsPanel` (Recorrências e
  Assinaturas na mesma tela, com "Gerar cobrança agora" e Pausar/Reativar), `InstallmentsPanel` e
  `BudgetsPanel` — todos testados ponta a ponta (17 checks adicionais em 10/09/2026). Fatura/
  fechamento de cartão (10/09/2026): `cards.closing_day`/`due_day` + tabela `card_statements`
  (competência, status aberta/fechada/paga); total da fatura nunca é persistido —
  `computeStatementTotal()` soma as transações do cartão no período em tempo real, mesmo padrão
  de Saldo Atual/Projetado; `getOrCreateCurrentStatement()` é idempotente por cartão+competência e
  só grava quando o usuário marca como paga. `CardStatementPanel` (dentro de `CardsPanel`) mostra
  período/total/vencimento e o botão de marcar como paga; `NewTransactionForm` ganhou seletor de
  cartão. Testado ponta a ponta (8 checks) + lógica de datas testada isoladamente (9 checks).
  Calendário Financeiro dedicado (11/09/2026, autônomo): `FinancialCalendarView` é uma grade de
  mês própria de Finanças (utilitários de data locais em `service.ts` — não importa de
  `@qqorvex/module-agenda`, "módulos não acessam internals uns dos outros"); ponto sólido =
  movimentação real no dia, ponto contornado = cobrança de recorrência ativa projetada
  (`next_occurrence_date`, nunca vira transação fantasma só pra aparecer no calendário). Lógica de
  grade testada isoladamente (6 checks). Alertas de orçamento: ver "Notificações — segunda fonte"
  mais abaixo. Forma de pagamento na movimentação manual (11/09/2026, autônomo): a coluna
  `payment_method` já existia no banco desde o início, só faltava UI — `NewTransactionForm` ganhou
  o seletor (escondido quando um Cartão é escolhido, já que crédito fica implícito),
  `TransactionList` mostra a forma de pagamento, `PAYMENT_METHOD_LABELS` centraliza os rótulos.
  Integração com Veículos (12/09/2026, bounded): `transactions.vehicle_id` (`on delete set null`,
  mesmo padrão de `account_id`/`card_id`) + `computeVehicleSpending()` pura. `NewTransactionForm`
  ganhou seletor de Veículo com formato mínimo (`{id, nickname}`, não o tipo de
  `@qqorvex/module-vida-pessoal` — evita dependência de pacote na direção errada); a lista de
  veículos é buscada em `Financas.tsx` e passada como prop. Na direção oposta,
  `@qqorvex/module-vida-pessoal` passou a depender de `@qqorvex/module-financas`: `VehicleCard`
  mostra "Total gasto" calculado ao vivo via `computeVehicleSpending()`.
- **Integração cross-module Documentos ↔ Finanças ↔ Estudos** implementada, reaproveitando a
  tabela genérica `document_relations` já existente (nenhuma migration nova). `AttachDocumentPanel`
  (componente reutilizável de `@qqorvex/module-documentos`) permite relacionar/desrelacionar
  documentos a qualquer entidade de outro módulo; hoje plugado em Finanças (anexar comprovante a
  uma movimentação) e Estudos (relacionar apostila/PDF a um Caderno). Confirma o invariante
  central: "Documentos é dono do arquivo" — apagar a movimentação ou desfazer a relação nunca
  apaga o arquivo, e o mesmo documento pode se relacionar a módulos diferentes sem duplicar.
  Testado ponta a ponta contra o Supabase real (6 checks).
- **Integração cross-module Biblioteca ↔ Estudos ("usar em um Caderno") e Agenda ↔ Estudos
  (avaliação → evento derivado)** implementada. `notebook_library_items` é uma junção N:N dedicada
  (não `document_relations`, que é polimórfica) com `on delete cascade` dos dois lados — Biblioteca
  continua dona do item, relacionar/desrelacionar nunca o afeta. `events.assessment_id` segue o
  mesmo padrão de `events.task_id` (referência opcional, `on delete set null`).
  `createEventForAssessment()` é idempotente (reusa o evento já existente para a avaliação em vez
  de duplicar) e chama só a API pública de `@qqorvex/module-agenda`. UI plugada em
  `EstudosCaderno.tsx` (`RelatedLibraryItemsPanel` + botão "Criar evento na Agenda" por avaliação).
  Typecheck limpo em `module-estudos`, `module-agenda`, `module-biblioteca` e no app. Testado
  ponta a ponta contra o Supabase real (15 checks) com usuário real confirmado por e-mail (Resend
  já verificado): relacionar/desrelacionar item da Biblioteca, PK composta rejeitando duplicata,
  cascata ao apagar o Caderno sem afetar o item, idempotência do evento derivado, e evento
  sobrevivendo à exclusão da avaliação com `assessment_id` nulo.
- **`modules/pessoal/vida-pessoal`** (`@qqorvex/module-vida-pessoal`) implementado (11/09/2026) —
  nono módulo de domínio, escopo recriado direto com o usuário via brainstorming (o Xmind original
  dessa parte foi perdido; ver `docs/decisions/vida-pessoal-design.md` pro design completo). Só o
  Bloco 1 (Planejamento) construído até agora: `plans` (visão ampla e narrativa, ex. "Ser um
  designer" — diferente de Meta, que continua específica/mensurável; `computePlanLabel()`/
  `computePlanPeriod()` puras derivam o rótulo e o intervalo de datas a partir de
  mês/ano+`plan_type`, nunca duas datas soltas digitadas), `plan_goals` (agrupa Metas já
  existentes de `@qqorvex/module-metas-habitos` sem duplicar, mesmo padrão de
  `goal_habit_relations`), `projects` (agrupador de Tarefas já existentes de
  `@qqorvex/module-tarefas` via `project_tasks`, nunca duplica o Kanban), `ideas` (caixa de
  captura simples, sem status/categoria de propósito). Rota `/vida-pessoal`. Testado ao vivo
  contra o Supabase real (Plano+Meta+vínculo, Projeto+Tarefa+vínculo, Ideia — cascata de relação
  sem afetar o lado principal). **Confirmado pelo usuário no navegador.** Bloco 2 (Bem-estar,
  11/09/2026): `daily_checkins` (mood/sleep_quality/energy 1–5, `unique(user_id, checkin_date)` —
  upsert por dia, mesmo padrão de `habit_logs`) e `pomodoro_sessions` (`duration_minutes` 15/30/60,
  `status` `completed`/`died`) — mecânica igual ao Forest: a sessão só é gravada quando termina
  (nunca uma linha "em andamento"), sair da aba (`visibilitychange`) ou cancelar grava `died`.
  `countCompletedPomodorosToday()`/`countCompletedPomodorosThisWeek()` puras. UI:
  `DailyCheckinForm` (emojis de humor + escalas 1–5) e `PomodoroTimer` (15/30/60min, árvore que
  "cresce" via `scale` proporcional ao progresso). `createVidaPessoalHojeProvider()` novo — só
  lembrete de check-in pendente no Hoje ("não vira feed"). **Confirmado pelo usuário no
  navegador.** Bloco 3 (Vida Prática, 11/09/2026): `useful_contacts` (não é agenda genérica — só
  profissionais/serviços úteis), `vehicles`+`vehicle_important_dates` (documentos do veículo
  reaproveitam `document_relations`/`AttachDocumentPanel` de `@qqorvex/module-documentos`, sem
  tabela nova), `assets` (Bens e Inventário, `warranty_id` opcional `on delete set null`),
  `important_purchases` (sem vínculo com Finanças na v1), `shopping_list_items`.
  `hooks/useVidaPratica.ts` separado de `useVidaPessoal.ts` (mesmo princípio de
  `useGoals`/`useHabits`/`useRoutines` em Metas & Hábitos). `/vida-pessoal` ganhou abas internas
  (Planejamento/Bem-estar/Vida Prática). `createVidaPessoalHojeProvider()` ganhou 2ª fonte: datas
  importantes de Veículos nos próximos 14 dias. Testado ao vivo contra o Supabase real (cascata de
  veículo→datas, `set null` de garantia→bem). **Confirmado pelo usuário no navegador.** Com isso o
  design completo de `docs/decisions/vida-pessoal-design.md` está implementado e confirmado.
- **`packages/vex`** implementado — primeira fatia real do motor da Vex. `VexProvider` é a
  interface que qualquer provedor de IA implementa (`EchoProvider`, fallback 100% local/grátis
  que interpreta comandos por padrão de texto pt-BR; `OllamaProvider`, cliente HTTP real para
  Ollama local, não presumido rodando). `runVexTurn()`/`confirmVexToolCall()` orquestram:
  mensagem → Safety Engine (Query Guard) → provider → se houver tool_call, ferramentas de
  consulta executam direto e ferramentas que persistem dado (`create_task`,
  `complete_task_by_title`) **exigem confirmação explícita antes de rodar** — nunca escrevem no
  banco sem essa confirmação. Ferramentas só chamam a API pública dos módulos, nunca o Supabase
  diretamente, cumprindo a regra arquitetural "a Vex não acessa o Supabase diretamente". Chat
  funcional na UI (`VexChat`, botão "Falar com a Vex" no Hoje). Cobre os 5 módulos de domínio:
  `createTarefasTools` (create_task/complete_task_by_title/list_tasks), `createAgendaTools`
  (create_event_today/list_events_today), `createMetasHabitosTools`
  (create_goal/list_goals/log_habit_by_name), `createEstudosTools`
  (create_notebook/list_notebooks/list_due_flashcards), `createSegundoCerebroTools`
  (create_page/list_pages). Testado ponta a ponta contra o Supabase real (18 checks no total
  entre as duas rodadas), incluindo confirmar que ações que exigem confirmação não persistem
  nada até serem confirmadas.
- **Vex conectada a um provider real (Ollama)** (10/09/2026): `ResilientProvider` decora um
  provider primário com fallback automático — se o primário lançar erro (Ollama fora do ar), cai
  pro `EchoProvider` sem travar o chat, e volta a tentar o primário na próxima mensagem (não fica
  "preso" no fallback). `VexChat` agora usa
  `new ResilientProvider(new OllamaProvider(modelo), new EchoProvider())`; o modelo é configurável
  via `VITE_OLLAMA_MODEL` (padrão `qwen2.5:7b`, que suporta "tools" — confirmado via
  `ollama.../api/tags`). Testado: `OllamaProvider` contra um Ollama real (`/api/chat` com
  `tools`, tool call real recebido e no formato esperado pelo código) e `ResilientProvider`
  isoladamente (5 checks: usa o primário quando funciona, cai pro fallback sem propagar exceção
  quando o primário falha, expõe o `name` do primário, recupera sozinho na chamada seguinte).
  Fluxo completo (chat real → tool call → confirmação → persistência no Supabase) confirmado
  funcionando pelo usuário no navegador contra o `qwen2.5:7b` local — a árvore de módulos da Vex
  usa imports relativos sem extensão que só o bundler (Vite) resolve, então esse teste manual
  substituiu a automação de ponta a ponta nesta sessão.
- **Vex Context Engine, Fase 1 — conversas persistidas + digitando... + personalidade** (11/09/2026,
  escopo em 7 fases definido via brainstorming, ver `docs/decisions/vex-context-engine-design.md`):
  novas `vex_conversations`/`vex_messages` (RLS padrão, mensagem-filha via join à conversa dona) —
  só `role in ('user','assistant')` é persistido, porque é só isso que `runVexTurn` usa como
  `messages: ChatMessage[]`; mensagens `tool` continuam efêmeras e a nova mensagem `system`
  (`VEX_SYSTEM_PROMPT`, primeira personalidade real da Vex — antes não existia nenhuma) é montada
  em runtime, nunca persistida. Novo `packages/vex/src/conversations/` (`repository.ts`/`hooks.ts`,
  mesmo padrão TanStack Query dos módulos de domínio) expõe CRUD de conversa + listar/anexar
  mensagem. `VexChat` ganhou lista retrátil de conversas (criar/renomear/trocar/apagar) e indicador
  "digitando..." enquanto aguarda o provider ou a execução de ferramenta confirmada. Testado ao
  vivo contra o Supabase real (insert/select/cascade). Fases 3–7 (item em foco na tela,
  preenchimento incompleto, cobertura completa de ferramentas, pesquisa+salvar em qualquer módulo,
  barreira do Cofre) ainda não implementadas.
- **Vex Context Engine, Fase 2 — painel retrátil + página `/vex` em tela cheia** (11/09/2026): nova
  rota-layout `ProtectedLayout` (`RequireAuth` + `Outlet` + `VexPanel`) substitui os 13 `RequireAuth`
  repetidos por rota em `App.tsx` — é onde a aba fixa da Vex passa a viver, presente em toda página
  autenticada (exceto na própria `/vex`, já em tela cheia). `VexChat` (modal) foi removido; o corpo
  do chat virou `VexConversationView` (sem chrome), decorado por `VexPanel` (aba na borda direita +
  painel deslizante, ainda `lazy()`) e pela nova página `VexPage`. Novo `VexSessionContext`
  compartilha `activeConversationId` entre os dois pontos de entrada — o histórico já vinha do
  banco (Fase 1), faltava compartilhar qual conversa está aberta agora. Typecheck e build limpos;
  `VexConversationView` confirmado como chunk separado no bundle.
- **Vex Context Engine, Fase 3 — item em foco na tela** (11/09/2026): nem `TaskCard` nem
  `DocumentCard` tinham "expandir" (correção de premissa da fase) — o gatilho virou clicar no
  corpo do card, com destaque visual (borda cyan). Novo `CurrentItemContext`
  (`{type,id,label}|null`, provido no `ProtectedLayout`, limpo a cada troca de rota) — os módulos
  só expõem `isFocused`/`onFocus` como props simples, sem conhecer a Vex; quem liga ao Context são
  as páginas do app. `VexConversationView` injeta o item em foco como mensagem `system` extra (não
  persistida, montada a cada chamada) com o ID literal. Nova `update_task_by_id` (Tarefas) e
  `updateTask()` em `@qqorvex/module-tarefas` provam o fluxo de ponta a ponta ("muda o prazo disso
  pra amanhã" com uma tarefa em foco). Documentos ganhou só o rastreamento — ferramenta de edição
  fica pra Fase 5. Testado ao vivo contra o Supabase real; typecheck e build limpos.
- **Vex Context Engine, Fase 4 — preenchimento incompleto** (11/09/2026): `create_transaction` já
  exigia `name`/`amount`/`transactionType` no schema — o que faltava de verdade era qualquer noção
  de recorrência (`recurring_transactions` existe no banco, nenhuma ferramenta a tocava). Ganhou
  `isRecurring` (obrigatório); se `true`, não cria nada — explica que recorrência ainda não é
  criável pelo chat (Fase 5) e oferece criar só o avulso de hoje. `VEX_SYSTEM_PROMPT` ficou mais
  diretivo: antes de chamar ferramenta que cria/altera algo, conferir todos os dados pedidos; se
  faltar algo, perguntar em vez de chamar — o mecanismo real é o `parameters.required` já existente
  de cada ferramenta, o prompt é o que faz o modelo respeitar isso.
- **Vex Context Engine, Fase 5 — cobertura completa de ferramentas** (11/09/2026, lote focado: uma
  ação nova por módulo, reaproveitando função de repository já existente): `delete_event_by_title`
  (Agenda), `update_goal_status_by_title` (Metas & Hábitos), `delete_notebook_by_name` (Estudos),
  `archive_page_by_title` (Segundo Cérebro), `update_library_item_status_by_title` (Biblioteca),
  `toggle_important_by_name` (Documentos), `create_recurring_transaction` (Finanças — fecha o
  gancho da Fase 4: `create_transaction` com `isRecurring: true` agora orienta o modelo a chamar
  esta ferramenta nova em vez de só recusar). Testado ao vivo contra o Supabase real; typecheck e
  build limpos.
- **Vex Context Engine, Fase 6 — pesquisa + salvar depois, em qualquer módulo** (11/09/2026): toda
  a capacidade de "guardar conteúdo" já existia nos repositories (Tarefas `description`, Segundo
  Cérebro `createBlock`, Estudos `createSummary`, Documentos `uploadDocument` com `Blob`) — só
  faltava expor como ferramenta. `create_task` ganhou `description`; novas `create_page_with_content`
  (página + bloco de texto), `create_summary_by_notebook_name` (acha o Caderno pelo nome, não
  inventa um se não achar) e `create_text_document` (texto → `Blob` → `uploadDocument`, mesma
  deduplicação por hash de sempre). `VEX_SYSTEM_PROMPT` generaliza "pesquisa livre → pedir para
  salvar como algo concreto" para qualquer módulo, não só Estudos. Testado ao vivo contra o
  Supabase real (página+bloco, Resumo em Caderno); `create_text_document` não testado via clique
  real (depende de Storage) mas reaproveita `uploadDocument` já testado em sessões anteriores.
- **Vex Context Engine, Fase 7 — barreira do Cofre (última fase do roteiro)** (11/09/2026):
  `documents.is_vault` já existe no banco, mas nenhuma UI ainda permite marcá-lo — barreira
  preventiva, não correção de um risco já explorável. `list_documents` exclui documentos com
  `is_vault: true`; `toggle_important_by_name` confere `is_vault` do documento encontrado e recusa
  se for `true`. Sem mecanismo de "autorizar no momento" — depende de reautenticação real (Central
  de Segurança, ainda não existe); até lá, bloqueio é total. Com isso, as 7 fases do roteiro do
  Context Engine (`docs/decisions/vex-context-engine-design.md`) estão implementadas.
- **Biblioteca — Metadata Provider Layer** (12/09/2026, ver
  `docs/decisions/biblioteca-metadata-provider-design.md`): busca automática de metadados por
  título para livro (Google Books, sem chave) e filme/série (TMDB, chave pública em
  `VITE_TMDB_API_KEY`, mesmo padrão de baixo risco de `VITE_GOOGLE_CLIENT_ID`) — chamada direta
  do cliente, sem Edge Function. Sem migration nova: `library_items.{cover_url,description,year,
  origin_url,subtitle}` e `library_item_creators` já existiam no schema sem nenhum uso real.
  `NewItemForm` ganhou seletor de tipo (antes sempre gravava `"other"`) e busca com resultados
  clicáveis; `GalleryGrid` ganhou capa e rótulos pt-BR do tipo. TMDB não retorna diretor/elenco na
  busca (exigiria uma segunda chamada a `/credits` por item) — fora de escopo por decisão
  consciente, filme/série ficam sem `creators`; livro continua populando autor via Google Books.
  Typecheck e build limpos. Testado ponta a ponta contra o Supabase real (primeiro uso de
  `library_item_creators` desde que a tabela existe, RLS confirmada, dado de teste removido).
  Pendência do usuário: cadastrar uma chave grátis em themoviedb.org e preencher
  `VITE_TMDB_API_KEY` no `.env` local (Google Books já funciona sem chave nenhuma).
- **Documentos — OCR de recibos/notas** (12/09/2026, ver
  `docs/decisions/documentos-ocr-design.md`): botão "Extrair texto" em documentos de imagem roda
  Tesseract.js (português) 100% no navegador via import dinâmico (confirmado como chunk próprio
  no build, sem inflar o bundle principal) e persiste em `documents.extracted_text` (nova
  coluna, única migration da feature). Gatilho manual, não em todo upload; texto já extraído vira
  "Ver texto extraído" com painel e "Copiar texto". Typecheck e build limpos. Testado contra o
  Supabase real (insert/update/select/delete da coluna nova). Não testado num navegador de
  verdade (ambiente sem browser) — falta confirmação manual do usuário.
- **Gamification Core (Level/XP/Badges/Títulos)** (12/09/2026, ver
  `docs/decisions/gamification-core-design.md`): novo módulo folha `modules/pessoal/gamificacao`
  (sem depender de nenhum outro módulo de domínio) — desenho recriado do zero via brainstorming
  (sem Xmind detalhado). XP só nas quatro ações centrais de produtividade (Tarefa concluída,
  check-in de Hábito/Meta, Quiz respondido em Estudos, item da Biblioteca concluído); Nível
  sempre derivado do XP total via fórmula progressiva (nunca guardado); Título fixo por faixa de
  nível; Badges num catálogo fixo checado contra contadores. `awardXp()` mora dentro dos
  repositories de Tarefas/Metas-Hábitos/Estudos/Biblioteca (uma dependência uma-via-só de cada um
  pra Gamificação, sem ciclo) — não da página do app, pra premiar XP também quando a conclusão
  acontece via chat da Vex; nunca lança, erro de gamificação não derruba a ação principal. Widget
  no Hoje + seção completa em `/seguranca`. Typecheck e build limpos (19 workspace projects).
  Testado contra o Supabase real (upsert de stats, constraint de badge duplicada) e curva de
  nível/título verificada isoladamente. Não testado via UI real (ambiente sem browser).
- **Segundo Cérebro — Editor de Blocos Rico (v1)** (12/09/2026, ver
  `docs/decisions/segundo-cerebro-editor-blocos-design.md`): 11 dos 19 valores de `block_type`
  ganharam edição de verdade (texto, título 1/2/3, lista, checklist, citação, callout, código,
  divisor, toggle) — antes só "texto" existia e nem tinha `updateBlock`. Arquitetura de lista de
  blocos (um componente por bloco, sem lib de rich-text nova) porque o schema já é block-first
  (`page_id`/`block_type`/`content` jsonb/`order_index` por linha); toggle não aninha blocos de
  verdade (schema sem `parent_block_id`), é só `{summary, details}` colapsável. Slash command +
  dropdown pra trocar tipo, `createBlockAfter()` insere no meio da lista reindexando
  `order_index`, `moveBlock()` reordena via botões ▲/▼ (sem drag-and-drop na v1). Salva no
  blur/Enter, não a cada tecla. Sem migration — schema já suficiente. Typecheck e build limpos.
  Testado contra o Supabase real (inserção no meio da lista, troca de tipo, swap de ordem).
  **Confirmado em navegador real em 15/09/2026** (ver `docs/decisions/pending.md`).
  **2ª rodada (15/09/2026)**: imagem, arquivo e link implementados — `{documentId}`/`{url}`,
  reaproveitando `uploadDocument()`/`getDownloadUrl()` de `@qqorvex/module-documentos` (Documento
  é sempre dono do arquivo, bloco só referencia). Confirmado em navegador real.
  **3ª rodada (15/09/2026)**: referência de página implementada — `{pageId}`, reaproveitando
  `usePages()` já existente, mesmo mecanismo do painel "Links internos". Confirmado em navegador
  real (navegação pelo link testada de verdade).
  **4ª rodada (15/09/2026)**: tabela implementada — grid simples `{columns, rows}` de strings,
  `<table>` HTML puro sem lib nova. Confirmado em navegador real (edição de célula, adicionar/
  remover linha e coluna).
  **5ª rodada (15/09/2026)**: equação implementada — `{latex}` renderizado com KaTeX (nova
  dependência, `import()` dinâmico pra não inflar o chunk principal — a 1ª tentativa com import
  estático inflou de 598kB pra 861kB; corrigido). Confirmado em navegador real (renderização
  correta + LaTeX inválido tratado sem quebrar).
  **6ª rodada (15/09/2026)**: referência de entidade implementada — v1 só Tarefa (único módulo com
  hook "listar tudo" pronto), resumo inline read-only (sem rota de detalhe por Tarefa ainda, sem
  link navegável). Confirmado em navegador real.
  **7ª rodada (15/09/2026), roteiro dos 19 tipos completo**: embed implementado — nunca renderiza
  iframe de URL arbitrária, só uma lista fixa de 5 provedores conhecidos (YouTube, Vimeo, Spotify,
  Figma, CodePen) convertidos pra URL de embed oficial; qualquer outra URL vira "não suportado".
  Iframe `sandbox`ado sem `allow-top-navigation`. Bug real corrigido no teste ao vivo:
  `referrerPolicy="no-referrer"` quebrava o embed do YouTube (Erro 153) — trocado pra
  `strict-origin-when-cross-origin`. Confirmado em navegador real. Roteiro original dos 19 tipos
  completo.
  **8ª rodada (15/09/2026)**: Referência de Entidade ganhou Evento (`listAllEvents()`/
  `useAllEvents()` novos em `module-agenda`, mesmo padrão de `useAllTasks()`) — picker com
  `<optgroup>` Tarefas/Eventos, resumo inline 📅 + título + data curta. Confirmado em navegador
  real. Mais tipos de entidade (Meta, Hábito) ficam pra quando fizer sentido.
- **Auditoria de segurança Supabase (15/09/2026)**: `get_advisors(type=security)` revisado —
  achado real corrigido (funções do PIN do Cofre restritas a `authenticated`, ver
  `docs/decisions/pending.md`); RLS sem policy em `app_secrets` e as demais funções
  `SECURITY DEFINER` revisadas e confirmadas corretas por design. "Leaked Password Protection"
  fica de fora por decisão consciente — é recurso exclusivo do plano Pro do Supabase, usuário está
  no plano gratuito (ver `docs/decisions/pending.md`).
- **Fase de design — iniciada** (12/09/2026, ver `docs/decisions/design-system-componentes-v1.md`):
  com os 4 itens funcionais prontos, começou a fase de design visual — abordagem "biblioteca de
  componentes primeiro", decisões feitas via brainstorming visual (Visual Companion). Primeira
  rodada: `Card` (`packages/ui`, cantos 10px, sombra discreta, borda de destaque cyan/gold) e
  variantes de botão `chip`/`chip-accent` (sem borda, fundo tintado — aditivas, não substituem
  `secondary`/`ghost` usados em dezenas de contextos ainda não revisados). **Bug real corrigido**:
  a detecção automática de conteúdo do Tailwind v4 nunca alcançava `packages/*`/`modules/*` (só
  visíveis a partir de `apps/qqorvex` via symlink do pnpm dentro do `node_modules` excluído) —
  classes usadas só dentro de um módulo saíam silenciosamente do CSS de produção. Corrigido com
  `@source` explícito em `apps/qqorvex/src/styles/global.css`. `Card` ainda não adotado por
  nenhuma página — fica pra fase "página por página". `Input`/`Select`/`Textarea`
  (`FormField.tsx`) também na v1: mesma "assinatura" do Card (barra lateral cinza→Gold em foco
  via `focus-within`), label embutido e obrigatório na API. `Badge` (`tone` + texto obrigatórios):
  ponto indicador colorido, fundo tintado sutil sem borda, reaproveitando tokens semânticos já
  existentes. `Modal`/`ConfirmDialog`: centralizado, mesma casca do Card, via `createPortal`,
  reaproveitando o `Button` existente — ainda sem uso real em nenhuma página. `Sidebar`: sem
  ícones, seções agrupadas, item ativo com a mesma "assinatura" visual, via `NavLink` do
  react-router. Com isso a rodada "biblioteca de componentes primeiro" está fechada.
- **Fase "página por página" — concluída** (iniciada 12/09/2026, fechada 15/09/2026, ver
  `docs/decisions/design-system-componentes-v1.md` e a entrada de 15/09/2026 em
  `docs/decisions/pending.md`): `Sidebar` no layout (`ProtectedLayout.tsx`), todas as ~15 páginas
  usando `Card`/`Badge`/`Input`/`ConfirmDialog` em vez de `div`s cruas, navegação solta de topo
  removida, `ConfirmDialog` plugado nos ~20 componentes de módulo que excluíam sem confirmar
  (exceções conscientes: Editor de Blocos e ações de "Desvincular"). `Card` ganhou `forwardRef`
  pro `TaskCard` (`@dnd-kit/core`). Typecheck e build limpos no monorepo inteiro. **Confirmado em
  navegador real (15/09/2026)**: Tarefas, Agenda, Finanças, Vida Pessoal e Segurança testados ao
  vivo com usuário de teste (`khyron.box@gmail.com`, apagado ao final) — Card/Badge/ConfirmDialog
  renderizando corretamente em todos, nenhum problema visual encontrado. Sem pendência.
