# Eventos recorrentes (design)

Definido com o usuário em 12/09/2026 via brainstorming. Segundo dos dois sub-projetos de
"recorrência" adiados desde a sessão original — Tarefas recorrentes já implementado (ver
`docs/decisions/tarefas-recorrentes-design.md`), mesma arquitetura geral, adaptada aos detalhes de
Agenda (buffers, `findConflicts()`, sincronização com Google Calendar).

## Decisões

- Frequências: diária/semanal/mensal — mesmo corte de Tarefas/Hábitos, consistente entre módulos.
- Conflito na geração automática: **cria a ocorrência mesmo assim e avisa por push** — não há
  ninguém pra confirmar "criar mesmo assim"/"escolher outro horário" (fluxo manual existente) no
  momento do cron; pular silenciosamente quebraria a promessa de "recorrente" sem o usuário saber.
- Google Calendar: ocorrência gerada sincroniza como **evento normal** — é só mais uma linha em
  `events` sem `google_event_id`, o sync bidirecional já existente (a cada 10 min) pega sozinho.
  Nenhuma mudança em `sync-google-calendar`.

## Schema

```sql
create table public.recurring_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  location text,
  meeting_link text,
  category text not null default 'compromisso',
  is_all_day boolean not null default false,
  start_time time,
  end_time time,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  frequency public.task_recurrence_frequency not null,
  start_date date not null,
  next_occurrence_date date not null,
  status public.recurring_status not null default 'ativa',
  created_at timestamptz not null default now()
);
```
Reaproveita `task_recurrence_frequency` e `recurring_status` (já existem, mesmos valores) em vez de
duplicar enums. `start_time`/`end_time` guardam só a hora do dia (null quando `is_all_day`); a data
de cada ocorrência vem de `next_occurrence_date`. RLS padrão (própria linha).

## Cálculo e geração

`computeNextEventOccurrenceDate(currentDate, frequency)` — nova em `module-agenda/service.ts`,
mesma lógica de `computeNextTaskOccurrenceDate` mas própria do módulo (Agenda não importa
Tarefas — direção de acoplamento sem precedente e sem necessidade real aqui).

`generateEventOccurrence(client, userId, recurring)` — novo em `module-agenda/repository.ts`:
combina `next_occurrence_date` + `start_time`/`end_time` em `start_at`/`end_at` ISO, cria o evento
de verdade (copiando título/descrição/local/link/categoria/buffers da recorrência) e avança
`next_occurrence_date`.

## Cron — 6ª fonte em `send-notifications`

Reimplementa `findConflicts()` (overlap considerando buffers — poucas linhas, já verificado contra
a versão original) só pra decidir a mensagem da notificação: cria a ocorrência sempre, mas avisa
"criado, mas colide com X — confira sua agenda" quando há sobreposição, ou a mensagem normal
quando não há.

## UI

Novo `RecurringEventsPanel` em `/agenda` (nova aba/seção), mesmo padrão de criar/listar/pausar/
retomar/cancelar do painel de Tarefas recorrentes.

## Teste

**Implementado e testado em 12/09/2026.** `computeNextEventOccurrenceDate()` testada isoladamente
(mesmos casos de Tarefas). Reimplementação do conflito na Edge Function cruzada contra
`findConflicts()` original com 4 casos (sobreposição direta, sobreposição só por buffer, sem
sobreposição, evento de dia inteiro excluído) — bateram exatamente. Migration + RLS verificadas ao
vivo. Edge Function testada em produção via `curl` direto: gerou a ocorrência com `start_at`/
`end_at` corretos a partir de `next_occurrence_date`+`start_time`/`end_time`, avançou a data,
criou a ocorrência mesmo colidindo com um evento existente forçado no mesmo horário (decisão de
"criar sempre e avisar" confirmada — não pulou nem bloqueou), e pausar a recorrência corretamente
impediu a geração mesmo com data vencida. Não foi possível inspecionar o texto exato da notificação
push enviada (sem log explícito no código pra isso) — a lógica de decisão da mensagem (com/sem
conflito) já está coberta pela verificação cruzada da função de conflito. Dados de teste removidos
ao final. Como a inscrição push real do usuário estava ativa, ele recebeu 2 notificações de teste
reais durante o teste (mesmo padrão já aceito nesta sessão). Typecheck e build limpos. UI (criar/
pausar/retomar/cancelar em `/agenda`) sem teste de clique real — fica pro usuário.
