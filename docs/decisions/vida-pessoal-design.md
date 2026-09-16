# Vida Pessoal — design (novo módulo)

Escopo recriado em 11/09/2026 direto com o usuário: essa parte do Xmind original foi perdida, então
o desenho abaixo é a nova fonte de verdade pra este módulo (não existe mais um Xmind pra
consultar). "Projetos" e "Ideias" não são módulos separados — tudo vive dentro de "Vida Pessoal",
confirmado explicitamente pelo usuário.

## Estrutura

- Novo módulo `modules/pessoal/vida-pessoal` (`@qqorvex/module-vida-pessoal`), mesmo padrão dos outros 8
  módulos (`types.ts`/`service.ts`/`repository.ts`/`hooks/`/`components/`/`index.ts`).
- Uma rota só, `/vida-pessoal`, com abas internas pros 3 blocos abaixo — não vira 3 itens
  separados no menu principal.
- Onde há sobreposição com módulos existentes, referencia por FK/tabela de junção em vez de
  duplicar dado — mesmo princípio usado em `transactions.document_id`, `events.assessment_id`,
  `goal_habit_relations`.

## Ordem de construção (Abordagem B — fases, uma por bloco)

Mesmo processo usado nos outros 8 módulos: cada bloco vira sua própria migration + repositório +
UI + teste ponta a ponta contra o Supabase real antes de avançar pro próximo.

1. **Planejamento** (Planos, Projetos, Ideias)
2. **Bem-estar** (Check-in diário, Pomodoro)
3. **Vida Prática** (Contatos Úteis, Veículos, Bens e Inventário, Compras Importantes, Lista de
   Compras)

## Bloco 1 — Planejamento

Diferença Plano vs Meta (confirmada pelo usuário): Plano é uma visão ampla e narrativa (ex.: "Ser
um designer"); Meta continua sendo o item específico e mensurável de sempre (ex.: "Estudar UI",
"Estudar UX", "Estudar teoria das cores"). Um Plano agrupa várias Metas já existentes.

- **`plans`**: `id`, `user_id`, `title`, `description` opcional, `plan_type` (enum `mensal` /
  `anual` / `quinquenal`), `period_start` date, `period_end` date (os dois campos cobrem os 3 tipos
  de forma genérica — o rótulo exibido, ex. "2027" ou "2027–2031", é calculado em TS a partir de
  `period_start`/`period_end`/`plan_type`, nunca persistido), `status` (`ativo`/`concluido`/
  `arquivado`, default `ativo`), `created_at`, `updated_at`. RLS por dono direta.
- **`plan_goals`**: junção N:N (`plan_id`, `goal_id`) ligando Planos a `goals` (Metas & Hábitos) —
  mesmo padrão de `goal_habit_relations`. PK composta evita duplicar a mesma relação. Apagar um
  Plano remove só a relação (a Meta sobrevive); apagar uma Meta remove a relação (o Plano
  sobrevive). RLS via join a `plans.user_id`.
- **`projects`**: `id`, `user_id`, `title`, `description` opcional, `status` (`ativo`/`concluido`/
  `arquivado`, default `ativo`), `created_at`, `updated_at`. RLS por dono direta.
- **`project_tasks`**: junção N:N (`project_id`, `task_id`) ligando Projetos a `tasks` (Tarefas) —
  Projeto é só um agrupador, nunca duplica o Kanban. Mesmo princípio de cascata só na relação. RLS
  via join a `projects.user_id`.
- **`ideas`**: `id`, `user_id`, `title`, `description` opcional, `created_at`, `updated_at`. Caixa
  de captura simples, sem status/categoria (decisão explícita do usuário: "caixa de captura
  simples"). RLS por dono direta.
  - UI ganha um botão "Transformar em..." que só pré-preenche o formulário de criar Plano/
    Projeto/Meta/Tarefa com o título da ideia — conveniência de UI, não persiste vínculo no banco
    (decisão consciente pra não adicionar campo/estado extra sem necessidade real).

## Bloco 2 — Bem-estar

"Autocuidado" e "Bem-estar" viraram uma coisa só: um check-in diário (decisão do usuário — não são
hábitos repetíveis, são um registro por dia).

- **`daily_checkins`**: `id`, `user_id`, `checkin_date` date, `mood` smallint (`check` 1–5),
  `sleep_quality` smallint (`check` 1–5), `energy` smallint (`check` 1–5), `note` opcional,
  `created_at`. `unique(user_id, checkin_date)` — idempotente por dia, mesmo padrão de
  `habit_logs`/Nota do Dia (reabrir no mesmo dia atualiza, nunca duplica). RLS por dono direta.
- **`pomodoro_sessions`**: `id`, `user_id`, `duration_minutes` smallint (15/30/60 — validado em TS,
  não é enum no banco), `status` (enum `completed`/`died`), `started_at`, `ended_at` nullable,
  `created_at`. Mecânica igual ao app Forest (confirmada pelo usuário): sair/cancelar antes do
  tempo acabar marca a sessão como `died` (a árvore "morre"), não conta nas estatísticas. UI:
  seletor de duração (15m/30m/1h) + animação de árvore crescendo durante a sessão. Estatísticas
  (sessões completas hoje/na semana) calculadas em TS a partir das linhas, sem tabela de
  agregação. RLS por dono direta.

## Bloco 3 — Vida Prática

- **`useful_contacts`**: `id`, `user_id`, `name`, `category` texto livre (ex.: "encanador",
  "médico" — sem enum fechado, mesmo espírito de `events.category`), `phone` opcional, `note`
  opcional, `created_at`, `updated_at`. Decisão explícita do usuário: **não** é uma agenda de
  contatos genérica (isso já é papel do celular) — só contatos úteis/profissionais. RLS por dono
  direta.
- **`vehicles`**: `id`, `user_id`, `nickname`, `plate`/`brand`/`model`/`year` opcionais,
  `created_at`, `updated_at`. Documentos do veículo (CRLV, apólice de seguro) usam
  `document_relations` já existente (`related_module = 'vida-pessoal'`) — nenhuma tabela nova pra
  isso. RLS por dono direta.
- **`vehicle_important_dates`**: `id`, `vehicle_id`, `label`, `date`. Mesmo formato de
  `document_important_dates`, preso ao veículo em vez de documento (próximo IPVA/seguro/revisão).
  RLS via join a `vehicles.user_id`.
- **`assets`** (Bens e Inventário): `id`, `user_id`, `name`, `category`, `estimated_value`
  numeric opcional, `location` opcional, `warranty_id` opcional (`references warranties(id) on
  delete set null` — mesmo padrão de `transactions.document_id`), `created_at`, `updated_at`. RLS
  por dono direta.
- **`important_purchases`** (Compras Importantes): `id`, `user_id`, `title`, `estimated_price`
  numeric opcional, `priority` (enum `baixa`/`media`/`alta`, default `media`), `is_purchased`
  boolean default `false`, `created_at`, `updated_at`. Sem vínculo com Finanças na v1 (YAGNI
  consciente — dá pra adicionar depois se fizer falta). RLS por dono direta.
- **`shopping_list_items`** (Lista de Compras): `id`, `user_id`, `name`, `quantity` texto livre
  (ex.: "2kg", "3 unidades" — mais flexível que número puro), `is_purchased` boolean default
  `false`, `created_at`. RLS por dono direta.

## Hoje

Só o que é acionável/do dia, seguindo o princípio já usado no resto do projeto ("não vira feed",
mesmo tratamento que Biblioteca dá): lembrete "Fazer check-in de hoje" se ainda não foi feito, e
datas importantes de Veículos/Bens nos próximos 14 dias (mesma janela que Documentos já usa).
Planos/Projetos/Ideias/Contatos/Compras **não** aparecem no Hoje.

## Vex

Ferramentas novas cobrem só criar/listar Plano, Projeto e Ideia — com descrição explícita pra não
confundir intenção (`create_plano` descrito como "Plano de vida amplo, NÃO uma Meta específica —
use create_meta pra isso"; mesmo cuidado entre `create_projeto` e as ferramentas de Tarefa). Check-
in diário fica de fora do texto por enquanto (é uma reflexão com escalas 1–5, não encaixa bem em
comando de texto livre) — evolução futura natural se fizer sentido depois.

## Testando

Mesmo processo usado nos outros 8 módulos: migration aplicada e verificada via
`get_advisors`/`generate_typescript_types`, typecheck/build limpos, teste ponta a ponta contra o
Supabase real (dados temporários sob a conta real com limpeza ao final, ou navegador do usuário
quando envolver interação que não dá pra simular via SQL/script — ex.: a animação/mecânica do
Pomodoro).

## Fora de escopo nesta v1 (decisões conscientes)

- Sem histórico de manutenção/quilometragem de Veículos — só registro + datas importantes.
- Sem vínculo de Compras Importantes com metas de economia em Finanças.
- Sem "status de promoção" persistido pra Ideias — o botão "Transformar em..." é só conveniência
  de UI.
- Sem ferramenta de Vex pra check-in diário, Pomodoro, ou qualquer item do Bloco 3.
