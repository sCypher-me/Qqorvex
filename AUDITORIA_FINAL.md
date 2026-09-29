# Auditoria final integrada — Qqorvex

**Data:** 23/09/2026  
**Escopo:** monorepo, frontend React/Vite, módulos de domínio, Vex, Supabase, Edge Functions,
desktop/Tauri e Android.  
**Status:** aprovado para avanço técnico, não declarado pronto para produção.

A checklist de aceite Web/Desktop com as evidências atuais e os passos manuais restantes está em
`docs/release/web-desktop-acceptance.md`.

## Resumo executivo

O código atual fecha um ciclo de validação local controlada: typecheck sem erros, build de
produção concluído, 109 testes passando e APK debug Android gerado. O carregamento inicial foi
dividido por runtime, shell autenticado, módulos e rotas. A camada de dados remota também
foi auditada: as 81 tabelas públicas estão com RLS e nenhuma tabela RLS ficou sem policy.

Foram corrigidos riscos concretos em `app_secrets`, Vex, OAuth Google, Zoom, notificações,
argumentos de ferramentas e isolamento do scheduler. O maior risco operacional encontrado foi o
drift entre migrations locais e remotas. A reconciliação está sendo feita de forma aditiva e
auditável; dois contratos que já quebravam funcionalidades (ocorrências de tarefas recorrentes e
progresso dos desafios diários) foram corrigidos e verificados no remoto, enquanto a equivalência
histórica completa ainda precisa ser documentada. O inventário remoto/local com as reconciliações
já verificadas está em `docs/architecture/migration-inventory-20260923.md`.

## Inventário

| Área | Estado observado |
|---|---|
| Workspaces | 20 no monorepo pnpm |
| Aplicação | React/Vite em `apps/qqorvex` |
| Domínios | 12 módulos em `modules/` |
| Compartilhados | 6 pacotes em `packages/` |
| Rotas | 22 entradas no `App.tsx` |
| Edge Functions | 6 no checkout; 6 ativas no Supabase remoto |
| Migrations | 41 locais; 62 aplicadas remotamente |
| Banco público | 81 tabelas, todas com RLS |
| Policies | 277 policies públicas |
| Funções públicas | 16; 14 `SECURITY DEFINER` |

## Evidências executadas

| Verificação | Resultado |
|---|---|
| `git diff --check` | sem erros de whitespace; somente avisos de LF/CRLF do Windows |
| TypeScript | `corepack pnpm typecheck` passou nos 19 workspaces com script; `tsc` do app também passou |
| Testes | 14 arquivos, 106 testes passando via Vitest 3.2.7 |
| Auditoria Edge Functions | `corepack pnpm audit:edge` aprovado; invariantes de autenticação, rate limit, allow-list de tools, proteção de contexto, segredos, timeouts e idempotência verificadas automaticamente |
| Harness RLS de dois usuários | `tools/audit-rls-two-user.mjs` preparado; executa somente leituras com dois JWTs e verifica 15 domínios, perfis, consultas cruzadas e negação de `app_secrets`; o equivalente SQL reversível já passou com as duas contas, faltando apenas fornecer os JWTs para o teste HTTP |
| Bootstrap de autenticação | `AuthProvider` agora encerra o bootstrap em no máximo 8 s e falha fechado quando `getSession()` fica pendente; o preview voltou a renderizar o login mesmo com a rede do Auth indisponível |
| Acessibilidade pública | AccessLint v0.13.0/engine 0.21.0 encontrou zero violações no estado imediato de loading e nas rotas `/login`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha` e `/mfa` após aguardar o conteúdo real |
| CSP Tauri | Política restritiva separada para produção/desenvolvimento; scripts remotos, objetos e formulários externos bloqueados, com origens necessárias explicitamente mapeadas e política encontrada embutida no `app.exe` |
| Auditoria nativa | `corepack pnpm audit:native` aprovado; CSP, comandos Corepack, permissão de microfone e sufixo Android debug verificados automaticamente |
| Smoke runtime Edge Functions | Chamadas sem autenticação ao projeto publicado: `vex-chat`, `vex-web-search`, `create-zoom-meeting`, `sync-google-calendar` e `send-notifications` retornaram `401`; `google-oauth-callback` retornou `302` sem estado, sem concluir fluxo autenticado. O check reproduzível está em `tools/audit-edge-runtime.mjs` e no script `corepack pnpm audit:edge:runtime` |
| Frontend | Vite 6.4.3 produziu `apps/qqorvex/dist` com 551 módulos transformados; chunk raiz 275,16 kB, sem aviso acima de 500 kB |
| Build do app | `tsc` + Vite passaram; o `beforeBuildCommand` do Tauri também concluiu o build web |
| Desktop Windows | Tauri debug e release x64 gerados; o build release produziu `app.exe`, MSI e instalador NSIS em `src-tauri/target/release/` |
| Desktop release hashes | `app.exe` 66.812.928 bytes / `B15CFC1BC543CE8650FAA856AD5C566263667EA7DD05E8967692323837E3955E`; MSI 60.989.440 bytes / `9B1A1C00FF5C5ED1D5AF0536F953DBB85FB15022BE45C7D15C9990434EDF7AD6`; NSIS 60.257.830 bytes / `313B25E671007A72FA3D40F68C66AAB28492995D62C03086B478EF2875C3E790` |
| Assinatura Desktop | `Authenticode: NotSigned` nos três artefatos release; teste local permitido, distribuição pública deve adicionar assinatura |
| Integridade dos builds | Manifesto com SHA-256 dos 5 artefatos em `docs/release/SHA256SUMS-20260923.txt`; verificação local passou |
| Smoke HTTP | As 22 rotas registradas — incluindo as rotas parametrizadas, módulos protegidos, `/vex` e as 5 rotas de autenticação — retornaram 200 e o shell React; `/` é a tela Hoje |
| Android | APK debug universal (arm64-v8a, armeabi-v7a, x86 e x86_64) gerado em `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` |
| APK | 925.302.339 bytes; SHA-256 `64AA77EEE27E5086AA432B7944F91C4DFC31400A4B66F92162C129F95EFB4411` |
| Android bundle | AAB universal debug em `src-tauri/gen/android/app/build/outputs/bundle/universalDebug/app-universal-debug.aab`, 364.618.764 bytes; SHA-256 `3141BEDA803C2EA3A77E4709C662C48710AF218E76A3E552FFBF8E39122EFF1E` |
| Android permission | `RECORD_AUDIO` presente no manifesto mesclado universal debug; inserção automatizada e idempotente no build |
| Android APK static check | `aapt dump badging` confirmou pacote `tech.biocypher.qqorvex.debug`, `versionName 0.1.0`, `targetSdkVersion 36` e permissões `INTERNET`/`RECORD_AUDIO`; sem instalação em aparelho ou emulador |
| Segredos versionados | nenhum token privado encontrado; `.env` local não está versionado e só contém variáveis públicas de frontend |
| TTS Vex | nenhuma chamada a `speechSynthesis`, `SpeechSynthesisUtterance` ou equivalente encontrada |
| STT Vex | reconhecimento de voz do navegador presente, `pt-BR`, com fallback textual e estados de permissão/erro |
| Sinks de navegador | nenhuma ocorrência de `dangerouslySetInnerHTML`, `eval` ou `new Function`; download de documentos usa `noopener,noreferrer` |
| Dependências de produção | `pnpm audit --prod` não pôde consultar o endpoint de advisories: o sandbox bloqueou o POST ao registry e a tentativa de acesso externo foi recusada pela política de segurança; resultado de vulnerabilidades permanece não verificado |

O bootstrap do workspace respeita a versão `pnpm@9.15.9` declarada no `packageManager`: os scripts
raiz e o Tauri usam `corepack pnpm`, sem caminho absoluto específico da máquina. Nesta execução,
`corepack pnpm install --frozen-lockfile`, `corepack pnpm typecheck` e `corepack pnpm test` foram
executados com sucesso após liberar o acesso ao registry. O modo offline continua limitado pela
ausência de um tarball específico no cache local, mas isso não bloqueia a instalação normal com
registry disponível.

O code-splitting final separa o runtime autenticado/Supabase, o shell protegido, os providers de
Hoje e cada página. No build final, os maiores chunks lazy medidos foram Supabase (227,25 kB),
KaTeX (261,72 kB) e PhoneField (120,04 kB); nenhum ultrapassou 500 kB.

## Módulos revisados

| Módulo | Revisão concluída |
|---|---|
| Hoje | composição, navegação rápida, erro de tipo de rota corrigido; build validado |
| Tarefas | kanban/lista/recorrentes, materialização por usuário e runtime de tarefas; testes de serviço passando |
| Agenda | views, eventos recorrentes, Google Calendar, Zoom e chave de data local corrigida |
| Metas e Hábitos | progresso, rotinas, lembretes e regras de domínio cobertos por testes |
| Estudos | cadernos, quizzes, sessões e integrações; testes de serviço passando |
| Segundo Cérebro | páginas, blocos, bases, links e graph view incluídos no build |
| Biblioteca | itens, ciclos, coleções e relações incluídos no build |
| Documentos | upload, OCR, versões, lixeira, relações e warranties; OCR ficou resolvível no build validado |
| Finanças | transações, contas, cartões, orçamentos, parcelas e alertas incluídos no build |
| Vida Pessoal | check-in, pomodoro, projetos, veículos, contatos, compras e listas; assinatura do hook corrigida |
| Gamificação | XP, níveis, desafios diários, conquistas e badges; testes de serviço passando |
| Perfil/Segurança/Manager | separação de responsabilidade, MFA/PIN, sessões e funções de Dono revisadas estaticamente |
| Vex | painel/conversa, STT, limites, validação de tools, confirmação e proteção contra conteúdo externo não confiável |

## Segurança e Supabase

### Conta de proprietário verificada

Foi feita uma leitura de verificação no projeto remoto após a configuração da conta do proprietário:

- `role = dono` e `account_tier = vip`;
- `xp = 122.500`, que corresponde ao nível 50 pela curva única de gamificação;
- título selecionado: `Dono`;
- 58 badges distintos concedidos, correspondendo ao catálogo atual completo: as quatro conquistas, o badge de proprietário e os 50 marcos de tempo de assinatura.

Essa checagem foi somente de leitura e não altera dados da conta.

### Correções aplicadas

- `public.app_secrets` agora nega acesso a `anon` e `authenticated` por policy restritiva e grants
  de cliente revogados; somente as Edge Functions com `service_role` precisam acessar seus valores.
- O Tauri deixou de usar `csp: null`: a política agora restringe scripts, objetos, formulários,
  conexões e iframes às origens realmente usadas pelo app, com uma variante própria para o dev.
- Os argumentos das ferramentas da Vex são validados contra schema antes de chamar repositories:
  objeto, campos obrigatórios, campos desconhecidos, tipos, enum e limite de tamanho.
- `vex-chat` e `vex-web-search` limitam payload, tempo de rede e detalhes de erro expostos; ambas
  estão ativas remotamente com JWT obrigatório, versão 3, autenticação explícita do usuário e
  rate limit leve por usuário.
- A Vex limita o contexto enviado à IA por quantidade de mensagens e caracteres, evita chamadas
  idênticas simultâneas, aplica backoff quando o provedor primário falha e valida a resposta antes
  de devolvê-la à aplicação. Mensagens do cliente e resultados de tools externos são tratados como
  dados não confiáveis, nunca como instruções do sistema.
- O fluxo de autenticação não permanece indefinidamente em loading quando Supabase/MFA/perfil
  falham: há encerramento explícito, retry ou bloqueio seguro. A disponibilidade de username não
  transforma uma falha de rede em falso "nome já ocupado".
- A consulta do nível de garantia do MFA agora tem timeout de 8 segundos e bloqueia o acesso com
  mensagem de retry quando a resposta do Auth fica pendente; o comportamento tem testes próprios.
- Os hooks de identidades, passkeys, fatores MFA, sessões e PIN agora usam `try/finally` e
  encerram o loading mesmo quando a API do Auth lança uma exceção inesperada, preservando o último
  estado válido na tela de Segurança.
- O hook de notificações push agora trata falhas de Service Worker, permissão e unsubscribe sem
  deixar a tela presa em loading ou produzir rejeição não tratada.
- O RPC `is_username_available(text)` continua executável por `anon` para o cadastro, mas perdeu
  o `EXECUTE` de `authenticated`, que não era usado pelo frontend.
- `send-notifications` foi publicado na versão 8 com filtro explícito por `user_id` ao calcular
  orçamento e com autenticação de cron.
- OAuth Google valida expiração de estado em 10 minutos e continua consumindo o estado uma única vez.
- Zoom valida título/duração, limita timeout e não repassa erro cru do provedor.
- A abertura de downloads em nova janela foi protegida contra acesso via `window.opener` usando
  `noopener,noreferrer`.
- Os jobs `send-notifications-every-5-min` e `sync-google-calendar-every-10-min` continuam ativos,
  mas agora leem o segredo do Vault. O valor foi rotacionado para um segredo hexadecimal de 64
  caracteres; o literal não fica mais em `cron.job.command`.

### Reconciliação de schema executada

- `20260923000007_reconcile_recurring_task_occurrences.sql` adicionou/verificou
  `tasks.recurring_task_id`, `tasks.recurrence_date`, a unicidade por ocorrência e o índice
  correspondente. Isso corrige a materialização das tarefas recorrentes no painel.
- `20260923000008_reconcile_gamification_contract.sql` adicionou/verificou os contadores
  `gamification_stats.checkin_days_completed` e `gamification_stats.quizzes_90_plus`, criou a
  tabela `user_daily_challenge_progress` e confirmou RLS com policies próprias. Isso corrige o
  contrato usado pelos desafios diários e pelo desbloqueio de conquistas.
- `20260923000009_reconcile_recurring_event_occurrences.sql` adicionou/verificou
  `events.recurring_event_id`, `events.recurrence_date`, a unicidade por ocorrência e o índice
  correspondente. A geração manual e o cron agora fazem upsert idempotente, avançam a série com
  compare-and-set e não emitem notificação duplicada.
- A comparação dos usos `.from(...)` do código com as tabelas públicas remotas não encontrou outro
  objeto ausente entre os módulos revisados; eventos recorrentes, OCR, veículos e checkpoints estão
  presentes e com as colunas consumidas pelo código.

### Verificações remotas

- 81/81 tabelas públicas com RLS.
- Nenhuma tabela pública com RLS sem policy.
- `app_secrets` com policy `app_secrets_deny_client_access` para clientes.
- 6 Edge Functions ativas: `send-notifications` v8, `create-zoom-meeting` v4,
  `google-oauth-callback` v2, `sync-google-calendar` v4, `vex-chat` v3 e `vex-web-search` v3.
- O SQL de funções administrativas mostrou guards internos por `is_owner()` ou por
  `auth.uid()` nos RPCs sensíveis revisados.
- A revisão dos 14 RPCs `SECURITY DEFINER` confirmou que `is_username_available` é o único
  executável por `anon` e retorna apenas disponibilidade booleana; 12 RPCs permanecem executáveis
  por `authenticated`, limitados por `is_owner()`, `auth.uid()` ou pela própria sessão. Os
  RPCs que listam segredos retornam apenas nomes/metadados, nunca os valores.
- Consulta direta a `pg_proc` confirmou que as 14 funções `SECURITY DEFINER` têm configuração
  explícita de `search_path` (`without_function_config=0`, `without_search_path_config=0`),
  com exatamente 1 executável por `anon` e 12 por `authenticated`, em linha com o contrato
  revisado e com os avisos restantes do advisor.
- Foi executado um contrato negativo/positivo em transação com `SET LOCAL ROLE authenticated`:
  um UUID sem perfil retornou `is_owner=false`, zero linhas de visão geral, contas e metadados de
  segredos; a conta de Dono verificada retornou `is_owner=true`, uma visão geral, uma conta e 11
  metadados de segredos. A transação terminou com `ROLLBACK`, sem alterar dados.
- O projeto remoto agora tem 2 perfis: 1 Dono e 1 usuário comum. O contrato de isolamento foi
  executado para os dois em transações com `ROLLBACK`: o usuário comum viu somente o próprio
  perfil, não viu o perfil do Dono, os 58 badges, a gamificação ou qualquer registro dos domínios
  amostrados; `is_owner=false` e `list_all_accounts()` retornou zero. O Dono retornou
  `is_owner=true` e a visibilidade ampliada de perfis prevista para o painel administrativo,
  mas não recebeu dados de domínio do usuário comum. A tentativa de `SELECT` direto em
  `app_secrets` sob `authenticated` foi recusada por privilégio.
- Para provar também a direção positiva sem deixar lixo no banco, uma tarefa temporária foi
  criada para o usuário comum dentro de uma transação e removida por `ROLLBACK`: o usuário comum
  viu `own_task_rows_visible=1` e `owner_task_rows_visible=0`; o Dono viu
  `regular_task_rows_visible_to_owner=0`.

## Pendências que impedem declarar produção pronta

### P0 — reconciliação histórica de migrations

O checkout tem 40 arquivos locais e o projeto remoto registra 61 migrations com versões/nomenclatura
históricas diferentes. O schema remoto contém objetos que não devem ser recriados cegamente. A
reconciliação funcional aditiva já cobriu tarefas recorrentes e gamificação; ainda é necessário
fechar o inventário de equivalências históricas e garantir que uma instalação/branch nova seja
reproduzível sem depender das migrations remotas antigas. O ADR está em
`docs/architecture/adr-001-schema-drift-and-migration-reconciliation.md` e o inventário detalhado
está em `docs/architecture/migration-inventory-20260923.md`.

### Limitação do plano — proteção contra senhas comprometidas

O Supabase Security Advisor ainda reporta `auth_leaked_password_protection`. É configuração do
Dashboard, mas a documentação oficial do Supabase informa que a proteção contra senhas vazadas
está disponível no plano Pro ou superior. Portanto, não é uma ação gratuita disponível neste
projeto. O fluxo local continua exigindo senha forte e o Supabase Auth armazena apenas o hash;
não foi criada uma integração improvisada que envie senhas para terceiros. A decisão e a
referência estão em `PENDENCIAS_USUARIO.md`.

### P1 — otimização das policies RLS

O advisor ainda reporta 271 ocorrências de `auth_rls_initplan` e uma duplicidade permissiva
intencional em `profiles` para seleção própria/gerencial. As 35 FKs sem índice foram corrigidas
pela migration aditiva `performance_fk_indexes`; o advisor não reporta mais
`unindexed_foreign_keys` após a aplicação remota. O aumento temporário de `unused_index` é
esperado em um projeto com pouca carga histórica e deve ser reavaliado após tráfego real.
A migration `20260923000004_rls_auth_uid_initplan.sql` foi testada em transação com rollback, mas
não foi aplicada em produção. Ela só deve avançar em branch de desenvolvimento, com testes
positivos e negativos entre pelo menos dois usuários e aprovação explícita.

### P1 — grants `SECURITY DEFINER`

O advisor mantém 1 RPC `SECURITY DEFINER` público para disponibilidade de username e 12 RPCs
executáveis por usuários autenticados. Eles são necessários para cadastro, sessões, segurança,
resgate e painel de Dono, mas precisam de uma suíte de integração negativa (usuário comum não pode
ler/alterar contas, segredos ou dados de outro usuário) antes de reduzir grants. O contrato básico
de Dono versus usuário sem perfil já foi exercitado em transação reversível; falta a suíte completa
com dois usuários e todos os domínios.

### P1 — validação real de browser/mobile — Android adiado pelo usuário

As rotas públicas de autenticação já foram exercitadas em Chrome headless com AccessLint e não
reportaram violações. O smoke test HTTP confirma que o shell entrega todas as rotas, mas ainda não
substitui a validação de cada tela autenticada em viewport desktop/mobile. A validação do APK em
emulador/dispositivo e do microfone/STT nativo no Tauri Android foi explicitamente adiada pelo
usuário; não será executada nesta rodada. A permissão `RECORD_AUDIO` já é inserida de forma
idempotente pelo script `tools/ensure-android-microphone-permission.mjs` durante o build.

O projeto remoto agora possui dois perfis e o contrato de isolamento entre eles já foi exercitado
em transações reversíveis. O segundo usuário ainda não possui registros permanentes nos módulos
de domínio, mas a leitura positiva de uma tarefa temporária e o bloqueio nas duas direções foram
comprovados antes do `ROLLBACK`.

### P2 — testes de integração das Edge Functions

Há verificadores estáticos automatizados em `tools/audit-edge-functions.mjs` e um smoke test
reprodutível em `tools/audit-edge-runtime.mjs`: as rotas protegidas foram exercitadas sem
autenticação e bloquearam com `401`, e o callback OAuth rejeitou/redirectou estado ausente.
Ainda falta o harness autenticado para testar JWT válido, cron secret, OAuth expirado, timeout
do provedor, idempotência de notificações e isolamento RLS contra o projeto remoto/branch.

## Decisão do revisor

**Aprovado para avanço parcial:** o app compila, os testes unitários passam, o APK debug é gerado,
as rotas entregam o shell e os principais riscos de segurança encontrados foram tratados. **Não
aprovado como pronto para produção** enquanto migration drift, revisão de RLS/grants e validação
real desktop/mobile permanecerem abertos. A proteção contra senhas vazadas permanece como limitação
conhecida do plano atual, não como uma cobrança obrigatória para continuar o desenvolvimento.
