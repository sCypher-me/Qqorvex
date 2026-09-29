# ADR-001: Reconciliação segura entre migrations locais e banco remoto

## Status

Aceito

## Contexto

O banco remoto do projeto `qqorvex` possui 81 tabelas e migrations aplicadas que não
estão representadas pelos arquivos atualmente presentes em `supabase/migrations`.
O repositório local possui migrations monolíticas para parte da mesma base, além de
alterações incrementais recentes. Portanto, o estado remoto não é reproduzível com
um `supabase db reset` usando apenas o checkout atual.

## Decisão

Não tentar “corrigir” o drift apagando dados, resetando o projeto ou reordenando
migrations automaticamente. Cada correção nova deve:

1. ser registrada em uma migration local;
2. ser aplicada remotamente de forma aditiva e verificável;
3. ser comparada com o catálogo real do banco antes de alterações destrutivas;
4. gerar um inventário de objetos remotos que ainda precisam ser reconciliados.

## Racional

- preserva dados reais e o acesso atual do usuário;
- mantém rollback e auditoria possíveis;
- evita duplicar tabelas/funções que já existem remotamente;
- permite continuar corrigindo segurança e UX enquanto a reconciliação é feita.

As primeiras incompatibilidades de runtime encontradas foram tratadas por migrations aditivas:
`20260923000007_reconcile_recurring_task_occurrences.sql` reconciliou as ocorrências de tarefas
recorrentes, e `20260923000008_reconcile_gamification_contract.sql` reconciliou os contadores de
conquistas e o progresso dos desafios diários. A migration
`20260923000009_reconcile_recurring_event_occurrences.sql` aplica o mesmo contrato idempotente
às ocorrências da Agenda.

## Consequências

- o banco continua temporariamente dependente de objetos que ainda não têm
  equivalente local;
- a paridade completa exigirá recuperar ou reconstruir as migrations ausentes;
- toda migration futura deve ser validada tanto contra o schema remoto quanto
  contra um banco recém-criado.

## Gatilho para revisar

Quando o inventário de funções, policies, tabelas, índices e triggers remotos for
reconciliado com o diretório local, substituir este ADR por uma decisão de baseline
reprodutível.

## Atualização de execução — 23/09/2026

O projeto remoto agora registra 61 migrations e o checkout contém 40 arquivos locais. As
correções aditivas de contrato para tarefas recorrentes, gamificação, eventos recorrentes e
índices de FKs foram aplicadas sem resetar dados. A migration
`20260923000010_performance_fk_indexes.sql` eliminou o aviso `unindexed_foreign_keys` do
Performance Advisor. A divergência histórica continua sendo uma pendência de baseline; este ADR
permanece vigente até que uma instalação nova possa ser reproduzida somente a partir do checkout.
