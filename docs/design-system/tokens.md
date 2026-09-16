# Design System — Tokens (resumo)

Fonte: Xmind `Qqorvex` > Paleta Oficial, Cores Semânticas, Tipografia Oficial.
Implementação: `packages/design-system/src/tokens/*`.

## Cores
- Fundação: Background `#0F1114`, Surface1 `#14181A`, Surface2 `#152124`, Border `#2D2D2D`.
- Texto: Primary `#F4EFE6` (evitar branco puro), Secondary Warm `#CFAFA2` (uso pontual, não padrão).
- Marca: Gold `#CF9C49` (precisão/prestígio, não preencher grandes áreas), Cyan `#00E6FB` (interação/Vex/tecnologia, não abusar em áreas grandes). Gold e Cyan não competem no mesmo componente.
- Apoio: Cyan Muted `#64ADB4`, Warm Muted `#635752` (moderação).
- Semânticas (separadas das cores de marca): Success `#4ADE80`, Error `#FF5D73`, Warning `#F4C95D` (nunca confundir com Brand Gold), Info `#5EBBFF` (nunca confundir com Brand Cyan). Cada uma tem variante soft de bg/border em 10%/30% de opacidade.
- Regra de acessibilidade: nunca comunicar estado só por cor — sempre combinar com ícone/texto/label.
- Pendente definir (derivar da paleta, não inventar): Text Secondary Neutral, Text Muted, Disabled, Overlay, Focus Ring.

## Tipografia
- **Space Grotesk** — display/títulos (pesos 500/600/700).
- **Manrope** — interface e leitura, fonte principal (pesos 400/500/600/700).
- **JetBrains Mono** — dados técnicos pontuais (peso 500), não substitui a fonte principal.
- Fontes devem ser auto-hospedadas no projeto (sem depender de Google Fonts/CDN em runtime) —
  **pendente**: baixar os arquivos de fonte e colocá-los em `packages/design-system/src/fonts`.
- Wordmark da marca (`Logotipos/`) é asset próprio, não recriar com a tipografia da interface.

## Identidade visual — Vex e o símbolo de marca

**Descoberto/documentado em 15/09/2026** — este arquivo só condensava cores/tipografia; a arte de
personagem e o símbolo de marca abaixo vivem como arte-fonte na raiz do repo (`Vex/`,
`Logotipos/`), fora de `docs/`, e não tinham sido lidos antes. É o ponto de partida obrigatório
pra qualquer trabalho visual/UI daqui pra frente — a paleta/tipografia acima são compatíveis com
qualquer produto; isto aqui é o que torna o Qqorvex especificamente ele mesmo.

- **Vex** (`Vex/`, avatares circulares prontos em `VEX_AVATAR_TRANSPARENT_CIRCLE_{64,128,256,512}.png`):
  a assistente de IA do produto — "o cérebro de todo o projeto" (palavras do usuário) — tem arte de
  personagem oficial, estilo anime/dark academia/techwear gótico: cabelo preto com mechas
  azul-petróleo, orelhas e cauda de gato, óculos, roupa preta com fivelas/correntes douradas,
  joias e tatuagens com motivos geométricos (diamante, círculos concêntricos, compasso). Até
  15/09/2026 essa arte não era usada em nenhum lugar do código (`packages/vex` não referenciava
  nada de `Vex/`) — presença visual da Vex no app era zero apesar dela ser central ao produto.
- **Símbolo de marca** (`Logotipos/Symbol Official.png` dourado, `Symbol Secundaria.png` ciano): um
  glifo de diamante/bússola de 4 pontas com ponto central — geometricamente o mesmo motivo dos
  diamantes/círculos das tatuagens e joias da Vex, abstraído em símbolo. Não é um ícone genérico
  escolhido à parte; é a assinatura visual da personagem.
- **Wordmark** (`Logotipos/Wordmark Official.png`): "Qqorvex." em creme (`#F4EFE6`) com textura
  desgastada/grunge, ponto final com um quadrado dourado de destaque — asset próprio, nunca
  recriar com a tipografia da interface (regra já registrada acima).

## Onde mexer
- Cores/fontes: `packages/design-system/src/tokens/{colors.ts,typography.ts,tokens.css}`.
- Tailwind consome `tokens.css` via `@theme` — qualquer token novo deve entrar lá, nunca cor
  literal solta em um módulo.
