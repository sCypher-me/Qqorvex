# Auditoria inicial — Qqorvex

**Data:** 23/09/2026  
**Modo:** Cortex → Executor → Revisor  
**Status:** em execução; não é a aprovação final

## Inventário encontrado

- Monorepo pnpm com 20 workspaces detectados pelo próprio pnpm.
- 1 app React/Vite em `apps/qqorvex`.
- 12 pacotes de domínio em `modules/`.
- 6 pacotes compartilhados em `packages/`.
- 22 entradas de rota no `App.tsx`.
- 7 Edge Functions no checkout; 6 estão ativas remotamente.
- 38 migrations versionadas localmente.
- 59 migrations aplicadas no Supabase remoto.
- 81 tabelas públicas remotas; todas com RLS habilitado.
- 277 policies públicas remotas.
- 16 funções públicas remotas; 14 usam `SECURITY DEFINER`.

## Baseline

| Verificação | Resultado | Observação |
|---|---|---|
| Git | executado | checkout já possuía muitas alterações do trabalho anterior; nada foi resetado |
| `git diff --check` | sem erros de whitespace | há apenas avisos normais de conversão LF/CRLF no Windows |
| `pnpm typecheck` | bloqueado no bootstrap | o pnpm ainda recebe `EACCES` no registry; após hidratação local controlada, o `tsc` direto terminou sem erros |
| `pnpm test` | baseline histórico | 12 arquivos, 97 testes no primeiro ciclo; a atualização pós-auditoria chegou a 106 testes via `corepack pnpm test` |
| `pnpm build` | aprovado via Vite direto | build de produção concluído; code-splitting posterior removeu o aviso de chunk acima de 500 kB |
| Scripts oficiais | parcialmente reproduzível | `tsc`, Vitest, Vite e `beforeBuildCommand` do Tauri passaram; o wrapper raiz do pnpm tentou recriar módulos sem TTY |
| Supabase tables/RLS | auditado | 81/81 tabelas com RLS e nenhuma tabela RLS sem policy após a correção |
| Supabase Edge Functions | auditado | 6 funções ativas remotamente; Vex publicado na versão 3 com JWT obrigatório |
| Android/Tauri | APK debug gerado | APK universal em `src-tauri/gen/android/app/build/outputs/apk/universal/debug/`; manifesto mesclado com `RECORD_AUDIO` |
| Desktop/Tauri | build debug gerado | `app.exe`, MSI e instalador NSIS x64 em `src-tauri/target/debug/` |
| Sinks de navegador | auditado | sem `dangerouslySetInnerHTML`, `eval` ou `new Function`; `window.open` protegido |

No primeiro ciclo, o bootstrap offline do pnpm estava bloqueado pela ausência de acesso ao
registry. A atualização posterior liberou o registry, executou a instalação limpa e confirmou
os scripts padrão; o estado atual está registrado em `AUDITORIA_FINAL.md`.

## Correções executadas neste ciclo

### Segurança do banco

- Adicionada migration `20260923000003_security_hardening.sql`.
- `public.app_secrets` passou a ter policy `RESTRICTIVE` explícita com `using (false)` e
  `with check (false)` para `anon` e `authenticated`.
- Grants de cliente foram revogados; o acesso das Edge Functions com `service_role` foi preservado.
- Migration aplicada no Supabase e policy verificada por consulta ao catálogo.

### Robustez da interface

- Criado `AppErrorBoundary` para evitar tela branca em exceções de renderização/lazy loading.
- O detalhe técnico permanece no console; o usuário recebe fallback acessível e ação de recarregar.

### Vex

- Limites de mensagens, caracteres, ferramentas e descrições na `vex-chat`.
- Timeout de 25 segundos para o provedor Gemini.
- Modelo codificado na URL e detalhes brutos do provedor não são devolvidos ao cliente.
- Limite de 500 caracteres e timeout de 15 segundos na `vex-web-search`.
- Conteúdo externo foi explicitamente classificado como dado não confiável no prompt da Vex.
- As duas funções foram publicadas e verificadas como `ACTIVE`, `verify_jwt: true`, versão 2.
- Argumentos vindos de providers agora passam por validação de runtime contra o schema da
  ferramenta antes de alcançar os repositories, incluindo tipos, obrigatórios, enum e limite de
  tamanho.
- O scheduler de notificações reforçou o filtro por `user_id` ao calcular gastos e foi publicado
  como `send-notifications` versão 8, mantendo autenticação por `X-Cron-Secret`.
- O callback OAuth do Google agora rejeita estados com mais de 10 minutos e continua consumindo o
  token uma única vez.
- A integração de reuniões do Zoom agora valida título/horários, limita a duração, aplica timeout
  de rede e não devolve detalhes crus do provedor ao navegador.
- Os jobs `pg_cron` de notificações e sincronização agora resolvem o segredo pelo Supabase Vault,
  em vez de manter o valor literal em `cron.job.command`; o segredo foi rotacionado depois da
  migração e os jobs permaneceram ativos nos intervalos de 5 e 10 minutos.

### Reconciliação funcional do schema

- A migration `20260923000007_reconcile_recurring_task_occurrences.sql` foi aplicada e verificada:
  `tasks.recurring_task_id`, `tasks.recurrence_date`, unicidade por ocorrência e índice estão presentes.
- A migration `20260923000008_reconcile_gamification_contract.sql` foi aplicada e verificada:
  os contadores de conquistas estão em `gamification_stats` e `user_daily_challenge_progress` existe
  com RLS e policies próprias.
- A migration `20260923000009_reconcile_recurring_event_occurrences.sql` foi aplicada e verificada:
  ocorrências de eventos têm chave idempotente; a geração da Agenda e o cron usam upsert e avanço
  condicional para evitar duplicatas.
- Eventos recorrentes, OCR de documentos, veículos e checkpoints foram comparados com o uso no código
  e não apresentaram outro objeto ausente no remoto.
- A revisão dos RPCs `SECURITY DEFINER` confirmou que o único endpoint anônimo é a checagem de
  disponibilidade de username (retorno booleano); os endpoints autenticados usam guardas de dono,
  identidade ou sessão, e a listagem de segredos não devolve valores.
- O `EXECUTE` autenticado de `is_username_available(text)` foi revogado; a checagem continua
  disponível para `anon` durante o cadastro.

## Achados críticos e altos

### P0 — drift histórico de migrations

O remoto tem 21 migrations a mais que o checkout local e há versões/nomenclaturas históricas
divergentes. Os dois contratos funcionais ausentes encontrados nesta rodada já foram reconciliados
de forma aditiva e aplicados. A correção restante não pode ser um reset destrutivo; o ADR
`docs/architecture/adr-001-schema-drift-and-migration-reconciliation.md` define a reconciliação
aditiva e auditável.

### P1 — baseline de engenharia parcialmente bloqueado por ambiente

O pnpm ainda não consegue acessar o registry por `EACCES`. A validação direta já passou depois de
hidratar o `node_modules` ignorado com versões do lockfile, mas ainda falta comprovar uma instalação
limpa e reproduzível pelo comando oficial do projeto. O procedimento está em `PENDENCIAS_USUARIO.md`.

### Limitação do plano — proteção contra senhas vazadas

O Security Advisor reporta a proteção do Supabase Auth desativada. A documentação atual do
Supabase informa que esse recurso é Pro ou superior; por isso, ele permanece como limitação
conhecida do plano gratuito e está descrito em `PENDENCIAS_USUARIO.md`.

### P1 — políticas RLS e funções administrativas

O advisor reporta 271 policies com uso de `auth.*` sem initplan e uma duplicidade permissiva em
`profiles`. As funções administrativas têm guardas internos por `is_owner()`, mas a superfície
de grants precisa ser revisada com testes positivos e negativos antes de qualquer redução de
privilégios, para não quebrar o painel do Dono. A migration de normalização foi preparada e
validada em transação de rollback, mas não foi aplicada em produção: o guardrail recusou a
alteração ampla sem aprovação explícita e branch de desenvolvimento.

### P1 — entrada de voz da Vex parcialmente atendida

A Vex continua sem TTS por decisão de produto, e agora possui Speech-to-Text no navegador com
idioma `pt-BR`, estado visual de transcrição, preservação do texto já digitado e fallback claro
quando a API de reconhecimento não existe ou a permissão é recusada. Ainda falta validar o fluxo
em browsers reais, adicionar uma estratégia nativa para Android/Tauri e decidir se haverá um
fallback offline.

### P1 — validação responsiva e Android parcialmente pendentes

O código possui bastante tratamento de responsividade e o APK debug foi gerado para `aarch64`, mas
ainda faltam testes de viewport com navegador automatizado, instalação em dispositivo/emulador e
validação de permissões nativas. Não será usado `overflow-x: hidden` como correção universal.

## Backlog de execução

- [ ] Reconciliar migrations remotas e locais sem apagar dados.
- [ ] Liberar instalação offline/registry e reproduzir o baseline por `pnpm` em instalação limpa.
- [ ] Revisar todas as policies RLS com testes de isolamento entre dois usuários.
- [ ] Aplicar `20260923000004_rls_auth_uid_initplan.sql` somente após branch/testes e aprovação.
- [ ] Separar grants administrativos legítimos dos avisos do advisor e verificar cada RPC.
- [x] Implementar Speech-to-Text no navegador com fallback textual e permissões claras.
- [ ] Validar Speech-to-Text em browsers reais e avaliar integração nativa/offline no Android.
- [x] Validar argumentos de tool-call em runtime antes de executar repositories.
- [ ] Adicionar testes de runtime das Edge Functions, Vex tools e confirmações.
- [ ] Auditar formulários, loading/error states e Error Boundaries por módulo.
- [ ] Executar smoke tests desktop/mobile nos tamanhos definidos.
- [x] Validar Tauri/Android e gerar APK debug `aarch64`.
- [x] Produzir `AUDITORIA_FINAL.md` após a revisão integrada.

## Parecer do Revisor deste ciclo

**APROVADO para avanço parcial.** As alterações deste ciclo são pequenas, isoladas e foram
verificadas estaticamente; as Edge Functions continuam verificadas no Supabase remoto. A missão
global permanece aberta porque baseline, mobile, Android, RLS completo e reconciliação de schema
ainda não foram validados.

### Atualização pós-auditoria — 23/09/2026

O estado atual foi revalidado após as correções aditivas:

- o checkout contém 40 migrations locais e o projeto remoto registra 61 migrations;
- os 35 relacionamentos sem índice de cobertura apontados inicialmente pelo Performance Advisor
  foram cobertos pela migration `20260923000010_performance_fk_indexes.sql`, aplicada remotamente
  como `performance_fk_indexes`;
- o Performance Advisor não reporta mais `unindexed_foreign_keys`;
- permanecem abertas a reconciliação histórica do baseline, a limitação de proteção contra senhas
  comprometidas do plano atual, a otimização segura das 271 policies RLS e a validação real em
  browser/dispositivo;
- o frontend passou no typecheck, nos 106 testes Vitest, no build Vite e o APK debug Android foi
  gerado novamente com `RECORD_AUDIO` no manifesto mesclado. Os detalhes e hashes estão em
  `AUDITORIA_FINAL.md`.
