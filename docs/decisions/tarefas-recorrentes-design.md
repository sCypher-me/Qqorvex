# Tarefas recorrentes (design)

Definido com o usuário em 12/09/2026 via brainstorming. Primeiro dos dois sub-projetos de
"recorrência" adiados desde a sessão original de Tarefas/Agenda (eventos recorrentes fica para
depois, sub-projeto independente — Tarefas e Agenda são módulos diferentes).

## Decisões

- Frequências: diária, semanal, mensal (sem dias específicos da semana — mesmo corte que Metas &
  Hábitos já fez pra Hábitos com frequência "dias_especificos").
- Geração da próxima ocorrência: **automática via cron**, ampliando a Edge Function
  `send-notifications` (já roda a cada 5 min) com uma 5ª fonte — não um botão manual.
- Tarefa gerada é independente da receita de recorrência depois de criada: editar/completar/apagar
  não afeta a série, que continua gerando as próximas normalmente (mesmo espírito de
  `generateOccurrence` em Finanças — a transação gerada não é "amarrada" à recorrência depois).

## Schema

```sql
create type public.task_recurrence_frequency as enum ('diaria', 'semanal', 'mensal');

create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  priority public.task_priority not null default 'sem_prioridade',
  frequency public.task_recurrence_frequency not null,
  start_date date not null,
  next_occurrence_date date not null,
  status public.recurring_status not null default 'ativa',
  created_at timestamptz not null default now()
);
```
`recurring_status` (`ativa`/`pausada`/`cancelada`) já existe (criado por Finanças) — reaproveitado
sem recriar. RLS padrão (própria linha, `user_id = auth.uid()`).

## Cálculo e geração (funções puras + repositório)

`computeNextTaskOccurrenceDate(currentDate, frequency)` — nova em `module-tarefas/service.ts`:
diária +1 dia, semanal +7 dias, mensal +1 mês (usando `Date.setMonth`, mesmo padrão de
`addMonthsToDate` em Finanças).

`generateTaskOccurrence(client, userId, recurring)` — novo em `module-tarefas/repository.ts`: cria
a `task` de verdade (`due_date = recurring.next_occurrence_date`, `title`/`description`/`priority`
copiados da recorrência) e avança `next_occurrence_date` via `computeNextTaskOccurrenceDate`.

## Cron — 5ª fonte em `send-notifications`

A Edge Function já processa 4 fontes (lembretes de evento, orçamento, hábito, fatura de cartão) a
cada 5 min. Ganha uma 5ª: para cada `recurring_tasks` com `status = 'ativa'` e
`next_occurrence_date <= hoje`, chama a versão replicada de `generateTaskOccurrence`
(Edge Function não importa pacotes do monorepo — reimplementação verificada linha por linha contra
a função original, mesmo padrão já usado pra `card_statements`) e envia um push avisando ("Tarefa
recorrente criada: X").

## UI

Novo `RecurringTasksPanel` em `/tarefas`, nova aba ao lado de Kanban/Todas as Tarefas: criar
recorrência (título + frequência + data de início), listar ativas com a próxima data, pausar/
retomar/cancelar.

## Teste

**Implementado e testado em 12/09/2026.** `computeNextTaskOccurrenceDate()` testada isoladamente
(8 checks: diária/semanal/mensal, virada de mês/ano) e cruzada contra a reimplementação da Edge
Function linha por linha — as duas batem exatamente para todos os casos. Migration + RLS
verificadas ao vivo. Edge Function testada de verdade em produção (`curl` direto no endpoint com o
segredo do cron), com uma recorrência diária temporária: gerou a tarefa com `due_date` correto,
avançou `next_occurrence_date`, repetiu o "catch-up" corretamente a cada chamada (uma ocorrência
por vez até alcançar a data atual — mesmo comportamento incremental de `generateOccurrence` em
Finanças) e parou de gerar assim que alcançou hoje; pausar a recorrência (`status = 'pausada'`)
corretamente impediu a geração mesmo com data vencida. Dados de teste removidos ao final. Como a
inscrição push real do usuário estava ativa, **ele recebeu 3 notificações de teste reais**
("Tarefa recorrente criada: Teste Recorrência") durante o teste — mesmo padrão já aceito
anteriormente nesta sessão pras fontes de orçamento/hábito (teste em horário do dia, não durante o
sono). Typecheck e build limpos. UI (criar/pausar/retomar/cancelar em `/tarefas`) sem teste de
clique real — fica pro usuário.
