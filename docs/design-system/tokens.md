# Design System — Tokens (resumo)

**Versão atual: v1.0 "Balanced Vex" (aplicada em 16/09/2026)** — ver
`docs/decisions/redesign-visual-brainstorm.md` para o histórico completo do brainstorming que
levou até aqui (por que a v1 baseada só em `tokens.md`/Xmind foi rejeitada, as 4 tentativas
anteriores, o briefing final). Esta seção descreve o estado **atual e correto**; a versão anterior
deste arquivo (paleta `#0F1114`/cyan `#00E6FB` puro) está obsoleta — os nomes antigos
(`surface-1`, `text-secondary-warm`, `brand-cyan`...) continuam existindo em `tokens.css` como
alias pros valores novos, então módulos antigos não quebraram, mas não é a fonte de verdade pra
trabalho novo.

Fonte: `designq.zip` (Design System v1.0 trazido de uma sessão de design separada, ver histórico)
+ a arte oficial da Vex/símbolo de marca em `Vex/`/`Logotipos/` na raiz do repo.
Implementação: `packages/design-system/src/tokens/{colors.ts,tokens.css}`.

## Cores

Dark mode exclusivo (sem modo claro) — grafite/obsidiana dominante, ouro = físico/premium/marco,
cyan = ativo/Vex. Verde/vermelho/âmbar são reservados a estados semânticos, nunca ouro ou cyan.

- Fundação: `vex-black #090b0e` (bg), `vex-obsidian #101318` (surface-1), `vex-graphite #171b21`
  (surface-2), `vex-raised #1e232b` (surface-3), `vex-border #2a3039`.
- Texto: Primary `#f1f3f5`, Secondary `#a5abb4`, Muted `#707780`.
- Marca: Gold `#b88a54` (bright `#d2a66f`, muted `#73583b`), Cyan `#43b9d2` (bright `#72d8eb`,
  dark `#246c7b`) — mais contidos/dessaturados que a paleta original do Xmind, de propósito
  (feedback: a versão anterior "parecia genérica"/"limpa demais" quando os brainstorms tentaram
  reproduzir isso à mão; a paleta v1.0 veio pronta da sessão de design externa).
- Semânticas: Success `#32c48d`, Error `#f05d6c` (Critical `#d94155`), Warning `#e7a84b`, Info
  `#72d8eb`. Cada uma com variante `-bg`/`-border` em opacidade baixa.
- Categorias (paleta fechada, 10 cores, não estender ad hoc): amber/blue/green/magenta/coral/
  lavender/teal/cyan/bronze/bluegray — ver `tokens.css` pros hex exatos.
- Raios: controle `12px`, card `16px`, Vex/modais `20px`.
- Sombras/glow: `--shadow-card`, `--shadow-popover`, `--shadow-glow-cyan`, `--shadow-glow-gold`.

## Tipografia
- **Space Grotesk** — display/títulos (pesos 500/600/700).
- **Manrope** — interface e leitura, fonte principal (pesos 400/500/600/700).
- **JetBrains Mono** — dados técnicos pontuais (peso 500), não substitui a fonte principal.
- Auto-hospedadas em `packages/design-system/src/fonts/faces.css` (sem CDN em runtime) — feito,
  a nota de "pendente" de versões anteriores deste arquivo estava desatualizada.

## Sistema de classes de componente (`qv-*`)

Além dos tokens `--color-*`/`--font-*` consumidos via Tailwind `@theme`, `tokens.css` define uma
camada de classes CSS compartilhadas (`@layer components`) usadas direto nos componentes de
`packages/ui` e nos módulos — mais expressivas que só utilitário Tailwind pra essa estética
(gradientes sutis, bordas com opacidade, glow):

- **Superfícies**: `.qv-card` (padrão), `.qv-card-vex` (glow cyan, usado em contexto da Vex),
  `.qv-card-milestone` (glow dourado, canto cortado via `clip-path` — "marco"), `.qv-column`,
  `.qv-tile`, `.qv-well`, `.qv-popover`, `.qv-dialog`, `.qv-backdrop`, `.qv-dropzone`.
- **Campos**: `.qv-field` (input/select/textarea — fundo escuro, glow cyan no foco).
- **Botões**: `.qv-btn` + variantes `-primary/-secondary/-quiet/-ghost/-vex/-premium/-danger/-dashed`,
  tamanhos `-sm/-xs`, e `.qv-icon-btn`.
- **Chips/pílulas**: `.qv-chip` (aba/filtro, ativo = cyan tintado), `.qv-pill` + variantes de tom
  (`-info/-success/-warning/-danger/-premium/-outline/-module`).
- **Texto**: `.qv-eyebrow`, `.qv-section-label`, `.qv-num` (mono, tabular).
- **Outros**: `.qv-progress`, `.qv-check` (checkbox custom).

Primitivos React finos por cima dessas classes ficam em `packages/ui/src/components/Primitives.tsx`
(`Chip`, `ChipTabs`, `ProgressBar`, ...) — preferir esses/os componentes existentes (`Card`,
`Badge`, `Button`, `FormField`, `Modal`, `Sidebar`) a escrever `qv-*` cru numa página nova.

## Identidade visual — Vex e o símbolo de marca

A arte de personagem e o símbolo de marca vivem como arte-fonte na raiz do repo (`Vex/`,
`Logotipos/`) — ponto de partida obrigatório pra qualquer trabalho visual/UI.

- **Vex** (`Vex/`): assistente de IA do produto — "o cérebro de todo o projeto". Estilo anime/dark
  academia/techwear gótico: cabelo preto com mechas azul-petróleo, orelhas e cauda de gato,
  óculos, roupa preta com fivelas/correntes douradas, joias/tatuagens geométricas (diamante,
  círculos concêntricos, compasso). Arte de corpo inteiro em `8. official.png`; avatares circulares
  em `VEX_AVATAR_TRANSPARENT_CIRCLE_{64,128,256,512}.png`. Assets processados/otimizados pro app
  ficam em `apps/qqorvex/public/brand/` (`vex-avatar-512.png`, `vex-cutout.png`, `symbol.png`,
  `wordmark.png`). Ela agora tem presença visual de verdade: recorte de corpo inteiro na tela de
  login (`AuthLayout.tsx`), card ambiente sugerindo ajuda em `/` (Hoje), e painel de chat lateral
  com indicador de "contexto atual" (mostra em qual módulo o usuário está).
- **Símbolo de marca**: glifo de diamante/bússola de 4 pontas com ponto central — geometricamente
  derivado das tatuagens/joias da própria Vex. Usado no topo da Sidebar (`brandSymbolSrc`).
- **Wordmark**: "Qqorvex." com tratamento próprio — asset processado, nunca recriar com a
  tipografia da interface.

## Onde mexer
- Cores/fontes/classes `qv-*`: `packages/design-system/src/tokens/{colors.ts,tokens.css}`.
- Tailwind consome `tokens.css` via `@theme` — qualquer token novo entra lá, nunca cor literal
  solta em um módulo.
- Componentes React: `packages/ui/src/components/` (`Card`, `Badge`, `Button`, `FormField`,
  `Modal`, `Sidebar`, `Primitives.tsx`).
- Shell do app (header, busca/paleta de comando, navegação, painel da Vex):
  `apps/qqorvex/src/app/shell/` e `apps/qqorvex/src/app/ProtectedLayout.tsx`.
