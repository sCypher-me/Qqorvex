---
version: "1.0.0"
name: "Qqorvex — Cartografia Pessoal"
description: "Sistema visual editorial utilitário para orientar, decidir e agir entre as áreas da vida, com o contexto da Vex sempre rastreável."
colors:
  night-deep: "#08151D"
  night-base: "#0E1C26"
  night-raised: "#152833"
  night-overlay: "#1A313D"
  night-selected: "#263C46"
  foreground-primary: "#F5EFE4"
  foreground-secondary: "#BCC8C9"
  foreground-muted: "#95A7AA"
  border-subtle: "#29414D"
  border-default: "#607C86"
  border-emphasis: "#8FA8AF"
  brand-primary: "#F28C74"
  brand-hover: "#FF9B85"
  brand-on-primary: "#08151D"
  focus-ring: "#8AD5F0"
  overlay-scrim: "#02090ED1"
  success: "#78C99A"
  success-surface: "#163429"
  warning: "#F0C468"
  warning-surface: "#332A14"
  error: "#FF8791"
  error-surface: "#3B1D24"
  info: "#7DB9D2"
  info-surface: "#163142"
  background-base: "{colors.night-base}"
  background-raised: "{colors.night-raised}"
  background-overlay: "{colors.night-overlay}"
  background-chrome: "{colors.night-deep}"
  surface-subtle: "{colors.night-raised}"
  surface-selected: "{colors.night-selected}"
  surface-disabled: "{colors.night-overlay}"
  foreground-inverse: "{colors.foreground-primary}"
  brand-on-dark: "{colors.brand-primary}"
  focus-ring-inverse: "{colors.focus-ring}"
  success-inverse: "{colors.success}"
  warning-inverse: "{colors.warning}"
  error-inverse: "{colors.error}"
  info-inverse: "{colors.info}"
typography:
  display-lg:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  display-md:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline-lg:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.018em"
  headline-md:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "27px"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.012em"
  title-lg:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title-md:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.006em"
  body-lg:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-md:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label-lg:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.005em"
  label-md:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.008em"
  label-sm:
    fontFamily: "Manrope, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.02em"
  data-md:
    fontFamily: "'JetBrains Mono', Consolas, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1, 'zero' 1"
spacing:
  zero: "0px"
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
rounded:
  none: "0px"
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  full: "999px"
borders:
  hairline: "1px"
  emphasis: "2px"
elevation:
  raised: "0 8px 24px #02090E33"
  overlay: "0 18px 56px #02090E8F"
  inset: "inset 0 0 0 1px #29414D"
motion:
  duration-fast: "120ms"
  duration-base: "180ms"
  duration-slow: "240ms"
  easing-standard: "cubic-bezier(0.2, 0, 0, 1)"
  easing-exit: "cubic-bezier(0.4, 0, 1, 1)"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.brand-on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.brand-on-primary}"
  button-secondary:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  icon-button:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.md}"
    size: "44px"
  input:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 14px"
  input-error:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    borderColor: "{colors.error}"
  textarea:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  select:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 40px 0 14px"
  checkbox:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.brand-on-primary}"
    selectedColor: "{colors.brand-primary}"
    rounded: "{rounded.xs}"
    size: "20px"
  radio:
    backgroundColor: "{colors.background-raised}"
    selectedColor: "{colors.brand-primary}"
    rounded: "{rounded.full}"
    size: "20px"
  switch:
    backgroundColor: "{colors.border-default}"
    selectedColor: "{colors.brand-primary}"
    rounded: "{rounded.full}"
    width: "44px"
    height: "24px"
  slider:
    backgroundColor: "{colors.border-default}"
    selectedColor: "{colors.brand-primary}"
    focusColor: "{colors.focus-ring}"
    rounded: "{rounded.full}"
    height: "4px"
  card:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.foreground-secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 10px"
  navigation-item:
    backgroundColor: "{colors.background-chrome}"
    textColor: "{colors.foreground-inverse}"
    selectedColor: "{colors.brand-on-dark}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 12px"
  tabs:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-secondary}"
    selectedColor: "{colors.brand-primary}"
    rounded: "{rounded.sm}"
    height: "44px"
  tooltip:
    backgroundColor: "{colors.night-deep}"
    textColor: "{colors.foreground-inverse}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  list-row:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    selectedColor: "{colors.surface-selected}"
    padding: "12px 0"
  table-row:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground-primary}"
    selectedColor: "{colors.surface-selected}"
    padding: "10px 12px"
  route-line:
    backgroundColor: "{colors.border-default}"
    selectedColor: "{colors.brand-primary}"
    width: "1px"
  timeline-node-origin:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.full}"
    size: "20px"
  timeline-node-decision:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.none}"
    size: "16px"
  timeline-node-action:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.brand-primary}"
    rounded: "{rounded.xs}"
    size: "20px"
  notice:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    rounded: "{rounded.md}"
    padding: "16px"
  modal:
    backgroundColor: "{colors.background-overlay}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
  sheet:
    backgroundColor: "{colors.background-overlay}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
  popover:
    backgroundColor: "{colors.background-overlay}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.lg}"
    padding: "12px"
  command-palette:
    backgroundColor: "{colors.background-overlay}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.xl}"
    padding: "16px"
  skeleton:
    backgroundColor: "{colors.border-subtle}"
    rounded: "{rounded.sm}"
  empty-state:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.foreground-secondary}"
    rounded: "{rounded.lg}"
    padding: "32px"
  operation-pending:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    rounded: "{rounded.md}"
    padding: "12px"
  operation-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.md}"
    padding: "12px"
  operation-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: "12px"
  operation-error:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: "12px"
  vex-context:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.foreground-inverse}"
    rounded: "{rounded.lg}"
    padding: "16px"
  vex-confirmation:
    backgroundColor: "{colors.night-overlay}"
    textColor: "{colors.foreground-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Qqorvex — Cartografia Pessoal

## Overview

Qqorvex é um sistema pessoal que transforma áreas dispersas da vida em um mapa operável. A pessoa localiza contexto, reconhece o que exige atenção, decide o próximo passo e acompanha seu efeito. A interface é um arquivo cartográfico noturno: superfícies escuras, planas e precisas, com vermilhão funcional e tipografia editorial.

A assinatura é o **traço de percurso**: uma linha fina que conecta nós com significado. Círculo indica informação ou origem; losango indica decisão; quadrado indica ação. O traço aparece em hierarquia, tempo, dependências e estágios de uma operação. Nunca funciona como moldura ornamental.

Os princípios são orientação antes de densidade, rastro antes de magia e continuidade entre áreas. Qqorvex e Vex permanecem como marca e personagem. A Vex é uma camada contextual, não uma mascote onipresente nem um chat genérico.

## Colors

- **Noite profunda:** `night-deep` sustenta sidebar, narrativa de autenticação e Vex; não é preto puro.
- **Noite base, elevada e overlay:** `night-base` sustenta o workspace; `night-raised` recebe cartões, campos e controles; `night-overlay` é reservado a modal, popover, sheet e prévia de ferramenta. Nenhuma superfície funcional usa branco ou creme.
- **Texto:** `foreground-primary`, `foreground-secondary` e `foreground-muted` criam hierarquia sem cinza fraco. Tons claros ficam restritos a texto, ícone, foco e pequenos indicadores.
- **Vermilhão:** `brand-primary` identifica a principal ação ou o trecho ativo do percurso. Ele não representa erro, exclusão ou indisponibilidade.
- **Musgo, âmbar, carmim e mineral:** sucesso, atenção, erro/destrutivo e informação, respectivamente. Todo estado combina texto, ícone ou forma; cor nunca é o único sinal.

Contrastes WCAG 2 calculados: primário/base 15.13:1; secundário/base 10.10:1; muted/base 6.91:1; marca/base 7.24:1; texto sobre marca 7.73:1; sucesso/superfície 6.82:1; atenção/superfície 8.64:1; erro/superfície 6.58:1; informação/superfície 6.28:1. `focus-ring` varia de 8.29:1 a 11.32:1 nos quatro degraus. `border-default` mede 3.05:1 contra overlay e é a borda de limite essencial; `border-subtle` é apenas separação decorativa.

Categorias usam uma paleta fechada na implementação e só entram após validação de contraste na superfície final. Não reutilizar cores semânticas para categorias.

## Typography

Títulos editoriais usam, nesta etapa, `Georgia` como fallback explícito. A candidata futura é uma serif variável expressiva e contida, como Fraunces, porém nenhuma fonte nova será adotada sem arquivo WOFF2, origem e licença registradas. Corpo e controles usam Manrope local; dados alinhados, códigos e timestamps usam JetBrains Mono local com números tabulares.

Display aparece uma vez por composição. Títulos de seção usam a sans quando funcionam como controle ou rótulo. Mono é funcional e nunca decora sobrancelhas ou slogans. Não esconder texto esperando fonte externa: o fallback desta etapa é a fonte efetiva do protótipo.

## Layout

A escala parte de 4px e usa múltiplos de 8px na composição dominante. Conteúdo textual tem largura máxima de 72ch; páginas operacionais usam contêiner máximo de 1440px e não expandem colunas indefinidamente em telas amplas.

Breakpoints são mudanças de composição:

- **320–767px:** uma coluna, navegação inferior, espaçamento lateral de 16px, ações principais com largura disponível e áreas de toque de 44px.
- **768–1023px:** rail/contexto compacto quando necessário, conteúdo principal único e overlays limitados à viewport. A autenticação continua em uma coluna com faixa editorial.
- **≥1024px:** sidebar e workspace coexistem. Autenticação exibe duas colunas reais: identidade/contexto em noite profunda e tarefa/formulário em noite base.
- **≥1440px:** densidade operacional alvo; Vex pode formar terceira região temporária e dimensionável.
- **≥1920px:** contêineres e linhas de leitura param de crescer; espaço excedente vira margem estrutural.

Grids usam `minmax(min(100%, largura-alvo), 1fr)` ou fallback equivalente. Filhos flex/grid com texto têm `min-width: 0`. Menus e popovers usam `min(largura-alvo, calc(100vw - 32px))`. Safe areas entram em headers, sheets, composer e navegação móvel.

## Elevation & Depth

Profundidade vem primeiro dos quatro degraus noturnos e de bordas finas. `raised` separa cartões da base; `overlay` pertence a modal, popover, paleta e prévias da Vex. Sombras são curtas e secundárias. Não usar glow, vidro, neon, orbes ou gradiente atmosférico.

Chrome persistente mantém altura constante. Status transitório reserva espaço e trunca em uma linha quando estiver no chrome. Skeleton preserva a geometria final.

Movimento usa 120ms para resposta imediata, 180ms para controles e 240ms para overlays. Entrada de página pode usar fade e leve ênfase; rotas pares não deslizam. O traço só anima ao comunicar progresso. Com `prefers-reduced-motion: reduce`, remover deslocamento e reduzir transições a mudança instantânea ou fade curto.

## Shapes

Campos e botões usam raio de 10px; cartões 14px; overlays 20px. Quando um elemento arredondado é aninhado, o raio interno é menor ou igual ao externo e busca concentricidade em relação ao padding. Pills ficam restritas a estados binários ou tags curtas.

Ícones próprios usam SVG, traço de 1.5–2px, `stroke-linecap="round"` e `stroke-linejoin="round"`. Ícones informativos recebem nome acessível; decorativos têm `aria-hidden="true"`. Nenhuma biblioteca nova entra sem decisão explícita.

No traço de percurso: círculo = informação/origem; losango = decisão; quadrado = ação. Nó preenchido = atual/concluído conforme rótulo; contorno = futuro. Estado nunca depende somente da forma ou da cor.

## Components

Todos os controles especificam default, hover, focus-visible, active, selected/current, disabled e, quando assíncronos, loading, success e error. Alvos interativos têm pelo menos 44×44px. Foco usa anel de 2px com offset de 2px e nunca fica coberto.

**Button e IconButton.** Uma ação primária por região. Pending bloqueia apenas sua reentrada, mantém largura e anuncia o estado. IconButton sempre tem nome acessível e caixa de 44px, inclusive mostrar senha.

**FormField.** Label visível, hint e erro recebem IDs estáveis; o controle compõe `aria-describedby` e `aria-invalid`. Erro recuperável preserva valor e foco. Read-only é distinto de disabled.

**Card e Section.** Card agrupa conteúdo que precisa de fronteira; Section organiza conteúdo sem criar caixas redundantes. Evitar um cartão para cada linha. ListRow e DataCell usam separadores e alinhamento.

**Notice e OperationStatus.** O contrato é `idle → pending → success | recoverable-error | terminal-error`. Sucesso nomeia o objeto afetado; erro recuperável explica como tentar de novo; vazio só aparece após consulta concluída com sucesso; dados parciais não se parecem com vazio.

**Modal, sheet, popover e command palette.** Contêm foco quando modais, fecham com Escape e devolvem foco ao acionador. Popover não modal segue navegação esperada. A paleta diz que busca páginas e comandos, não conteúdo geral.

**Shell.** Sidebar, header e nav móvel dão acesso equivalente às capacidades essenciais. A troca 1023→1024 muda composição sem perder ações. O item atual usa `aria-current` e sinal visual além de cor.

**Autenticação.** Em desktop ≥1024px, a coluna em noite profunda explica benefício verificável, contexto e Vex; a coluna em noite base concentra o formulário, com campos elevados. Em mobile, a identidade vira faixa editorial compacta escura acima do formulário. Não listar fornecedores nem prometer 2FA universal.

**Vex.** Estados: saudação, vazio, digitando, pensando, resposta, contexto anexado, proposta, aguardando confirmação, executando, concluído, falha recuperável e histórico. Painel e página compartilham linguagem e sessão. A proposta sempre revela contexto, ferramenta, efeito e confirmação; uma confirmação dispara uma chamada. Falha libera controles.

**Timeline/RouteLine.** O traço liga somente itens com relação real. Rótulos explicam estado, hora e ação. Itens concluíveis usam controles semânticos; um quadrado decorativo nunca simula checkbox.

## Do's and Don'ts

- Faça a hierarquia continuar legível no teste do desfoque e ofereça uma ação principal inequívoca.
- Faça o traço representar origem, tempo, dependência ou estágio e registre seu significado junto ao conteúdo.
- Faça mobile e desktop preservarem as mesmas capacidades com composições próprias.
- Faça conteúdo longo quebrar e grids refluírem sem overflow em 320px e zoom de 200%.
- Faça erros preservarem rascunhos e oferecerem recuperação próxima à ação.
- Não transforme toda seção em cartão, toda categoria em pill ou todo metadado em microtexto maiúsculo.
- Não use vermilhão de marca para erro/destrutivo, nem apenas cor para comunicar estado.
- Não use decoração cartográfica sem semântica, loops animados ou linhas atravessando conteúdo.
- Não use linguagem de magia, estrelas, constelações, vidro, brilho cyan ou gradiente roxo.
- Não introduza fontes, ícones, dependências ou assets externos sem origem e licença documentadas.
