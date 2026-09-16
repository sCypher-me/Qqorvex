# Design System — Componentes v1 (fase de design)

Data: 12/09/2026. Início da fase de design do app, agora que os quatro itens funcionais do
roteiro (Metadata Provider, OCR, Gamification Core, Editor de Blocos Rico) estão prontos.
Abordagem escolhida: **biblioteca de componentes primeiro**, decidida via brainstorming visual
(Visual Companion) antes de redesenhar qualquer página existente.

## Decisão de processo

`docs/design-system/tokens.md` (cores/tipografia extraídas do Xmind) é a base completa — não há
mockup ou especificação de layout adicional no Xmind pra puxar. O resto (estrutura de componente,
espaçamento, raio de borda, sombra) fica a critério de design a partir daqui, decidido
incrementalmente: uma rodada visual decide um componente, implementa-se em código, confirma-se
que funciona, só depois passa pro próximo componente — em vez de decidir toda a biblioteca antes
de escrever qualquer código.

## Card — v1

Decidido por brainstorming visual (3 direções iniciais — Flat/Minimal, Soft/Elevado, Borda de
destaque — depois um meio-termo mais refinado entre Soft e Borda de destaque):

- Fundo `surface-2`, borda fina `border` em todos os lados, borda esquerda de destaque de 2px
  (`accent`: `cyan` por padrão, `gold` alternativa, `none` pra desligar).
- Cantos arredondados (`--radius-card: 10px`) e sombra discreta (`--shadow-card`) — mais suave que
  a proposta inicial "Soft/Elevado" (sombra mais forte, cantos mais extremos) para não competir
  com o conteúdo.
- Padding `p-4` (16px) — meio-termo entre a proposta "Flat" (12px, compacta) e "Soft" (20px,
  espaçosa).
- `packages/ui/src/components/Card.tsx`.

## Botões de ação de card — variantes `chip`/`chip-accent`

O botão `secondary` existente (com borda) foi rejeitado explicitamente pelo usuário pra esse
contexto ("não gosto desse tipo de botão", mostrando um botão com contorno). Decisão: **variantes
novas, aditivas** — `chip` (fundo neutro bem sutil, sem borda) e `chip-accent` (fundo tintado
cyan, sem borda) — em vez de redefinir `secondary`/`ghost` globalmente. `secondary` é usado em
dezenas de lugares no app hoje, em contextos variados (não só dentro de card); mudar seu visual
globalmente agora, antes de revisar caso a caso, é risco desnecessário. A troca de `secondary`
por `chip` onde fizer sentido é trabalho da fase seguinte ("página por página"), não desta rodada.

- `packages/ui/src/components/Button.tsx` — `variant="chip"` e `variant="chip-accent"` novas;
  `primary`/`secondary`/`ghost`/`destructive` inalteradas.
- Tokens novos em `tokens.css`: `--color-chip-neutral` (branco 6% opacidade),
  `--color-chip-cyan` (cyan 10% opacidade).

## Input/Select/Textarea — v1

Primeira rodada (A: caixa fechada atual, B: preenchido sem borda, C: só linha embaixo) foi
rejeitada em bloco — "algo mais estilizado e bonito". Segunda rodada elevou o nível de
acabamento (label flutuante + glow, pílula com ícone, barra lateral com "assinatura da marca") —
escolhida a opção **F**: mesma barra de destaque lateral do `Card` (aqui cinza em repouso, Gold em
foco), label embutido dentro do bloco (não separado acima do campo), cantos 10px (`rounded-card`
reaproveitado — mesmo raio do Card, reforça que são a mesma linguagem visual).

- Troca de cor da barra e do label em foco via `focus-within` (CSS puro, sem estado em JS).
- `label` é **obrigatório** na API do componente — nenhum campo do app tinha `<label>` de verdade
  até agora (só `placeholder`, que não é lido por leitor de tela como rótulo permanente); ganho
  de acessibilidade de graça ao adotar o componente.
- Mesmo tratamento aplicado a `Input`, `Select` e `Textarea` juntos (não só Input) — do contrário
  um formulário com os dois lado a lado ficaria com um refinado e outro com a caixa antiga.
- `packages/ui/src/components/FormField.tsx` — `FieldShell` interno compartilha a casca visual;
  `Input`/`Select`/`Textarea` são wrappers finos por cima do elemento HTML nativo correspondente.

## Badge de status — v1

Três conceitos apresentados diretamente num nível refinado (aprendizado da rodada de Input: pular
a versão "básica" óbvia): ponto indicador, ícone semântico, sólido. Escolhido **A — ponto
indicador**: fundo tintado bem sutil (reaproveita `success-bg`/`error-bg`/`warning-bg`/`info-bg`
já existentes), sem borda, formato pílula, um pontinho colorido antes do texto (como indicador de
"online"). `tone` é obrigatório e `children` (o texto) também — a regra do design system "nunca
comunicar estado só por cor" (`docs/design-system/tokens.md`) é garantida pela própria API do
componente, não por convenção manual em cada uso.

- `packages/ui/src/components/Badge.tsx` — tons `success`/`error`/`warning`/`info` (os 4 já
  existentes no design system; sem tom "neutro" especulativo além dos 4 confirmados).

## Modal/Dialog — v1

Três posições testadas (centralizado, bottom sheet, painel lateral tipo o da Vex) — escolhido
**A — centralizado**: card flutuante no meio da tela, fundo escurecido (`bg-black/55`), mesma
casca visual do Card (`surface-2`, borda de destaque cyan, `rounded-card`, `shadow-card`).

- `Modal` (`packages/ui/src/components/Modal.tsx`) é a casca genérica — via `createPortal` pro
  `document.body` (evita problema de z-index dentro de containers com `overflow`), fecha ao
  clicar no backdrop ou apertar Escape, `children` livre pro conteúdo.
- `ConfirmDialog`, construído por cima do `Modal`, cobre o caso mais comum (confirmar
  exclusão) reaproveitando o `Button` já existente (`chip` pra Cancelar, `destructive`/`primary`
  pra confirmar) em vez de duplicar estilo de botão dentro do Modal.
- Nenhum uso real ainda — muitos botões "Excluir" do app hoje (ex.: `DocumentCard`,
  `GalleryGrid`) disparam a exclusão direto, sem confirmação; plugar `ConfirmDialog` neles é
  trabalho da fase "página por página", não desta rodada.

## Navegação — Sidebar v1

Três layouts testados (sidebar fixa com ícones, barra superior + gaveta, trilho estreito só
ícones) — escolhida a sidebar fixa, mas pedido explícito de refinamento: **sem ícones**, "mais
bonita e estilizada". Segunda rodada agrupou os 9+ módulos em seções (rótulo pequeno em caixa
alta, ex.: "Organização", "Conhecimento") e testou duas variações pro item ativo — escolhida
**D1**: fundo tintado cyan sutil (`bg-chip-cyan`, mesmo token do botão `chip-accent`) + a mesma
barrinha de destaque de 2px do Card/Input, criando uma "assinatura" visual única que atravessa
Card, Input e agora também a navegação.

- `Sidebar` (`packages/ui/src/components/Sidebar.tsx`) recebe `sections` (título + lista de
  `{label, to}`) — o componente não conhece a lista real de módulos do app, só desenha o que
  recebe. Usa `NavLink` do `react-router-dom` (novo peer dependency de `packages/ui`) pra detectar
  o item ativo automaticamente via `isActive` do render-prop, sem lógica de rota duplicada.
- Ainda não adotada em `apps/qqorvex` — hoje cada página só tem um link solto "Voltar para Hoje";
  substituir isso por um layout com `Sidebar` persistente é trabalho de "página por página"
  (mexe em toda a árvore de rotas do app de uma vez, então quando entrar não pode ser parcial).

## Bug real encontrado e corrigido: Tailwind não escaneava `packages/*`/`modules/*`

Ao implementar o `Card`, as classes novas (`rounded-card`, `bg-chip-cyan`) não apareciam no CSS
de produção depois do build. Investigando, descobri que isso **não é um problema introduzido
agora** — classes usadas só dentro de um módulo/pacote e nunca duplicadas numa página do app
(confirmado com `object-cover`/`line-clamp-2`, usadas só em
`modules/conhecimento/biblioteca/src/components/GalleryGrid.tsx`) já estavam ausentes do CSS de
produção antes desta sessão.

Causa: a detecção automática de conteúdo do Tailwind v4 escaneia a partir do diretório do Vite
(`apps/qqorvex`) e ignora `node_modules` — mas `packages/*`/`modules/*` só são alcançáveis dali
via symlink do pnpm dentro de `node_modules/@qqorvex/*`, então nunca eram escaneados de verdade.

Correção: `@source "../../../../packages/**/*.{ts,tsx}"` e
`@source "../../../../modules/**/*.{ts,tsx}"` em `apps/qqorvex/src/styles/global.css`. Confirmado
via build: o CSS de produção cresceu de 18.160 para 26.590 bytes, e `object-cover`,
`line-clamp-2`, `chip-cyan` e `rounded-card` passaram a aparecer. **Provavelmente afetava vários
componentes já existentes no app** (qualquer classe Tailwind só usada dentro de um módulo, nunca
duplicada em `apps/qqorvex/src`) — o alcance completo do impacto anterior não foi mapeado, mas o
bug em si está corrigido de forma geral (qualquer classe nova em `packages/*`/`modules/*` a
partir de agora entra no build corretamente).

## Testes

Typecheck limpo em `packages/design-system`, `packages/ui` e no monorepo inteiro (19 workspace
projects). Build de produção confirmando as classes novas presentes no CSS final. `Card` ainda
não foi adotado por nenhuma página existente — isso é trabalho da fase "página por página",
intencionalmente fora do escopo desta rodada (biblioteca de componentes vem primeiro).

## Fase "página por página" — início (Hoje + layout)

A `Sidebar` é estrutural (faz parte do layout de rota, não de uma página isolada) — entrou de uma
vez em `apps/qqorvex/src/app/ProtectedLayout.tsx`, dentro do mesmo `if (isVexPage)` que já
escondia a aba da Vex em `/vex` (layout cheio, sem sidebar nem aba, se mantém). `NAV_SECTIONS`
(5 seções, os 10 destinos reais do app exceto `/vex`) mora no layout, não na `Sidebar` em si —
o componente continua genérico.

`HojePage` foi a primeira página migrada: a fileira de botões `Link`+`Button` pra cada módulo saiu
(virou redundante com a Sidebar), o card de resumo do dia agora é um `Card` de verdade, e cada
item do resumo que tem `priority` (`HojeItem.priority`, já existia em `@qqorvex/module-hoje`, sem
uso até agora) ganha um `Badge` — mapeamento `informativo→info`, `atencao/importante→warning`,
`urgente→error` definido na própria página (é uma decisão de apresentação, não do domínio Hoje).
Ações que não são navegação pra outra página (Nota do Dia, Sair, Falar com a Vex) continuam na
página, agora com `variant="chip"`.

As outras ~14 páginas ainda têm seus próprios links "Voltar para Hoje"/navegação solta — inofensivo
ao lado da Sidebar nova, mas redundante; troca-se conforme cada página for migrada.

## Fase "página por página" — concluída (15/09/2026)

As ~14 páginas restantes migraram pra Card/Input/Badge/ConfirmDialog; navegação solta duplicada
("Voltar para Hoje" em páginas de topo) removida — breadcrumbs hierárquicos de verdade (Caderno →
Estudos, Página → Segundo Cérebro) ficaram. `Card` ganhou `forwardRef` (necessário pro `TaskCard`
com `@dnd-kit/core`). `ConfirmDialog` plugado nos ~20 componentes que excluíam direto sem
confirmar; decisão consciente de **não** confirmar exclusão de bloco no Editor de Blocos
(`BlockRow` — toolbar densa, mesmo padrão do Notion) nem ações de "Desvincular"/"Remover relação"
(removem só a referência, não o dado). Ver a entrada de 15/09/2026 em `docs/decisions/pending.md`
para a lista completa de arquivos e as decisões de exceção. Typecheck e build limpos.
**Confirmado visualmente no navegador (15/09/2026)**: Tarefas, Agenda, Finanças, Vida Pessoal e
Segurança testados ao vivo (usuário de teste `khyron.box@gmail.com`, apagado ao final) — Card,
Badge e ConfirmDialog renderizando corretamente em todos. Sem pendência.
