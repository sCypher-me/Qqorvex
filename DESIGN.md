# Qqorvex — Ouro & Tinta

Sistema visual do Qqorvex. Escuro por padrão (tinta quente), claro opcional (papel creme), com o
dourado reservado para ação e destaque. Fonte da verdade: `packages/design-system/src/tokens/tokens.css`
(tokens) e `packages/ui` (componentes).

## Princípios

1. **Calma, não vazio.** Superfícies foscas que se diferenciam por luminância e borda, não por sombra.
2. **Ouro é ação.** O dourado marca o botão principal, a seleção e o que pede atenção. Nunca preenche
   áreas grandes.
3. **A Vex tem cor própria.** Turquesa (`ai`) identifica tudo que é da assistente; não se mistura com o ouro.
4. **Estado nunca só por cor.** Status sempre com texto e/ou ícone; gráficos têm legenda e tooltip.
5. **Mesma estrutura em todo lugar.** Cabeçalho de página → abas (quando há) → conteúdo principal →
   coluna lateral opcional. Listas em cartões com linhas separadas por fio fino.

## Tokens

Classes Tailwind geradas a partir de `--q-*` (ex.: `bg-surface`, `text-fg-2`, `border-line`, `bg-gold-soft`).

| Papel | Escuro (padrão) | Claro |
|---|---|---|
| Fundo (`canvas`) | `#100f0e` | `#f6f2ea` |
| Cartão (`surface`) | `#171513` | `#fffdf8` |
| Elevado (`raised`) | `#1e1c19` | `#ffffff` |
| Texto (`fg` → `fg-4`) | `#f3ebdd` · `#cfc6b8` · `#9a9184` · `#6b645a` | tons de tinta `#1c1813` |
| Borda (`line-soft` · `line` · `line-strong`) | creme a 6% · 10% · 18% | tinta a 12% |
| Ouro (`gold` · `gold-fg` · `on-gold`) | `#d4a056` · `#e3b26d` · `#1b1307` | `#d4a056` · `#8a5c1c` |
| Vex (`ai` · `ai-fg`) | `#5fc2c0` · `#7dd3d0` | `#2e9a98` |
| Sucesso · Alerta · Erro · Info | `#74c28f` · `#f2994a` · `#ec7b6f` · `#86a8e0` | `#2f8a55` · `#b8651b` · `#c0493d` · `#3a6db5` |

Cada cor semântica tem `-soft` (fundo) e, quando precisa, `-line` (borda). Estados de interação:
`bg-hover`, `bg-selected`.

**Categorias** (gráficos, etiquetas, agenda): `--q-cat-1` a `--q-cat-8`, sempre na mesma ordem — a cor
segue a entidade, nunca a posição. `categoryColor(key)` em `@qqorvex/design-system` resolve a cor de uma
categoria conhecida.

**Cores de destaque (skins):** `html[data-skin]` troca só a família do ouro (`aurora`, `sakura`,
`solstice`, `nebula`, `eclipse` liberadas por nível; `vip` com o Plus). O resto do sistema não muda.

**Tipografia:** Inter (interface, 14px base), Outfit (títulos e números grandes), Geist Mono (códigos e
valores técnicos). Números em tabelas e métricas usam `tabular-nums`.

**Raios:** 4 · 6 · 8 · 12 · 16 · 22 px. Cartões usam 12 (`rounded-xl`), campos e botões 8.

## Componentes (`@qqorvex/ui`)

- **Estrutura:** `PageContainer`, `PageHeader` (título, descrição, ações, abas como filhos), `Tabs`
  (navegação de seção, com `?aba=` na URL), `Segmented` (modo de visualização e filtros).
- **Ações:** `Button` (`primary`, `secondary`, `ghost`, `subtle`, `danger`, `ai`, `dashed`, `link`;
  tamanhos `xs`–`lg`; `loading`, `leadingIcon`), `IconButton` (rótulo obrigatório), `ButtonLink`,
  `DropdownMenu` (menu "⋯"), `Popover`, `Tooltip`.
- **Formulário:** `Input`, `Select`, `Textarea` (com `label`, `hint`, `error`, `fieldSize`), `Checkbox`,
  `Switch`; a classe `.q-input` com `data-size` estiliza campos nativos.
- **Feedback:** `Notice` (tom + título + ações), `EmptyState` (sempre explica o que aparece e como
  começar), `useToast`, `ConfirmDialog` (ações destrutivas), `Skeleton*`.
- **Sobreposição:** `Modal` (criar/editar), `Sheet` (detalhes laterais).
- **Dados:** `Badge`, `ProgressBar`, `ProgressRing`, `BarChart`, `LineChart`, `DonutChart`, `Sparkline`,
  `ChartLegend`, `Avatar`, `Markdown`.
- **Marca:** `BrandSymbol`, `Wordmark`, `VexAvatar`.

## Padrões de tela

- **Cabeçalho:** título + uma linha de resumo com números reais do usuário ("8 abertas · 4 para hoje").
  A ação principal da tela é o único botão dourado.
- **Listas:** cartão com `divide-y divide-line-soft`; ações secundárias em "⋯" ou aparecem no hover
  (sempre visíveis no toque).
- **Criação rápida:** campo inline quando o item é simples (tarefa, ideia, item de compra); modal
  quando há mais de dois campos.
- **Destrutivo:** sempre `ConfirmDialog` dizendo o que acontece com os dados relacionados.
- **Celular:** uma coluna, abas roláveis, barra inferior com as 4 áreas + Vex. Nada de rolagem
  horizontal da página.

## QA visual

`tools/visual-qa/capture.mjs` sobe o app com um Supabase simulado (`fixtures.mjs`) e tira capturas por
rota, tema e viewport:

```bash
node tools/visual-qa/capture.mjs --routes=/vida/financas --viewports=desktop,mobile --themes=dark,light
```

Opções úteis: `--full=true` (página inteira), `--steps='[{"click":"Texto"}]'` (interações),
`--onboarding=true` (fluxo de primeira vez), `--owner=true` (Central do Dono). As capturas ficam em
`tools/visual-qa/out/`.
