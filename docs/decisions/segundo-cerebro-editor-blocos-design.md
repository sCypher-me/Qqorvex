# Segundo Cérebro — Editor de Blocos Rico (v1)

Data: 12/09/2026. Classificação: **arquitetural** (a página de edição existente cobria só o tipo
"texto", sem `updateBlock` no repository — nem editar um bloco já existente era possível; slash
command e os outros tipos exigiam uma reescrita da UX, não uma extensão pontual).

## Escopo

O enum `block_type` tem 19 valores; esta v1 cobre 11 deles (agrupados como "10 tipos" na
aprovação, já que título 1/2/3 são tratados como uma família): **texto, título 1/2/3, lista,
checklist, citação, callout, código, divisor, toggle**. Ficam pra uma 2ª rodada (enum já suporta,
sem UI ainda — mesmo estado de antes, não é regressão): tabela, imagem, arquivo, link, equação,
embed, referência de página, referência de entidade.

## 2ª rodada (15/09/2026) — imagem, arquivo, link

Dos 8 tipos deixados de fora da v1, estes 3 reaproveitam infraestrutura já pronta (upload/Storage
de `@qqorvex/module-documentos`) — os outros 5 (tabela, equação, embed, referência de página,
referência de entidade) exigem algo novo cada um (grid de dados, renderer de matemática, iframe
com sandboxing, picker de entidades) e ficam pra uma 3ª rodada.

- **Conteúdo**: `imagem`/`arquivo` → `{documentId: string | null}`; `link` → `{url: string}` (sem
  `title` separado — a própria URL já serve de rótulo, YAGNI consciente).
- **Documento é sempre o dono do arquivo**: o bloco nunca guarda o arquivo, só a referência —
  mesmo princípio do `AttachDocumentPanel` ("relacionar não é duplicar"). Upload novo chama
  `uploadDocument()` de `@qqorvex/module-documentos` direto (o Documento criado também aparece
  normalmente em `/documentos`); "Trocar" só zera `documentId`, nunca apaga o Documento.
  `getDownloadUrl()` resolve a URL assinada pra exibir a prévia (imagem) ou o link "Abrir"
  (imagem/arquivo).
- **Nova dependência de workspace**: `module-segundo-cerebro` passou a depender de
  `module-documentos` (sem dependência circular — `module-documentos` não depende de volta).
- **`BlockEditor` ganhou prop `userId`** (só repassada pro `uploadDocument()` dentro de
  `BlockRow`/`MediaBlockBody`) e passa `useDocuments()` pra baixo, pra cada `BlockRow` achar seu
  Documento por `documentId` sem uma query própria por bloco.
- Nenhuma migration — os 3 valores já existiam no enum desde o início.

**Testes**: typecheck e build limpos no monorepo inteiro (18 projetos). **Confirmado em navegador
real (15/09/2026)** — ver a entrada de 15/09/2026 em `docs/decisions/pending.md` pro relato
completo, incluindo uma pegadinha de processo (sessão órfã se repetindo + preview compartilhado
não sincronizado com a aba do usuário) que levou a validar o upload chamando `uploadDocument()`
direto pelo console do navegador contra o Supabase real, numa sessão autenticada de verdade, em
vez de depender só do clique na UI.

## 3ª rodada (15/09/2026) — referência de página

Dos 5 tipos restantes depois da 2ª rodada, só "referência de página" não exige nada novo (sem
lib, sem infraestrutura) — reaproveita `usePages()` já existente, mesmo mecanismo do painel
"Links internos" que já existia na própria página de edição. Conteúdo `{pageId: string | null}`;
sem página escolhida mostra um `<select>` (excluindo a própria página atual); com página
escolhida, mostra um `<Link>` de verdade (navega pra página referenciada) + "Trocar" (só zera
`pageId`, nunca apaga a página referenciada). Nenhuma migration. Typecheck e build limpos.
**Confirmado em navegador real** — duas páginas de teste, bloco de referência criado e navegação
pelo link confirmada. Ver a entrada de 15/09/2026 em `docs/decisions/pending.md`.

## 4ª rodada (15/09/2026) — tabela

Grid simples de strings (`{columns: string[], rows: string[][]}`), sem tipos de coluna nem
fórmulas — isso já existe em Bases, com propósito diferente (Bases é sobre Páginas com
propriedades tipadas e fórmulas; Tabela aqui é só um grid solto dentro do conteúdo de uma
página, mais parecido com uma tabela de Markdown). Sem lib nova — `<table>` HTML puro.
Célula/cabeçalho editável por `<input>`, salva no blur (mesmo padrão de todos os outros tipos);
"+ Linha"/"+ Coluna" no fim da tabela, ✕ por linha/coluna pra remover (desabilitado quando resta
só 1, pra nunca zerar a tabela sem querer); `overflow-x-auto` pra tabelas largas não estourarem o
layout da página. Nenhuma migration. Typecheck e build limpos. **Confirmado em navegador real** —
edição de célula, adicionar/remover linha e coluna, tudo persistindo corretamente (confirmado por
SQL a cada ação). Ver a entrada de 15/09/2026 em `docs/decisions/pending.md`.

Com a 4ª rodada fechada, ficam pra uma 5ª rodada: equação (precisa de KaTeX ou similar), embed
(precisa de estratégia de sandboxing de iframe) e referência de entidade (precisa de um picker
cross-module) — os três exigem uma decisão de infraestrutura antes de implementar, diferente das
rodadas 2/3/4 que só reaproveitaram o que já existia no projeto.

## 5ª rodada (15/09/2026) — equação

Conteúdo `{latex: string}`, renderizado com KaTeX (`katex@^0.18.7`, nova dependência) direto no
navegador — sem servidor. Campo de fonte LaTeX de uma linha (mesmo padrão dos outros tipos
"de texto simples") + prévia renderizada ao vivo logo abaixo, atualizando a cada tecla (não só no
blur — `katex.render()` é barato, ao contrário de operações que batem no Supabase). LaTeX
inválido mostra uma mensagem amigável em vez de quebrar o bloco.

**Lição de arquitetura**: `katex` precisa ser `import()` **dinâmico**, nunca estático no topo do
arquivo — mesmo padrão já usado pelo Tesseract.js em `modules/gestao/documentos/src/ocr.ts`. A
primeira versão usou import estático e isso sozinho inflou o chunk principal do build de 598kB
pra 861kB (172kB → 251kB gzip), porque `BlockRow.tsx` é carregado sempre que a página do Segundo
Cérebro abre, mesmo que ninguém use um bloco de equação. Corrigido pra `import()` dentro do
`useEffect` que desenha a prévia — KaTeX vira seu próprio chunk (262kB/78kB gzip), baixado só sob
demanda. O CSS (`katex/dist/katex.min.css`) segue o mesmo caminho dinâmico, o que expôs uma
pegadinha de monorepo: pacotes typecheckados por `tsc` puro (fora do Vite) não sabem o que fazer
com um import de `.css` sem uma declaração de módulo ambiente — precisou de um `css.d.ts` local
(`declare module "*.css";`) tanto em `module-segundo-cerebro` quanto em `packages/vex` (que
reexporta ferramentas do Segundo Cérebro pra Vex e, por importar código-fonte via symlink do pnpm
em vez de tipos compilados, re-typecheca `BlockRow.tsx` sob seu próprio `tsconfig.json`, que não
enxerga o `css.d.ts` do outro pacote). `apps/qqorvex` não precisou de nada, já que seu
`tsconfig.json` tem `"types": ["vite/client"]`, que já declara `*.css` globalmente.

Nenhuma migration. Typecheck e build limpos no monorepo inteiro (18 projetos) depois da correção.
**Confirmado em navegador real**: `E = mc^2` renderizado corretamente formatado; LaTeX inválido
mostrando a mensagem de erro sem quebrar nada. Ver a entrada de 15/09/2026 em
`docs/decisions/pending.md`.

Ficam pra uma 6ª rodada: embed (sandboxing de iframe) e referência de entidade (picker
cross-module).

## 6ª rodada (15/09/2026) — referência de entidade

**v1 escopada só pra Tarefa**: Tarefas é o único módulo com um hook de "listar tudo" pronto
(`useAllTasks()`) — Eventos só tem `useEventsInRange()` (sempre por período), criar um hook novo
só pra isso ficaria fora do espírito "reaproveitar o que já existe" das rodadas anteriores.
Conteúdo `{entityType: "tarefa" | null, entityId: string | null}` — `entityType` é um union aberto
de propósito, não hard-coded, pra outros tipos de entidade entrarem sem mudar o formato depois.

**Sem link navegável**, diferente de referência de página: Tarefas não tem rota de detalhe por
item (só Kanban/Lista), então o bloco mostra um resumo inline read-only (📌 título + badge de
status, lido ao vivo da lista de tarefas já carregada) em vez de um `<Link>` clicável. Nova
dependência de workspace: `module-segundo-cerebro` → `@qqorvex/module-tarefas` (sem ciclo).
Nenhuma migration. Typecheck e build limpos. **Confirmado em navegador real** — tarefa de teste
referenciada, resumo com título e status corretos. Ver a entrada de 15/09/2026 em
`docs/decisions/pending.md`.

Fica só **embed** pra uma 7ª rodada (sandboxing de iframe — decisão de segurança, não só técnica)
e mais tipos de entidade quando fizer sentido (Evento é o próximo candidato natural, mas precisa
de um hook "listar tudo" novo em `module-agenda` antes de caber no mesmo padrão de reaproveitamento).

## 7ª rodada (15/09/2026) — embed, roteiro dos 19 tipos completo

A rodada mais sensível das 7, por envolver conteúdo externo embutido via iframe. **Nunca renderiza
um iframe de URL arbitrária** — `resolveEmbedUrl()` (novo, `service.ts`) só converte URLs de 5
provedores conhecidos (YouTube, Vimeo, Spotify, Figma, CodePen) pra sua URL de embed oficial;
qualquer outra URL vira "Esse link não é suportado" em vez de uma tentativa de embutir. Sem essa
lista fechada, um bloco de embed seria uma porta pra clickjacking/phishing disfarçado. Iframe com
`sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"` — **sem**
`allow-top-navigation` de propósito, pra nunca deixar o embed navegar a aba inteira. Conteúdo
`{url: string}` — guarda a URL crua, nunca a transformada (a lógica de conversão evolui sem
precisar migrar dado salvo).

**Bug real encontrado e corrigido no teste ao vivo**: `referrerPolicy="no-referrer"` (escolha
inicial, pensando em privacidade) quebrava o embed do YouTube de verdade — Erro 153, porque o
YouTube exige ver a origem de quem pede o embed pra liberar, mesmo pra vídeos sem restrição
nenhuma. Corrigido pra `referrerPolicy="strict-origin-when-cross-origin"` (manda só a origem, não
a URL completa da nota — ainda mais privado que o padrão do navegador). Nenhuma migration.
Typecheck e build limpos. **Confirmado em navegador real**: YouTube renderizou de verdade depois
da correção; URL não suportada mostrou a mensagem certa sem tentar embutir. Ver a entrada de
15/09/2026 em `docs/decisions/pending.md`.

**Com isso, o roteiro original dos 19 tipos de bloco do Editor de Blocos Rico está completo.**
Fica só mais tipos de entidade pra Referência de Entidade quando fizer sentido (Evento é o próximo
candidato, precisa de um hook "listar tudo" novo em `module-agenda` primeiro).

## 8ª rodada (15/09/2026) — Referência de Entidade: + Evento

O hook que faltava foi criado: `listAllEvents()`/`useAllEvents()` em `modules/organizacao/agenda`,
mesmo padrão de `listAllTasks()`/`useAllTasks()`. `EntityReferenceType` virou
`"tarefa" | "evento"`. O `<select>` do picker passou a agrupar as opções em `<optgroup>`
"Tarefas"/"Eventos", com valor combinado `"tipo:id"` (ex. `"evento:ab74..."`) — resolvido de volta
em `{entityType, entityId}` no `onChange`, pra continuar sendo um único elemento de formulário em
vez de dois estados separados. Resumo inline de evento: 📅 + título + data curta `dd/mm` (extraída
de `start_at`) — mesmo padrão do resumo de tarefa (📌 + título + badge de status), sem link
navegável pela mesma razão (Agenda não tem rota de detalhe por evento, só Dia/Semana/Mês/Lista).
Nova dependência de workspace: `module-segundo-cerebro` → `@qqorvex/module-agenda` (sem ciclo).
Nenhuma migration. Typecheck e build limpos no monorepo inteiro (18 projetos). **Confirmado em
navegador real**: bloco de referência apontado pro evento de teste (resumo correto, `content`
verificado por SQL) e depois trocado pra apontar pra uma tarefa de teste (resumo correto) — os dois
caminhos do picker combinado funcionando. Ver a entrada de 15/09/2026 em `docs/decisions/pending.md`.

**Com isso, os dois tipos de entidade planejados pro v1 (Tarefa, Evento) estão prontos.** Mais
tipos (ex. referenciar uma Meta ou um Hábito) ficam pra quando fizer sentido — cada um precisa do
seu próprio hook "listar tudo" antes de caber no mesmo padrão.

## Arquitetura: lista de blocos, não editor de texto único

O schema já guarda cada bloco como uma linha separada (`page_id`, `block_type`, `content` jsonb,
`order_index`) — o editor é uma lista de componentes React, um por bloco, cada um dono do seu
próprio campo de edição. Rejeitado: um editor de texto rico único (Tiptap/ProseMirror) que
precisaria fatiar o documento em blocos ao salvar — exigiria uma lib nova e uma camada de
tradução desproporcional ao ganho, quando o schema já é block-first.

`blocks` não tem `parent_block_id` — é uma lista plana por página, sem aninhamento. Por isso
"toggle" não aninha blocos de verdade dentro dele; seu conteúdo é só `{summary, details}` (duas
strings, resumo + detalhe), colapsável na UI mas sem estrutura de blocos-filho. Adicionar
aninhamento de verdade exigiria uma coluna nova e um editor recursivo — fora de escopo.

## Forma do conteúdo por tipo

```
texto, titulo1, titulo2, titulo3, lista, citacao, callout → { text: string }
checklist                                                  → { text: string; checked: boolean }
codigo                                                      → { text: string; language?: string }
toggle                                                      → { summary: string; details: string }
divisor                                                     → {} (sem conteúdo)
```

`defaultContentForBlockType()` centraliza essa tabela — trocar de tipo (via "/" ou dropdown)
sempre reseta pro padrão do novo tipo, nunca tenta reaproveitar uma forma incompatível (ex.:
`{text}` de um bloco "texto" não vira `{summary, details}` de um "toggle" por conversão parcial).

## UX

- **Slash command**: digitar "/" no início de um bloco vazio de tipo "texto" (ou qualquer um dos
  7 tipos de forma `{text}`) abre um menu inline (não overlay flutuante, mesmo estilo do resto do
  app) filtrando os 11 tipos pelo texto depois da barra. Selecionar troca o tipo do bloco atual.
- **Dropdown sempre disponível**: cada bloco também tem um seletor de tipo ao lado (mesmo padrão
  já usado em Documentos/Biblioteca) — trocar de tipo não depende só do slash.
- **Enter**: cria um bloco "texto" novo logo depois do atual (não no fim da lista — `order_index`
  é inteiro sem espaço fracionário, então `createBlockAfter()` empurra os `order_index`
  seguintes em 1 antes de inserir). Dentro de "código" e no campo de detalhes do "toggle", Enter
  é só quebra de linha (textarea nativa) — não cria bloco novo.
- **Backspace**: no início de um bloco vazio (campo de texto principal do tipo), apaga o bloco e
  volta o foco pro anterior. Só no campo principal — o textarea de "código" e o "details" do
  toggle não têm esse atalho (usar o botão de excluir).
- **Reordenar**: botões ▲/▼ por bloco, trocam `order_index` com o vizinho imediato
  (`moveBlock()`). Sem drag-and-drop na v1 — `@dnd-kit/core` já existe no projeto (Kanban de
  Tarefas) mas arrastar blocos de tipos diferentes com feedback visual é bem mais trabalho do que
  o ganho justifica agora.
- **Salvar**: no blur do campo e ao pressionar Enter (antes de criar o próximo bloco) — nunca a
  cada tecla, pra não martelar o Supabase. Checkbox do checklist salva imediato (ação discreta,
  não digitação contínua).

## Componentes

- `modules/conhecimento/segundo-cerebro/src/components/BlockEditor.tsx` — container: busca os
  blocos, orquestra foco (um `useRef` de refs por `blockId` + um estado `pendingFocusId` setado
  após criar/apagar um bloco, focado num `useEffect` quando a lista atualiza).
- `components/BlockRow.tsx` — um bloco, uma instância; `key={block.id}` no `.map()` do container
  preserva o estado local de digitação entre reordenações (só remonta se o bloco for
  criado/apagado de verdade). Local `content` inicializado uma vez do `block.content`; ao trocar
  de tipo (slash ou dropdown), o próprio componente reseta esse estado local pra
  `defaultContentForBlockType()` do novo tipo — sem isso a UI mostraria a forma antiga até o
  próximo refetch.
- `components/SlashMenu.tsx` — lista filtrável dos 11 tipos, renderizada inline.

## Repository (novo)

`updateBlockContent`, `updateBlockType` (troca tipo + conteúdo numa chamada),
`createBlockAfter` (insere logo depois de um bloco, empurrando os `order_index` seguintes),
`moveBlock` (troca `order_index` com o vizinho, sem efeito nas pontas). Nenhuma migration —
schema de `blocks` já suportava tudo isso, só faltava o código.

## Testes

Typecheck e build limpos em todo o monorepo (19 workspace projects). Testado contra o Supabase
real: sequência completa simulando `createBlockAfter` no meio da lista (A, B, C → A, novo, B, C
com `order_index` corretos), troca de tipo + conteúdo (texto → checklist), e `moveBlock` trocando
a posição de dois blocos — tudo conferido via select antes/depois, dado de teste removido ao
final. **Não testado via UI real** (ambiente sem browser) — falta o usuário confirmar
manualmente: digitar "/", trocar tipos pelo dropdown, Enter criando bloco no meio da lista,
Backspace apagando um bloco vazio, e os botões ▲/▼.
