# Estudos — Quiz/Testes gerados pela Vex (design)

Escopo definido com o usuário em 11/09/2026 via brainstorming, logo após a conclusão das 7 fases
do Vex Context Engine. Era o outro item do backlog ("Quiz/Testes gerados") deixado explicitamente
de lado quando o usuário escolheu tratar o Context Engine primeiro. `assessments` (já existente)
é só um registro manual de uma prova externa (nome/data/notas) — sem nota, sem perguntas, sem
geração de conteúdo. Quiz é uma entidade nova.

## Decisões

- **Fonte do conteúdo**: os Resumos já escritos no Caderno (não Flashcards, não Tópicos por nome
  só, não escolha na hora).
- **Formato**: múltipla escolha, 4 alternativas, 1 certa.
- **Quantidade**: fixa em 5 perguntas por quiz.
- **Onde responder**: tela dedicada dentro do Caderno em Estudos (não no chat da Vex) — fica salvo
  e revisável.
- **Retentativas**: sim, guarda histórico de tentativas (nota por tentativa, não sobrescreve).
- **Como gerar**: só pela Vex, via ferramenta no chat (`generate_quiz_by_notebook_name`) — nunca um
  botão direto na tela do Caderno, pra não quebrar a regra "a Vex nunca é chamada de dentro de um
  módulo" (o módulo só expõe API pública; quem chama o motor da Vex é sempre a camada de chat).

## Geração — duas chamadas ao provider, não uma

A ferramenta recebe só `notebookName` como argumento (simples, confiável pro modelo preencher).
Por dentro, faz uma **segunda chamada ao `provider.chat()`, sem tools**, com um prompt dedicado
pedindo exatamente 5 perguntas em JSON num formato fixo, baseado no texto dos Resumos do Caderno.
Escolhida em vez de pedir pro modelo preencher um schema aninhado (array de perguntas com
alternativas) como argumento de tool-call — isso é onde modelos pequenos locais (`qwen2.5:7b`)
falham com mais frequência. Gerar o mesmo JSON como texto livre com instruções claras é mais
confiável. Reaproveita a mesma interface `VexProvider`, nenhum motor novo.

Se não houver nenhum Resumo no Caderno, a ferramenta recusa e explica — nunca gera perguntas do
zero sem uma fonte real. Se o JSON vier malformado/incompleto, recusa com uma mensagem amigável e
não persiste nada.

## Schema

```sql
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  options jsonb not null,           -- array de 4 strings
  correct_option_index int not null check (correct_option_index between 0 and 3),
  order_index int not null
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,           -- array de índices escolhidos, mesma ordem das perguntas
  score int not null,
  completed_at timestamptz not null default now()
);
```

RLS: `quizzes`/`quiz_questions` via join ao Caderno dono (mesmo padrão de `summaries`/
`flashcards`). `quiz_attempts` tem `user_id` direto — é um registro pessoal de tentativa, RLS mais
simples sem precisar de dois joins encadeados.

## Ferramenta da Vex

`generate_quiz_by_notebook_name` em `packages/vex/src/tools/estudosTools.ts`,
`requiresConfirmation: true`:
1. Acha o Caderno pelo nome (`listNotebooks`, mesmo padrão de `create_summary_by_notebook_name`).
2. Busca os Resumos desse Caderno (`listSummaries`); sem nenhum, recusa.
3. Monta o prompt dedicado e chama `provider.chat({messages: [...], tools: []})`.
4. Valida o JSON (exatamente 5 perguntas, 4 alternativas cada, índice correto 0–3); se inválido,
   recusa sem persistir.
5. Cria a `quiz` + as 5 `quiz_questions` via novas `createQuiz`/`createQuizQuestion` em
   `@qqorvex/module-estudos/repository.ts`.

## UI

Nova seção "Quizzes" em `EstudosCadernoPage`, mesmo padrão das outras seções (lista simples, sem
abas, sem formulário de criação — só a Vex cria). Cada quiz mostra nº de tentativas e melhor nota;
botão "Responder" troca a lista por `QuizTakingForm` (novo componente em
`@qqorvex/module-estudos`): rádio-buttons por alternativa em cada pergunta, botão "Corrigir"
calcula o placar no cliente (`computeQuizScore()`, pura, comparando respostas com
`correct_option_index`) e persiste a tentativa (`createQuizAttempt`). Depois de corrigir, mostra
quais perguntas erraram e qual era a certa — mesmo espírito de feedback imediato de
`FlashcardReviewCard`.

## Teste

**Implementado e testado em 11/09/2026.** Migration + RLS verificadas ao vivo contra o Supabase
real: quiz + 2 perguntas + 1 tentativa inseridos, `correct_option_index` fora de 0–3 rejeitado
pela constraint, apagar o Caderno removeu quiz/perguntas/tentativas em cascata (dados de teste
removidos ao final). `computeQuizScore()` e `parseGeneratedQuiz()` testados isoladamente via
`node --experimental-transform-types` contra o arquivo real (10 checks: pontuação com acerto
total/zero/parcial, JSON bom em array puro e em `{questions:[...]}`, contagem de perguntas errada
rejeitada, JSON malformado rejeitado, alternativa faltando rejeitada, índice de resposta fora de
0–3 rejeitado, alternativa não-string rejeitada). Typecheck e build limpos. Geração real via Ollama
(fim a fim, um quiz de verdade) fica pro usuário testar no navegador — não dá pra automatizar
chamada real ao Ollama nesta sessão pelas mesmas limitações já documentadas sobre testar
`runVexTurn` fora do Vite.
