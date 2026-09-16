# Gamification Core (Level/XP/Badges/Títulos)

Data: 12/09/2026. Classificação: **arquitetural** (novo módulo/subsistema, sem fluxo existente
pra estender, sem Xmind detalhado — o Xmind só cita "Gamification Core (Level/XP/Badges/
Títulos) → fonte única; Perfil só referencia", sem especificar a mecânica). Desenho refeito do
zero via brainstorming com o usuário, mesmo espírito de Vida Pessoal.

## Escopo aprovado

- **Ações que geram XP**: só as ações centrais de produtividade — Tarefa concluída, check-in de
  Hábito/Meta, Quiz respondido em Estudos, item da Biblioteca concluído. Segundo Cérebro,
  Documentos, Finanças, Agenda e Vida Pessoal ficam de fora da v1 (menos pontos de integração).
- **Nível**: derivado do XP total via fórmula progressiva, nunca guardado (mesmo padrão de
  "Metas — progresso derivado", evita divergência).
- **Badges**: catálogo fixo curto no código, cada uma checada contra um contador simples.
- **Título**: uma faixa de nível = um título fixo, automático, sem escolha do usuário.
- **Onde aparece**: widget compacto no topo do Hoje + seção completa (progresso + badges) em
  `/seguranca`, junto do Perfil.

## Ajuste feito durante a implementação

Estudos não tem um campo de "conclusão" em Avaliações (`assessments` só tem nome/data, sem
status) — a ação de 20 XP usa **Quiz respondido** (`createQuizAttempt`, já existente) no lugar
de "Avaliação concluída".

## Mecânica

- **XP por ação**: Tarefa concluída = 10, check-in de Hábito/Meta = 5, Quiz respondido = 20,
  item da Biblioteca concluído = 15. Valores de partida, ajustáveis depois sem migration (só
  `XP_BY_ACTION` em `service.ts`).
- **Curva de nível**: `xpRequiredForLevel(level) = 50 × (level-1) × level`, nível 1 começa em 0
  XP. Nível 2 exige 100 XP acumulado, nível 3 exige 300, nível 4 exige 600, nível 5 exige 1000...
  sempre crescente, sem teto. `computeLevel(xp)` percorre a partir do nível 1 até o próximo
  patamar exceder o XP atual (poucas iterações, sem custo real pra um usuário só).
- **Título por faixa de nível**: 1–4 "Iniciante", 5–9 "Dedicado", 10–19 "Consistente", 20+
  "Mestre" (`getTitleForLevel`).
- **Badges** (catálogo fixo, `BADGE_CATALOG`): "Produtivo" (10 tarefas), "Consistente" (5
  check-ins), "Estudioso" (3 quizzes), "Leitor" (5 itens da Biblioteca). Cada uma é uma função
  pura `(stats) => boolean` contra os contadores de `gamification_stats` — crescer o catálogo
  depois não pede migration.

## Onde o XP é concedido (e por quê)

A regra do projeto é "módulos não acessam internals uns dos outros, só API pública" e a Vex
chama os repositories diretamente (não só a página do app) — se `awardXp()` só fosse chamado na
página, completar uma tarefa via chat da Vex nunca geraria XP. Por isso `awardXp()` mora dentro
da própria função de repository de cada módulo que decide "isso conta como completar":

- `modules/organizacao/tarefas/src/repository.ts` → `updateTaskStatus`: lê o status anterior
  antes de gravar, premia só na transição pra `"concluido"` (evita XP em dobro ao desfazer e
  refazer a mesma conclusão).
- `modules/organizacao/metas-habitos/src/repository.ts` → `logHabit` (mesma lógica de transição,
  só em `state === "concluido"`, nunca em `"parcial"`/`"pulado"`) e `createCheckin` (todo
  check-in de meta é um insert novo — sempre premia, sem checar estado anterior).
- `modules/conhecimento/estudos/src/repository.ts` → `createQuizAttempt`: cada tentativa premia,
  inclusive repetir o mesmo quiz — é engajamento real, não um valor a proteger contra abuso na v1.
- `modules/conhecimento/biblioteca/src/repository.ts` → `updateItemStatus`: mesma lógica de
  transição de Tarefas.

Isso cria quatro dependências uma-via-só (`Tarefas/Metas-Hábitos/Estudos/Biblioteca →
Gamificação`), sem ciclo — `@qqorvex/module-gamificacao` não depende de nenhum outro módulo de
domínio, é uma folha na árvore de dependências.

**Resiliência**: `awardXp()` nunca lança — qualquer erro (bug, RLS mal configurada, etc.) é
engolido e logado via `console.error`. A ação principal (concluir a tarefa, registrar o
check-in...) nunca deve falhar por causa de um bug na gamificação, que é um efeito colateral,
não o propósito da chamada.

## Schema

Duas tabelas novas, sem RPC/função `security definer` (upsert simples via supabase-js é
suficiente pra um app de usuário único, sem necessidade de incremento atômico):

```sql
gamification_stats (user_id pk, xp, tasks_completed, habit_or_goal_checkins,
                     quizzes_completed, library_items_completed, updated_at)
user_badges (id pk, user_id, badge_key, unlocked_at, unique(user_id, badge_key))
```

RLS: select/insert/update restritos a `auth.uid() = user_id` nas duas tabelas — mesmo padrão já
usado em todo o projeto.

## Fora do escopo da v1 (decisão consciente)

- **Sem toast/notificação em tempo real** ao desbloquear uma badge — só aparece quando o usuário
  abre a seção de badges em `/seguranca`. Um sistema de toast global não existe ainda no projeto.
- **Sem sincronização instantânea entre módulos**: o widget do Hoje atualiza no padrão normal do
  React Query (foco da aba, revisita da página), não no exato momento em que XP é concedido em
  outro módulo — evitar importar o `queryClient` dentro de `repository.ts` (camada que não deveria
  conhecer a UI) valeu mais que atualização instantânea.
- **Sem re-desbloqueio nem histórico de perda de badge** — uma vez desbloqueada, é permanente.
- **Sem XP em Segundo Cérebro, Documentos, Finanças, Agenda, Vida Pessoal** — só as quatro ações
  centrais aprovadas; catálogo de ações é uma constante fácil de estender depois.

## Testes

Typecheck limpo em `module-gamificacao` e nos quatro módulos que passaram a chamar `awardXp()`
(`module-tarefas`, `module-metas-habitos`, `module-estudos`, `module-biblioteca`), typecheck e
build limpos no app inteiro (19 workspace projects). Curva de nível e mapeamento de título
verificados via script Node isolado (xp=0→nível 1/Iniciante, xp=100→nível 2, xp=1000→nível
5/Dedicado, xp=5000→nível 10/Consistente, xp=20000→nível 20/Mestre — todos batendo com a fórmula
esperada). Testado contra o Supabase real: upsert de `gamification_stats` (incremento de xp e
contador), insert em `user_badges`, `unique(user_id, badge_key)` rejeitando duplicata como
esperado — dado de teste removido ao final, sem novos achados nos advisories de segurança.
**Não testado via UI real** (ambiente sem browser) — falta o usuário confirmar manualmente:
completar uma tarefa/hábito/quiz/item da Biblioteca e ver o widget do Hoje e a seção de badges em
`/seguranca` atualizarem.
