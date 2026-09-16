# Metas & Hábitos — Progresso "derivado" de Finanças (design)

Definido com o usuário em 12/09/2026 via brainstorming. `goals.progress_type` sempre teve 3
valores (`binario`/`marcos`/`derivado`); "marcos" funciona desde a sessão original, "derivado"
nunca funcionou — `GoalCard` mostrava "progresso derivado indisponível (módulo de origem ainda não
existe)" porque Finanças não existia quando Metas & Hábitos foi construído. Finanças existe agora.

## Decisões

- Uma meta "derivada de Finanças" acompanha o **saldo de uma Conta específica**.
- Progresso = **saldo absoluto atual da conta** comparado ao valor-alvo (não "quanto foi
  acrescentado desde a criação da meta" — mais simples, sem precisar guardar saldo inicial).
- Configurado **dentro do card da meta já criada** (mesmo padrão de Marcos/Hábitos vinculados),
  não na captura rápida (`NewGoalForm` continua só com título, regra do próprio Xmind).

## Schema

```sql
alter table public.goals
  add column progress_source_account_id uuid references public.accounts(id) on delete set null;
```
Nula por padrão; só relevante quando `progress_type = 'derivado'`. `progress_numeric_target`
(já existente, nunca usado) vira o valor-alvo. `on delete set null` — apagar a conta não apaga a
meta, só desvincula (mesmo padrão de `task_id`/`assessment_id`).

## Cálculo (funções puras)

`computeAccountBalance(transactions, accountId)` — nova em `@qqorvex/module-financas/service.ts`:
soma entradas/saídas da conta e transferências de/para ela, só transações `status = 'concluida'`
(mesmo critério de "saldo atual" que `computeBalances()` já usa).

`computeDerivedProgress(currentBalance, targetAmount)` — nova em
`@qqorvex/module-metas-habitos/service.ts`: retorna percentual 0–100 (`targetAmount <= 0` → 0).

## Cross-module

`@qqorvex/module-metas-habitos` passa a importar `@qqorvex/module-financas` diretamente
(`listAccounts`, `listTransactions`, `computeAccountBalance`) — mesmo precedente já usado por
Estudos importando Agenda (`createEventForAssessment`) e Biblioteca (`LibraryItem`). Nova
dependência declarada no `package.json` do módulo.

## Repositório e UI

Novo `updateGoalProgressSource(client, goalId, { progressType, progressSourceAccountId,
progressNumericTarget })` em `metas-habitos/repository.ts` + hook `useUpdateGoalProgressSource`.

`GoalCard` ganha seção "Progresso financeiro": se a meta não é derivada, mostra seletor de Conta +
campo de valor-alvo + botão "Vincular"; se já é, mostra "R$X de R$Y (Conta) — N%" com botão
"Desvincular" (volta `progress_type` pra `binario`, limpa `progress_source_account_id`/
`progress_numeric_target`). O cálculo do saldo/percentual acontece num hook novo dentro do próprio
`GoalCard` (ou hook dedicado), usando as funções acima — nunca persistido, mesmo espírito de
`computeMilestoneProgress`.

## Teste

**Implementado e testado em 12/09/2026.** `computeAccountBalance()` testada isoladamente (9 checks
no total com `computeDerivedProgress()`): entrada/saída na própria conta, transferência saindo de
uma conta e entrando em outra, transação `futura` corretamente ignorada, conta desconhecida
retorna 0. `computeDerivedProgress()`: abaixo/no/acima do alvo (capado em 100), saldo negativo
(piso em 0), alvo zero/negativo (retorna 0). Migration + `on delete set null` verificados ao vivo
contra o Supabase real: meta derivada criada apontando pra uma Conta, apagar a Conta limpou só a
referência (`progress_source_account_id` virou `null`, a meta sobreviveu — mesmo padrão de
`task_id`/`assessment_id`), dados de teste removidos ao final. RLS herdada de `goals` sem
policies novas. Typecheck e build limpos. UI (seção "Progresso financeiro" em `GoalCard`) sem
teste de clique real — fica pro usuário.
