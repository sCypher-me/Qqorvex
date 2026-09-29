# Etapa 2 — relatório de medições e interações

Data: 21/09/2026. Ambiente: Chromium no navegador integrado, preview estático servido localmente, sem Supabase e sem mutations reais.

## Escopo renderizado

- Login: narrativa + formulário em duas colunas no desktop; faixa editorial + formulário no mobile.
- Hoje: shell, orientação diária, traço temporal, estados de atenção e continuidade.
- Captura rápida: foco inicial, pending e falha recuperável com rascunho preservado.
- Vex: contexto, prévia da ferramenta, confirmação, pending e falha recuperável.
- Faixa de componentes: tipografia, paleta, botões, campo, badges, notice, traço e skeleton.

Fixtures são fictícias e estão no próprio HTML. O preview não importa código de `apps/`, `modules/` ou `packages/` e não acessa rede de aplicação.

## Matriz responsiva

Em todas as linhas, `document.documentElement.scrollWidth === clientWidth`. A altura rolável é informativa; rolagem vertical em conteúdo longo é esperada.

| Tela | Viewport | Composição | Overflow horizontal | Menor alvo interativo |
|---|---:|---|---:|---:|
| Login | 320×800 | faixa + formulário | 0px | 44px |
| Login | 390×844 | faixa + formulário | 0px | 44px |
| Login | 768×1024 | faixa + formulário central | 0px | 44px |
| Login | 1023×900 | faixa + formulário central | 0px | 44px |
| Login | 1024×900 | duas colunas | 0px | 44px |
| Login | 1440×900 | duas colunas balanceadas | 0px | 44px |
| Login | 1920×1080 | duas colunas com limite de leitura | 0px | 44px |
| Hoje | 320×800 | header + nav inferior + uma coluna | 0px | 44px |
| Hoje | 390×844 | header + nav inferior + uma coluna | 0px | 44px |
| Hoje | 768×1024 | conteúdo fluido + nav inferior | 0px | 44px |
| Hoje | 1023×900 | conteúdo fluido + nav inferior | 0px | 44px |
| Hoje | 1024×900 | sidebar + workspace | 0px | 44px |
| Hoje | 1440×900 | sidebar + duas colunas de conteúdo | 0px | 44px |
| Hoje | 1920×1080 | conteúdo limitado a 1440px | 0px | 44px |
| Componentes | 390×844 | uma coluna | 0px | 44px |
| Componentes | 1440×900 | duas colunas | 0px | 44px |

Prova de breakpoint: em 1023, `.auth-story` e `.app-sidebar` estão ocultos, a faixa de identidade e `.mobile-nav` estão visíveis. Em 1024 ocorre o inverso: duas colunas reais no auth e sidebar no shell. Uma classe calculada a partir de `innerWidth` mantém essa prova determinística em engines que arredondam media queries por DPR; a regra CSS normativa continua em 1024px.

## Contraste

Razões calculadas em sRGB para os pares normativos usados no preview:

| Par | Razão | Gate |
|---|---:|---|
| primário `#F5EFE4` / base `#0E1C26` | 15.13:1 | passa AA/AAA texto normal |
| secundário `#BCC8C9` / base | 10.10:1 | passa AA/AAA texto normal |
| muted `#95A7AA` / base | 6.91:1 | passa AA texto normal |
| marca `#F28C74` / base | 7.24:1 | passa AA/AAA texto normal |
| texto `#08151D` / marca | 7.73:1 | passa AA/AAA texto normal |
| sucesso `#78C99A` / superfície `#163429` | 6.82:1 | passa AA texto normal |
| atenção `#F0C468` / superfície `#332A14` | 8.64:1 | passa AA/AAA texto normal |
| erro `#FF8791` / superfície `#3B1D24` | 6.58:1 | passa AA texto normal |
| informação `#7DB9D2` / superfície `#163142` | 6.28:1 | passa AA texto normal |
| foco `#8AD5F0` / noite profunda | 11.32:1 | passa 3:1 para foco/componente |
| foco / noite base | 10.60:1 | passa 3:1 para foco/componente |
| foco / noite elevada | 9.29:1 | passa 3:1 para foco/componente |
| foco / overlay | 8.29:1 | passa 3:1 para foco/componente |
| borda essencial `#607C86` / overlay | 3.05:1 | passa 3:1 para limite de controle |

As luminâncias relativas dos quatro degraus são 0.0068, 0.0106, 0.0192 e 0.0275, abaixo do teto 0.12. Marca e erro usam primitivas distintas. O foco mineral `#8AD5F0` é único em toda superfície; o offset de 2px faz o anel confrontar o degrau escuro ao redor inclusive em botões primários. A validação final dos componentes de produção continua no Ciclo 0.

## Teclado e estados

- Login: a ordem observada é tabs do harness → e-mail → recuperação → senha → **mostrar senha** → entrar → alternativas → criar conta. O controle de senha é alcançável, responde a teclado, mede 44×44px e alterna `aria-pressed`/nome.
- Captura: ao abrir, o foco entra no título. `Shift+Tab` chega ao fechar e o próximo `Shift+Tab` envolve para “Salvar tarefa”. Escape fecha e devolve foco ao acionador visível.
- Captura pending: somente o envio fica bloqueado e o rótulo vira “Salvando…”.
- Captura erro: o campo recebe `aria-invalid`, mantém “Revisar proposta da oficina”, volta a receber foco e oferece “Tentar novamente”.
- Vex pending: confirmar fica disabled e mostra “Executando…”, impedindo reentrada. O status usa mineral/info e o rótulo “Criando uma tarefa”.
- Vex erro: botão é liberado, recebe foco e vira “Tentar novamente”; contexto e proposta permanecem visíveis. O status troca para carmim/erro. Pending e erro têm texto, classe, borda e cor distintos.
- Overlays: Tab/Shift+Tab permanecem no diálogo, Escape fecha e o scrim não entra na ordem de foco. Ao abrir, sidebar, workspace e nav móvel recebem o atributo `inert`; ao fechar, o atributo é removido antes da restauração do foco.
- Paridade do recorte: captura rápida foi renderizada em 390 e 1440; Vex foi renderizada em 390 e 1440. Em Vex mobile, painel mede 796px dentro da área útil de 844px após o harness, footer termina exatamente em 844px e overflow horizontal permanece 0.
- `prefers-reduced-motion` remove deslocamentos, animações repetidas e transições perceptíveis.
- Console: nenhuma mensagem de nível error durante a navegação e os estados testados.

## Capturas

Diretório: `docs/redesign/preview-etapa-2/capturas/`.

Padrão de nome: `<tela>-<largura>x<altura>-<estado>.png`. Foram geradas 25 capturas: 14 matrizes de Login/Hoje, duas da faixa de componentes e nove estados de captura/Vex. Destaques:

- `login-390x844-default.png` e `login-1440x900-default.png`;
- `today-390x844-default.png` e `today-1440x900-default.png`;
- `today-390x844-capture-focus.png` e `today-390x844-capture-error.png`;
- `today-1440x900-capture-error.png`;
- `today-1440x900-vex-confirmation.png`, `today-1440x900-vex-pending.png` e `today-1440x900-vex-error.png`;
- `today-390x844-vex-confirmation.png`, `today-390x844-vex-pending.png` e `today-390x844-vex-error.png`;
- pares `1023x900` e `1024x900` para Login e Hoje.

## Limitações registradas

- A execução em browser não prova Android físico, Tauri, iOS, teclado virtual real ou leitor de tela. Esses gates permanecem para o Ciclo 7.
- O preview demonstra o contrato visual/operacional; não testa autenticação, persistência, autorização ou chamadas da Vex.
- Georgia é o fallback efetivo de título. A candidata Fraunces depende de WOFF2 e licença versionados.
- A licença/origem dos assets locais existentes não está documentada no repositório; eles não foram copiados nem redistribuídos.
