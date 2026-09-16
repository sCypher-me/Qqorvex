# Vex — Context Engine e evolução do motor (design)

Escopo definido com o usuário em 11/09/2026 via brainstorming. Começou como "Context Engine"
(item do backlog nunca detalhado) e cresceu pra uma visão mais completa da Vex como "cérebro
principal do projeto". Construído em fases — cada uma com seu próprio ciclo de design/implementação/
teste, mesmo padrão usado em Vida Pessoal e nas integrações da Agenda nesta sessão.

## Visão geral (todas as fases)

1. **Conversas persistidas (Memory Engine)** + indicador de "digitando..." + personalidade mais
   conversacional — próxima a construir.
2. **Painel retrátil (aba fixa na borda direita) + página `/vex` em tela cheia**, compartilhando a
   mesma conversa ativa. Substitui o modal atual, que só abre pela Hoje.
3. **Context Engine**: a Vex sabe exatamente qual item está em foco na tela (não só a
   página/módulo) — começando por Tarefas e Documentos como piloto.
4. **Preenchimento incompleto**: quando faltar informação pra executar uma ação (ex.: usuário diz
   "100 reais" querendo lançar um gasto, mas falta categoria/tipo entrada-saída/recorrência), a
   Vex pergunta o que falta em vez de travar ou inventar valor.
5. **Cobertura completa de ferramentas**: hoje a Vex só lista/cria em cada módulo; expandir pra
   conhecer mais ações (editar, mover, mudar status, etc.) nos 8 módulos, pra "quando o usuário
   pedir pra adicionar algo, ela saiba exatamente o que criar e onde criar."
6. **Pesquisa + salvar depois, em qualquer módulo**: o usuário pesquisa algo em conversa livre com
   a Vex (conhecimento geral, não dado do app) e depois pede pra transformar isso em algo
   concreto — uma Tarefa, um Documento, um Resumo/Flashcard/Caderno em Estudos, um item da
   Biblioteca, etc. Não é exclusivo de Estudos. A Vex pergunta os campos que faltam (nome, onde
   encaixar) e mostra exatamente o que vai criar antes de criar.
7. **Barreira do Cofre**: as ferramentas de Documentos nunca tocam um documento marcado como Cofre
   (`is_vault`) sem uma autorização explícita do usuário naquele momento da conversa — reforça o
   que a futura Central de Segurança já prevê pro Cofre.

**Regra que já existe hoje e vale pra todas as fases**: nenhuma mudança persistente acontece sem
confirmação explícita (`confirmVexToolCall`) — a Vex sempre mostra o que vai fazer (onde, o quê,
com quais dados) antes de executar. Consultas (listar, responder pergunta) continuam livres, sem
confirmação.

## Fase 1 — Conversas persistidas + digitando... + personalidade (implementada em 11/09/2026)

- **Schema**: `vex_conversations` (id, user_id, title default "Nova conversa", created_at,
  updated_at) e `vex_messages` (id, conversation_id, role `user`/`assistant`, content, created_at)
  — migration `20260911000001_vex_conversas.sql`, RLS padrão (mensagem-filha via join à conversa
  dona). Só `user`/`assistant` são persistidos: `tool` é efêmero (nunca volta pro `history` que
  `runVexTurn` usa) e `system` (personalidade) é montado em runtime, nunca gravado.
- **Camada de dados**: `packages/vex/src/conversations/{types,repository,hooks}.ts` — mesmo padrão
  TanStack Query dos módulos de domínio (`useVexConversations`, `useCreateVexConversation`,
  `useRenameVexConversation`, `useDeleteVexConversation`, `useVexMessages`, `useAppendVexMessage`).
- **UI**: `VexChat.tsx` ganhou lista retrátil de conversas (botão ☰) com renomear inline e apagar;
  "Nova conversa" (botão +) começa vazia, só cria a linha no banco no primeiro envio; trocar de
  conversa recarrega o histórico persistido. Indicador "digitando..." (3 pontinhos) enquanto
  aguarda o provider ou a execução de uma ferramenta confirmada.
- **Personalidade**: `packages/vex/src/personality.ts` (`VEX_SYSTEM_PROMPT`) — antes não existia
  nenhuma mensagem `system`. Define a Vex como parceira de conversa real (não um menu de comandos),
  que nunca inventa dado faltante e nunca finaliza mudança persistente sem confirmação — texto que
  as fases seguintes vão expandir (todas as funções do app, barreira do Cofre).
- Testado ao vivo contra o Supabase real (insert/select/cascade). Typecheck e build limpos. Ainda
  sem teste de clique na UI (fica para o usuário).

## Fase 2 — Painel retrátil + página `/vex` em tela cheia (implementada em 11/09/2026)

- **Layout compartilhado**: `App.tsx` tinha `<RequireAuth>` repetido em cada rota individualmente
  (13 vezes) e nenhum lugar pra montar algo presente em toda página. Nova rota-layout
  `ProtectedLayout` (`RequireAuth` + `<Outlet/>` + `VexPanel`) — todas as rotas autenticadas agora
  são filhas dela; `VexPanel` fica escondido só na própria `/vex` (a página já é tela cheia).
- **Painel retrátil**: `VexPanel` — aba fixa vertical na borda direita ("Vex"), visível em toda
  página autenticada exceto `/vex`. Clicar desliza um painel (`translate-x` animado) com o chat
  dentro; o conteúdo (`VexConversationView`) continua `lazy()` pelo mesmo motivo de antes (8
  módulos de ferramentas, custo real).
- **Página `/vex`**: rota nova, mesmo `VexConversationView` em chrome de página inteira (com
  "Voltar para Hoje", mesmo padrão de link usado em todas as outras páginas de módulo). O botão
  "Falar com a Vex" na Hoje agora navega pra `/vex` em vez de abrir um modal.
- **Mesma conversa ativa nos dois pontos de entrada**: novo `VexSessionContext`
  (`activeConversationId`/`setActiveConversationId`), provido uma vez no `ProtectedLayout` —
  abrir o painel numa conversa e depois ir pra `/vex` continua na mesma conversa (o histórico já
  era compartilhado via banco desde a Fase 1; o que faltava era compartilhar *qual* conversa está
  aberta agora).
- **Reorganização**: o corpo do chat (mensagens, input, lista de conversas, "digitando...") saiu de
  um componente único (`VexChat`, removido) para `VexConversationView` (sem chrome), decorado por
  `VexPanel` (painel) e `VexPage` (tela cheia) — nenhuma lógica duplicada entre os dois.
- Typecheck e build limpos; `VexConversationView` confirmado no bundle como chunk separado
  (carrega só quando o painel abre ou `/vex` é visitada). Ainda sem teste de clique na UI.

## Fase 3 — Context Engine: item em foco na tela (implementada em 11/09/2026)

- **Correção de premissa**: nem `TaskCard` nem `DocumentCard` tinham "expandir" — são cards sempre
  totalmente visíveis. O gatilho real virou clicar no corpo do card (fora de botões/alça de
  arrastar), que marca o item como "em foco" com destaque visual (borda cyan).
- **`CurrentItemContext`** (`apps/qqorvex/src/vex/CurrentItemContext.tsx`): `{ type: "tarefa" |
  "documento"; id; label } | null`, provido no `ProtectedLayout` junto do `VexSessionProvider`.
  Limpo automaticamente a cada troca de rota (`useLocation`) — foco nunca sobrevive a navegar pra
  outro módulo, é sempre "o que está na tela agora".
- **Wiring nos módulos**: `TaskCard`/`KanbanBoard` e `DocumentCard` ganharam `isFocused`/`onFocus`
  como props simples (os módulos não conhecem a Vex/Context — só expõem o callback; quem liga ao
  `CurrentItemContext` são as páginas do app, `Tarefas.tsx`/`Documentos.tsx`).
- **Injeção no chat**: `VexConversationView` monta uma mensagem `system` extra a cada chamada
  (nunca persistida, mesmo princípio do `VEX_SYSTEM_PROMPT`) quando há item em foco: `"Contexto
  atual: a pessoa está vendo a Tarefa 'X' (id: ...) na tela agora."` — dá ao modelo o ID literal
  pra usar na ferramenta certa.
- **Prova de ponta a ponta**: nova `update_task_by_id` (Tarefas) — edita título/prazo/status por ID
  exato, ao contrário de `complete_task_by_title` (que só existia por aproximação de texto e
  continua existindo). Resolve o exemplo original: "muda o prazo disso pra amanhã" com uma tarefa
  em foco. Documentos ganhou só o rastreamento nesta fase — criar uma ferramenta de edição de
  documento é escopo da Fase 5 (cobertura completa de ferramentas), não desta.
- Nova `updateTask()` em `@qqorvex/module-tarefas` (atualização genérica por ID, diferente de
  `updateTaskStatus`/`updateTaskCancelled`, que mexem num campo só cada). Testado ao vivo contra o
  Supabase real (update de prazo+status+completed_at, depois limpo). Typecheck e build limpos; sem
  migration. Ainda sem teste de clique na UI.

## Fase 4 — Preenchimento incompleto (implementada em 11/09/2026)

- **Descoberta ao investigar o exemplo original do usuário** ("100 reais" faltando motivo/entrada-
  saída/recorrência): `create_transaction` já exigia `name`/`amount`/`transactionType` no
  JSON-schema (2 dos 3 campos do exemplo já eram obrigatórios) — o que realmente faltava era
  qualquer noção de recorrência: `recurring_transactions` existe no banco mas nenhuma ferramenta a
  toca.
- **Reforço geral (todos os módulos)**: `VEX_SYSTEM_PROMPT` ficou mais diretivo — antes de chamar
  qualquer ferramenta que cria/altera algo, conferir se todos os dados pedidos estão na conversa;
  se faltar algo, não chamar a ferramenta, perguntar primeiro (um item de cada vez se for mais de
  um). O mecanismo real de "preenchimento incompleto" é o `parameters.required` de cada
  ferramenta já existente — o texto do prompt é o que faz o modelo realmente respeitar isso.
- **Fecha o exemplo original**: `create_transaction` ganhou `isRecurring` (obrigatório). Criar uma
  recorrência de verdade (frequência, parcelas) é ferramenta nova — escopo da Fase 5, não desta.
  Se `isRecurring: true`, a ferramenta não cria nada: responde explicando que recorrência ainda
  não é criável pelo chat e sugere cadastrar em Finanças, oferecendo criar só o avulso de hoje.
  Como a ferramenta `requiresConfirmation`, esse aviso só aparece depois do usuário confirmar (a
  ferramenta não muda o fluxo de confirmação existente) — um clique a mais nesse caso, mas nunca
  finge que uma recorrência foi criada quando não foi.
- Typecheck e build limpos; sem migration (mudança de schema de ferramenta + texto de prompt).

## Fase 5 — Cobertura completa de ferramentas (implementada em 11/09/2026)

"Cobertura completa" de verdade (editar/mover/mudar status em TODAS as ações de TODOS os 8
módulos) seria um escopo enorme de uma vez só — cada módulo tem dezenas de funções de repository
nunca expostas à Vex. Escolhido um lote focado: **uma ação nova por módulo**, sempre reaproveitando
função de repository já existente (nenhuma capacidade nova no banco), no mesmo padrão de "achar
por título/nome" já usado em `complete_task_by_title`/`log_habit_by_name`. Tarefas já tinha ficado
bem coberta na Fase 3 (`update_task_by_id`), por isso ficou fora deste lote.

- **Agenda**: `delete_event_by_title` (usa `deleteEvent`, busca nos últimos 30 dias até os próximos
  90).
- **Metas & Hábitos**: `update_goal_status_by_title` (usa `updateGoalStatus`).
- **Estudos**: `delete_notebook_by_name` (usa `deleteNotebook`, cascata já existente apaga
  resumos/flashcards relacionados).
- **Segundo Cérebro**: `archive_page_by_title` (usa `archivePage`).
- **Biblioteca**: `update_library_item_status_by_title` (usa `updateItemStatus`).
- **Documentos**: `toggle_important_by_name` (usa `toggleImportant`).
- **Finanças**: `create_recurring_transaction` — fecha o gancho da Fase 4: quando o usuário confirma
  que uma movimentação é recorrente, `create_transaction` agora recusa e orienta o modelo a chamar
  esta ferramenta nova (que pede a frequência: mensal/bimestral/trimestral/semestral/anual) em vez
  de só informar que "ainda não dá pra fazer isso".

Todas exigem confirmação (mudança persistente). Testado ao vivo contra o Supabase real
(`is_archived` em página, `recurring_transactions` inserida/removida — as demais reaproveitam
funções de repository já testadas em sessões anteriores). Typecheck e build limpos; sem migration.

## Fase 6 — Pesquisa + salvar depois, em qualquer módulo (implementada em 11/09/2026)

Toda a capacidade de "guardar conteúdo" já existia nos repositories dos módulos-alvo do exemplo
original (Tarefa, Segundo Cérebro, Estudos, Documentos) — só faltava expor como ferramenta da Vex.

- **`create_task`** ganhou `description` opcional (campo já existia no módulo, nunca exposto à
  Vex) — a pesquisa vira o corpo da tarefa.
- **Segundo Cérebro**: nova `create_page_with_content` — cria a página e já cria um bloco de texto
  (`block_type: "texto"`, `content: {text}`) com o conteúdo, reaproveitando `createPage`+
  `createBlock` e o mesmo formato de bloco que a UI já usa.
- **Estudos**: nova `create_summary_by_notebook_name` — acha o Caderno pelo nome (`listNotebooks`)
  e cria o Resumo com `createSummary`; se não achar o Caderno, não inventa um novo — pergunta se o
  usuário quer criar um Caderno com esse nome primeiro.
- **Documentos**: nova `create_text_document` — transforma o texto pesquisado num `Blob` de verdade
  e reaproveita `uploadDocument` (mesma deduplicação por hash já existente, `documentType: "outro"`
  por padrão).
- **`VEX_SYSTEM_PROMPT`**: pesquisa livre (conhecimento geral, fora do app) é conversa normal; ao
  pedir para transformar isso em algo concreto, a Vex identifica o módulo certo, pergunta o que
  faltar (título/nome, Caderno/pasta de destino) e usa o conteúdo já discutido como corpo — regra
  generalizada para qualquer módulo, não só Estudos (correção pedida pelo usuário durante o
  brainstorming original). Biblioteca ficou de fora — é sobre rastrear itens de mídia, não guardar
  corpo de texto.
- Testado ao vivo contra o Supabase real (página+bloco de texto e Resumo em Caderno, inseridos e
  removidos). `create_text_document` depende de Storage real (upload de `Blob`) — a função
  `uploadDocument` que ela reaproveita já foi testada extensivamente em sessões anteriores; o que é
  novo aqui é só o wrapper (texto → Blob), não testado via clique real. Typecheck e build limpos;
  sem migration.

## Fase 7 — Barreira do Cofre (implementada em 11/09/2026)

- **Achado ao investigar**: `documents.is_vault` já existe como coluna no banco, mas **nenhuma UI
  ainda permite marcar um documento como Cofre** — então esta fase é uma barreira preventiva, não
  a correção de um risco já explorável hoje.
- `list_documents` passou a excluir documentos com `is_vault: true` da listagem — a Vex nunca
  menciona a existência deles por padrão.
- `toggle_important_by_name` confere `is_vault` do documento encontrado antes de agir; se for
  `true`, recusa em vez de executar (`listDocuments()` interno dessa ferramenta não tinha o filtro
  do `list_documents`, então precisava do próprio check).
- **Sem mecanismo de "autorizar no momento"**: construir uma liberação segura de verdade depende de
  reautenticação real (Central de Segurança, que ainda não existe) — fingir uma autorização sem
  essa infraestrutura seria menos seguro que simplesmente recusar. Até a Central de Segurança
  existir, Cofre é bloqueio total para a Vex, não "pede permissão e libera".
- Testado ao vivo contra o Supabase real (documento fake com `is_vault: true` inserido, removido ao
  final). Typecheck e build limpos; sem migration.

## Roteiro completo — concluído

As 7 fases definidas no brainstorming original (11/09/2026) estão implementadas: conversas
persistidas, painel retrátil + página em tela cheia, item em foco na tela, preenchimento
incompleto, cobertura completa de ferramentas (lote focado), pesquisa+salvar em qualquer módulo, e
barreira do Cofre. Trabalho futuro sobre a Vex (mais ferramentas por módulo, Central de Segurança
de verdade, etc.) deve ser tratado como uma nova rodada de brainstorming, não uma continuação
implícita deste documento.
