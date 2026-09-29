# Etapa 2 — revisão obrigatória para dark mode

Status: instrução do Revisor ao Executor. Esta revisão substitui a aprovação anterior da prova clara. Nenhum arquivo de produção pode ser alterado.

## Direção preservada

“Cartografia Pessoal” continua sendo uma direção editorial utilitária: mapa operacional, traço de percurso, nós com significado, títulos editoriais e Vex como camada contextual. Permanecem Qqorvex, Vex, as duas colunas de autenticação desktop e a paridade mobile/desktop.

A mudança obrigatória é estrutural: **todas as superfícies tornam-se dark**. O resultado não pode ser uma inversão automática da paleta clara nem uma retomada do sistema atual cyan/dourado. Ele deve parecer um arquivo cartográfico noturno, sóbrio e preciso.

## Linguagem cromática exigida

- Fundo global, workspace, cartões, campos, menus, modais, notices, tool preview e mensagens da Vex usam apenas degraus escuros.
- Marfim, branco e tons muito claros podem aparecer em texto, ícones, foco ou pequenos indicadores; não podem preencher cartões, formulários, painéis, tool previews ou áreas extensas.
- Definir no `DESIGN.md` pelo menos `night-deep`, `night-base`, `night-raised`, `night-overlay`, `border-subtle`, `border-default`, `foreground-primary`, `foreground-secondary` e `foreground-muted`.
- As grandes superfícies devem ter luminância relativa baixa. Como gate inicial: base/raised/overlay ≤0,12; qualquer exceção precisa ser pequena, semântica e justificada.
- Degraus adjacentes precisam continuar distinguíveis sem depender de sombra: borda ≥3:1 quando representa limite de componente; quando a borda é apenas decorativa, contraste tonal visível e inspeção em brilho baixo.
- Vermilhão continua sendo percurso/ação. Escolher versão clara o bastante para contraste em fundo dark. Não usar carmim de erro como marca.
- Sucesso, atenção, erro e informação recebem cor, texto/ícone e superfície tonal própria. Pending não se parece com erro.
- Foco usa mineral claro e precisa atingir ≥3:1 contra cada superfície adjacente, inclusive botão primário e campo focado.
- Evitar preto puro dominante, branco puro em grandes massas, glow, neon, gradiente roxo, glassmorphism e textura que prejudique leitura.

### Valores de partida obrigatórios

O Executor pode fazer pequenos ajustes comprovados por métricas, mas deve partir desta família para evitar uma nova exploração sem direção:

| Papel | Valor | Uso |
|---|---|---|
| `night-deep` | `#08151D` | coluna narrativa, sidebar e fundo mais profundo |
| `night-base` | `#0E1C26` | workspace e formulário de autenticação |
| `night-raised` | `#152833` | cartões, campos e controles |
| `night-overlay` | `#1A313D` | modal, popover, sheet e tool preview |
| `border-subtle` | `#29414D` | separação decorativa que não comunica limite essencial |
| `border-default` | `#607C86` | limites/estados que precisam atingir 3:1 contra overlay |
| `foreground-primary` | `#F5EFE4` | títulos e texto principal |
| `foreground-secondary` | `#BCC8C9` | texto secundário |
| `foreground-muted` | `#95A7AA` | metadado informativo; não usar menor/mais fraco sem medir |
| `brand-primary` | `#F28C74` | percurso, ação primária e seleção |
| `brand-hover` | `#FF9B85` | hover/ênfase da marca |
| `brand-on-primary` | `#08151D` | texto em botão vermilhão |
| `success` | `#78C99A` | sucesso sobre superfície `#163429` |
| `warning` | `#F0C468` | atenção sobre superfície `#332A14` |
| `error` | `#FF8791` | erro sobre superfície `#3B1D24` |
| `info` | `#7DB9D2` | informação sobre superfície `#163142` |
| `focus-ring` | `#8AD5F0` | foco em qualquer superfície dark |

Contrastes de referência já calculados: primary/base 15,13:1; secondary/base 10,10:1; muted/base 6,91:1; brand/base 7,24:1; on-brand/brand 7,73:1; success/surface 6,82:1; warning/surface 8,64:1; error/surface 6,58:1; info/surface 6,28:1. O foco varia de 8,29:1 a 11,32:1 nos quatro degraus. `border-default` mede 3,05:1 contra `night-overlay`; `border-subtle` não pode ser usado como único limite de controle.

## Contraste mínimo

- Texto normal: WCAG AA ≥4,5:1.
- Texto grande: ≥3:1; títulos principais devem buscar ≥7:1.
- Controles, bordas essenciais, estados selecionados e foco: ≥3:1 contra cores adjacentes.
- Placeholder e texto secundário que comunicam informação continuam sujeitos a 4,5:1.
- Ação primária: texto/ícone ≥4,5:1 contra o vermilhão e o botão ≥3:1 contra a superfície ao redor.
- Medir pares em sRGB e registrar valores reais, não apenas afirmar aprovação.

## Autenticação em duas colunas

- Em ≥1024px, manter duas colunas reais: narrativa à esquerda em `night-deep`; formulário à direita em `night-base` com campos `night-raised`.
- As duas colunas devem ser dark e claramente distintas por tom, borda e composição.
- A coluna narrativa mantém o traço Localize → Decida → Acompanhe e o contexto da Vex.
- Em 320–1023px, manter a faixa editorial compacta dark e o formulário dark; nenhuma faixa creme/branca.
- Validar especificamente 1023 e 1024 para provar a mudança de composição.

## Atualizações obrigatórias do Executor

1. Reescrever o front matter e a prosa de `DESIGN.md`, eliminando o contrato de superfícies claras e todas as referências normativas a papel claro.
2. Atualizar `etapa-2-migracao-tokens.md`, `etapa-2-assets-fontes.md` quando afetado, `etapa-2-rastreabilidade.md` se necessário e `etapa-2-relatorio-preview.md`.
3. Refazer integralmente `preview-etapa-2/styles.css` para dark; não basta aplicar filtro ou trocar `body`.
4. Preservar interações já aprovadas: 44px, mostrar senha, foco, trap/Escape/retorno/inert, rascunho preservado, prevenção de reentrada e distinção pending/erro.
5. Regenerar as 25 capturas existentes em dark. Acrescentar capturas somente se forem necessárias para provar um novo estado; remover capturas claras antigas para não misturar direções.
6. Manter `apps/`, `modules/` e `packages/` intocados.

## Capturas e viewports obrigatórios

- Login: 320×800, 390×844, 768×1024, 1023×900, 1024×900, 1440×900 e 1920×1080.
- Hoje: as mesmas sete larguras/alturas da matriz existente.
- Componentes: 390×844 e 1440×900.
- Captura rápida: 390 e 1440, incluindo erro recuperável.
- Vex: 390 e 1440, incluindo confirmação, pending e erro.

Em cada viewport: `scrollWidth === clientWidth`, alvo mínimo 44px, texto longo sem corte, footer Vex visível/rolável, nav não cobrindo ação e safe area preservada.

## Inspeção visual obrigatória

O Revisor deve olhar pelo menos:

- Login 390 e 1440;
- Hoje 390 e 1440;
- Capture error 390 e 1440;
- Vex confirmation/pending/error 390 e 1440;
- Componentes 390 e 1440;
- pares 1023/1024 de Login e Hoje.

O dark será rejeitado se houver black crush, texto cinza fraco, cartões indistinguíveis, excesso de bordas, aparência cyberpunk/IA, vermilhão confundido com erro, massas claras ou paridade quebrada.

## Gate de aprovação

A revisão só será aprovada quando:

1. não houver superfícies claras extensas no preview ou no `DESIGN.md`;
2. os pares normativos e de foco tiverem métricas de contraste registradas;
3. os screenshots comprovarem hierarquia e profundidade dark sem depender de glow;
4. autenticação continuar em duas colunas no desktop e funcional em mobile;
5. todas as interações e estados anteriormente aprovados permanecerem;
6. não houver overflow horizontal entre 320 e 1920;
7. o preview estiver visualmente coeso em Login, Hoje, componentes, captura e Vex;
8. a árvore de produção permanecer intocada.
