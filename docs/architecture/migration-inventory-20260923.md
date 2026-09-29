# Inventário de migrations — snapshot 23/09/2026

Este documento registra a divergência de histórico sem tentar reconstituir o passado por reset.
A fonte remota é o histórico do projeto Supabase `uowipikbumbaprckdvkg`; a fonte local é o
diretório `supabase/migrations`. Os nomes/versões remotos não precisam coincidir com os arquivos
locais: várias migrations antigas foram aplicadas com timestamps diferentes ou agrupadas.

- Migrations locais: **41**
- Migrations remotas: **62**
- Diferença de histórico: **21** registros remotos sem arquivo local equivalente por nome/versão
- Confirmação pelo `supabase migration list --linked`: CLI **2.115.0**, com os 41 registros
  locais e 62 registros remotos aparecendo em colunas separadas.

## Reconciliações aditivas verificadas

| Arquivo local | Registro remoto correspondente | Estado |
|---|---|---|
| `20260923000003_security_hardening.sql` | `20260923051513 / security_hardening_app_secrets_client_deny` | aplicado e verificado |
| `20260923000005_cron_secret_vault.sql` | `20260923055805 / cron_secret_vault` | aplicado e verificado |
| `20260923000006_rotate_cron_secret.sql` | `20260923055854 / rotate_cron_secret` | aplicado e verificado |
| `20260923000007_reconcile_recurring_task_occurrences.sql` | `20260923060411 / reconcile_recurring_task_occurrences` | aplicado e verificado |
| `20260923000008_reconcile_gamification_contract.sql` | `20260923060813 / reconcile_gamification_contract` | aplicado e verificado |
| `20260923000009_reconcile_recurring_event_occurrences.sql` | `20260923061815 / reconcile_recurring_event_occurrences` | aplicado e verificado |
| `20260923000010_performance_fk_indexes.sql` | `20260923065229 / performance_fk_indexes` | aplicado e verificado |
| `20260923000011_restrict_username_availability_grant.sql` | `20260923072242 / restrict_username_availability_grant` | aplicado e verificado |
| `20260923000012_profile_avatars.sql` | `20260923135851 / profile_avatars` | aplicado e verificado |

A migration `20260923000004_rls_auth_uid_initplan.sql` continua deliberadamente fora da produção.
Ela foi testada em transação com rollback e exige branch de desenvolvimento, testes positivos e
negativos de isolamento entre usuários e aprovação antes de aplicação.

## Arquivos locais

- `20260909000001_profiles.sql`
- `20260909000002_profiles_hardening.sql`
- `20260909000003_tasks.sql`
- `20260909000004_events.sql`
- `20260909000005_goals_habits.sql`
- `20260909000006_estudos.sql`
- `20260909000007_segundo_cerebro.sql`
- `20260909000008_biblioteca.sql`
- `20260909000009_documentos.sql`
- `20260909000010_financas.sql`
- `20260909000011_estudos_integrations.sql`
- `20260909000012_routines.sql`
- `20260909000013_card_statements.sql`
- `20260909000014_documentos_lixeira.sql`
- `20260909000015_documentos_hash.sql`
- `20260909000016_bases_view_config.sql`
- `20260909000017_notificacoes.sql`
- `20260909000018_orcamento_alertas.sql`
- `20260909000019_habitos_lembretes.sql`
- `20260909000020_documentos_versionamento.sql`
- `20260909000021_vida_pessoal_planejamento.sql`
- `20260909000022_vida_pessoal_bem_estar.sql`
- `20260909000023_vida_pessoal_pratica.sql`
- `20260909000024_agenda_google_calendar.sql`
- `20260909000025_agenda_google_oauth_state.sql`
- `20260909000026_fatura_lembrete_vencimento.sql`
- `20260911000001_vex_conversas.sql`
- `20260922000001_gamificacao_conquistas.sql`
- `20260922000002_tarefas_recorrentes_ocorrencias.sql`
- `20260923000001_profile_showcase.sql`
- `20260923000002_vip_owner_profile_showcase.sql`
- `20260923000003_security_hardening.sql`
- `20260923000004_rls_auth_uid_initplan.sql`
- `20260923000005_cron_secret_vault.sql`
- `20260923000006_rotate_cron_secret.sql`
- `20260923000007_reconcile_recurring_task_occurrences.sql`
- `20260923000008_reconcile_gamification_contract.sql`
- `20260923000009_reconcile_recurring_event_occurrences.sql`
- `20260923000010_performance_fk_indexes.sql`
- `20260923000011_restrict_username_availability_grant.sql`
- `20260923000012_profile_avatars.sql`

## Histórico remoto

- `20260909083237` — profiles
- `20260909083303` — profiles_hardening
- `20260909083317` — handle_new_user_revoke_public
- `20260909084522` — tasks
- `20260909090030` — events
- `20260909091848` — goals_habits
- `20260909092839` — estudos
- `20260909095357` — segundo_cerebro
- `20260909130346` — biblioteca
- `20260909150709` — documentos
- `20260909193233` — financas
- `20260909195122` — estudos_integrations
- `20260910113034` — routines
- `20260910121211` — card_statements
- `20260910154309` — documentos_lixeira
- `20260910154937` — documentos_hash
- `20260910161749` — bases_view_config
- `20260910170839` — notificacoes
- `20260910205140` — orcamento_alertas
- `20260910205754` — habitos_lembretes
- `20260910210600` — documentos_versionamento
- `20260910225922` — vida_pessoal_planejamento
- `20260911015500` — vida_pessoal_bem_estar
- `20260911020346` — vida_pessoal_pratica
- `20260911041557` — agenda_google_calendar
- `20260911041808` — agenda_google_oauth_state
- `20260911043521` — agenda_google_oauth_state_select_policy
- `20260911072037` — fatura_lembrete_vencimento
- `20260911121554` — vex_conversas
- `20260911150252` — estudos_quiz
- `20260911170008` — seguranca_sessoes_rpc
- `20260911170033` — seguranca_sessoes_rpc_revoke_anon
- `20260911170111` — seguranca_sessoes_rpc_revoke_anon_explicit
- `20260911194955` — seguranca_pin_cofre
- `20260911195154` — seguranca_pin_cofre_exige_pin_atual
- `20260911195218` — seguranca_pin_cofre_drop_overload_antiga
- `20260911195853` — seguranca_pin_cofre_lockout_no_set_pin
- `20260912085328` — metas_progresso_derivado
- `20260912143113` — tarefas_recorrentes
- `20260912150132` — eventos_recorrentes
- `20260912151516` — financas_veiculos
- `20260912153521` — segundo_cerebro_checkpoints
- `20260912161617` — documents_add_extracted_text
- `20260912163750` — gamification_core
- `20260915181944` — restrict_security_pin_functions_to_authenticated
- `20260917142220` — manager_role_and_redemption_codes
- `20260917142313` — restrict_manager_functions_to_authenticated
- `20260917142445` — manager_overview_and_secrets_functions
- `20260917142624` — manager_list_accounts_with_email
- `20260917142639` — manager_delete_account
- `20260918132435` — auth_registro_completo
- `20260918132456` — auth_registro_completo_revoke_anon_gerador
- `20260918132531` — auth_registro_completo_fix_search_path
- `20260923051513` — security_hardening_app_secrets_client_deny
- `20260923055805` — cron_secret_vault
- `20260923055854` — rotate_cron_secret
- `20260923060411` — reconcile_recurring_task_occurrences
- `20260923060813` — reconcile_gamification_contract
- `20260923061815` — reconcile_recurring_event_occurrences
- `20260923065229` — performance_fk_indexes
- `20260923072242` — restrict_username_availability_grant
- `20260923135851` — profile_avatars

## Próxima ação segura

Recuperar ou reconstruir as migrations históricas ausentes em um branch de desenvolvimento,
comparando o schema resultante com o projeto atual. Não aplicar arquivos antigos cegamente no
projeto principal e não usar reset destrutivo para eliminar a divergência. O branch estimado pelo
Supabase custa US$ 0,01344/h na organização atual e requer confirmação explícita antes da criação.

### Decisão sem custo

Como o usuário não autoriza custos adicionais, nenhum branch será criado. A reconciliação continua
de forma segura no projeto atual: migrations novas devem ser aditivas e idempotentes, o catálogo
remoto permanece a fonte de verdade operacional e um dump do schema poderá ser comparado com o
checkout quando houver um ambiente local autorizado para isso. A ausência da branch não impede o
uso do app nem o aceite Web/Desktop; apenas mantém a reprodução histórica completa como pendência.
