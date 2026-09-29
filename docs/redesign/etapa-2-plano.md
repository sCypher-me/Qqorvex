# Etapa 2 — plano mestre do redesign Qqorvex

Status: plano do Revisor para execução; nenhuma interface de produção deve ser alterada nesta etapa.  
Entrada aprovada: **identidade visual nova (opção B)**, obrigatoriamente **dark mode**, preservando Qqorvex, Vex e a composição de **duas colunas na autenticação desktop**.  
Base: diagnóstico aprovado em `docs/redesign/etapa-1-diagnostico.md` e regras das skills `frontend-design`, `design-system`, `design-spatial` e `design-spec`.

## 1. Objetivo e decisões já fechadas

A Etapa 2 deve converter o diagnóstico em uma fonte de verdade visual e em uma sequência de execução verificável. Ela não é a implementação do redesign. O resultado esperado é um sistema que permita redesenhar as 22 rotas sem decisões improvisadas por tela.

Decisões fechadas:

- A identidade será realmente nova; não será apenas a paleta atual com tons diferentes.
- Toda a experiência será dark mode. Fundos, cartões, campos, overlays e prévias não podem usar superfícies claras; tons claros ficam restritos a texto, ícones e detalhes pequenos de alto contraste.
- A marca Qqorvex, a personagem Vex, o modelo de módulos pessoais e os fluxos funcionais permanecem.
- A autenticação mantém duas colunas em desktop: uma coluna de identidade/contexto e outra de tarefa/formulário.
- Mobile e desktop têm o mesmo peso de projeto e de aprovação.
- A Vex continua contextual, compartilhada entre painel e página, e toda ação de ferramenta continua exigindo confirmação explícita.
- O redesign não pode prometer capacidades inexistentes, substituir políticas de autenticação nem mascarar falhas de dados como estados vazios.
- `DESIGN.md` na raiz é bloqueio obrigatório: deve ser criado e aprovado antes de qualquer alteração em componentes, páginas ou estilos de produção.

## 2. Tese de produto

O Qqorvex deve parecer um **sistema pessoal que transforma áreas dispersas da vida em um mapa operável**. A pessoa não entra apenas para observar painéis; ela entra para localizar contexto, decidir o próximo passo, executar e confirmar o resultado. A Vex participa como uma camada contextual desse sistema, sem dominar todas as telas e sem assumir estética genérica de “chat de IA”.

Três princípios devem orientar todas as decisões:

1. **Orientação antes de densidade:** a pessoa sempre identifica onde está, o que exige atenção e qual é a ação principal.
2. **Rastro antes de magia:** origem, contexto, confirmação, execução e resultado ficam visíveis, especialmente nas ações da Vex.
3. **Continuidade entre áreas:** cada módulo tem identidade de conteúdo, mas usa a mesma gramática de navegação, estados, feedback e composição.

As tarefas primárias usadas para julgar a arquitetura são:

- entrar com segurança e entender o estado da conta;
- ver o dia e chegar ao item que requer ação;
- capturar e acompanhar uma tarefa sem perder entrada;
- localizar um módulo ou comando sem confundir a paleta com busca de conteúdo;
- conversar com a Vex no contexto atual, revisar uma ação e confirmar apenas uma vez;
- compreender carregamento, vazio, falha, sucesso e indisponibilidade sem ambiguidade.

## 3. Direção visual proposta: “Cartografia Pessoal”

### 3.1 Posição estética

Direção dominante: **editorial utilitária**. Referências conceituais: caderno de navegação, índice de arquivo, mapa de percurso e instrumentos de precisão silenciosos. Não copiar interfaces ou marcas específicas.

O produto deve combinar:

- uma base noturna azul-marinho quase preta, com leve temperatura mineral;
- áreas de trabalho, navegação, cartões, campos e overlays separadas por degraus tonais escuros, bordas e densidade, sem painéis brancos ou creme;
- um sinal vermelho-terra/vermilhão para ação e percurso;
- linhas finas, índices, marcas de origem e mudanças de escala para organizar a informação;
- tipografia editorial nos títulos e tipografia altamente legível nos controles;
- densidade controlada: informação suficiente para operar, com respiro nos pontos de decisão.

Essa composição é materialmente diferente do sistema atual de obsidiana, cyan, dourado, brilho e cartões flutuantes: o dark novo é editorial e cartográfico, com contraste tonal preciso, superfícies planas e vermilhão funcional. O novo vocabulário não usa gradiente roxo, neon, orbes luminosos, vidro genérico, estrelas, constelações ou mensagens que personifiquem a IA como magia.

### 3.2 Âncora de diferenciação

A assinatura reconhecível sem logotipo será o **traço de percurso**: uma linha fina com nós de formas distintas que comunica origem, posição, dependência, progresso ou transferência de contexto. Ela aparece somente quando carrega significado:

- no cabeçalho da página, conecta seção → módulo → item;
- em Hoje, ordena compromissos e prazos no tempo;
- na Vex, mostra qual contexto foi entregue e em qual etapa a ação está;
- em detalhes e processos, marca etapas concluídas, atual e futura;
- na autenticação, torna-se uma peça editorial discreta que liga a promessa do produto ao formulário.

O traço não pode virar moldura decorativa em todo cartão. Nó, forma e cor precisam possuir significado documentado no `DESIGN.md`.

### 3.3 DFII

| Dimensão | Nota | Justificativa |
|---|---:|---|
| Impacto estético | 5 | Dark editorial cartográfico e traço funcional criam uma assinatura distante de dashboards SaaS/IA escuros. |
| Adequação ao contexto | 5 | “Mapa pessoal” conecta os módulos e torna o contexto da Vex visível. |
| Viabilidade | 4 | Executável com CSS, SVG e componentes atuais, sem motor gráfico. |
| Segurança de performance | 4 | Texturas serão CSS/imagem mínima; movimento compositor-first e esparso, ainda sujeito a validação. |
| Risco de consistência | 3 | Os degraus tonais escuros e o traço exigem regras firmes para preservar leitura e não virar decoração. |
| **DFII** | **15** | Excelente; seguir com disciplina sistêmica. |

### 3.4 Cor, tipografia, forma e profundidade a especificar

O Executor deve transformar os nomes abaixo em valores exatos e acessíveis no `DESIGN.md`; nenhum valor é definitivo até contrastes serem calculados.

- **Noite profunda:** fundo global e coluna narrativa, azul-marinho quase preto.
- **Noite base:** workspace escuro, distinto da coluna narrativa sem virar cinza lavado.
- **Noite elevada:** cartões, campos, menus e overlays em degraus escuros com separação mensurável.
- **Marfim:** texto primário e títulos; nunca superfície extensa.
- **Vermilhão claro:** ação primária e percurso ativo; nunca substitui erro. Botões devem usar texto escuro ou outra combinação comprovada por contraste.
- **Musgo claro:** sucesso e confirmação concluída.
- **Âmbar claro:** atenção e pendência.
- **Carmim claro:** erro/destrutivo, distinto do vermilhão de marca.
- **Azul mineral claro:** informação, foco e vínculos contextuais.
- Cores de categoria permanecem uma paleta fechada e devem passar contraste nas superfícies onde forem usadas.

Tipografia candidata para protótipo: uma serif expressiva e contida para títulos editoriais (por exemplo, Fraunces) e uma sans humanista para corpo/controles (por exemplo, IBM Plex Sans), com mono apenas em números tabulares, códigos e timestamps. Antes de incluir fonte, o Executor deve confirmar licença, obter WOFF2 com origem documentada, auto-hospedar e impedir reflow perceptível. Se isso não for viável sem download externo nesta etapa, o preview usa fallback métrico explicitamente marcado e a adoção da fonte fica como dependência de aprovação, nunca como importação de CDN.

Formas:

- campos e botões: raio médio e contido;
- cartões e modais: raio maior derivado matematicamente do raio interno + padding;
- nós do traço: círculo para informação, losango para decisão, quadrado para ação;
- superfícies principais separadas por cor, borda ou sombra curta; evitar brilho e sombras atmosféricas.

## 4. `DESIGN.md`: contrato obrigatório antes da UI

O primeiro arquivo produzido pelo Executor deve ser `DESIGN.md` na raiz, seguindo exatamente a especificação `design-spec`: front matter YAML entre `---`, seguido das seções `Overview`, `Colors`, `Typography`, `Layout`, `Elevation & Depth`, `Shapes`, `Components` e `Do's and Don'ts`, sem cabeçalhos duplicados.

O front matter deve conter, no mínimo:

- `version`, `name` e `description`;
- primitivas e aliases semânticos de cor para foreground, background, surface, border, brand, focus, overlay e estados;
- tipografia para display, títulos, corpo, label e data;
- escala de espaçamento baseada em 4px, com uso dominante em múltiplos de 8px;
- raios, bordas, elevação e duração/easing;
- componentes: botões, campos, cartões, navegação, chips, notice, modal, sheet, popover, command palette, skeleton, empty state, feedback de operação e estágios da Vex;
- referências entre tokens no formato `{grupo.token}` em vez de duplicação de valores.

O corpo deve documentar:

- tese “Cartografia Pessoal” e âncora do traço;
- papéis e proibições de cada cor;
- política dark integral: degraus de superfície, bordas, texto e estados para base, chrome e Vex, sem tema claro implícito;
- regras para autenticação em duas colunas;
- breakpoints como mudanças de composição, não apenas tamanhos;
- hierarquia e densidade por tipo de tela;
- iconografia própria: traço de 1.5–2px, cantos e terminais consistentes, SVG acessível; não adicionar biblioteca sem decisão explícita;
- estados completos e conteúdo de exemplo realista em português;
- motion, `prefers-reduced-motion`, safe areas e foco;
- exemplos “faça/não faça” contra cartões excessivos, pills em todo lugar, microtexto em caixa alta e decoração sem semântica.

Antes de qualquer preview visual, validar:

1. YAML parseável e tokens sem referências quebradas;
2. todos os papéis de cor com contraste-alvo registrado;
3. nenhuma cor de marca compartilhada com erro/destrutivo;
4. todas as decisões do usuário representadas;
5. mapeamento explícito de tokens antigos → novos para permitir migração gradual sem quebrar módulos.

## 5. Arquitetura do sistema e componentes

### 5.1 Camadas

1. **Primitivas:** cor, tipo, espaço, raio, borda, elevação, movimento e ícones.
2. **Controles:** Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Chip, Badge e Tooltip.
3. **Estruturas:** Card/Section, FormField, ListRow, DataCell, Tabs, Table, Timeline/RouteLine e PageHeader.
4. **Feedback:** Notice, InlineError, OperationStatus, Toast, Skeleton, EmptyState, ErrorState e Retry.
5. **Overlays:** Modal, ConfirmDialog, Popover, CommandPalette, BottomSheet e VexPanel.
6. **Shell:** Sidebar, AppHeader, MobileBottomNav, MoreSheet, content container e PageTransition.
7. **Padrões de domínio:** captura rápida, painel de resumo, calendário, kanban/lista, editor, progresso, cofre, transação e conversa/ação Vex.

### 5.2 Contratos obrigatórios de estado

Cada componente interativo precisa especificar, quando aplicável: default, hover, focus-visible, active/pressed, selected/current, disabled, loading, success, warning, error e read-only. A cor não pode ser o único sinal.

Todo fluxo assíncrono usa o mesmo contrato:

`idle → pending → success | recoverable-error | terminal-error`

- pending bloqueia reentrada somente no escopo da ação;
- erro recuperável preserva o rascunho;
- sucesso confirma o objeto afetado e evita duplicidade;
- vazio só aparece após consulta concluída com sucesso;
- dados parciais e indisponibilidade possuem estados distintos;
- mensagens em chrome reservam espaço ou truncam sem mudar sua altura.

FormField deve gerar IDs para hint/erro e compor `aria-describedby`; overlays devem conter foco, fechar por Escape e devolver foco; itens selecionáveis usam elementos semânticos alcançáveis por teclado.

## 6. Arquitetura de telas

As 22 rotas devem constar numa matriz de cobertura do Executor. A sequência agrupa telas pelo padrão que validam, não por conveniência de arquivo.

### Família A — entrada e confiança

`/login`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha`, `/mfa`.

- Desktop ≥1024px: duas colunas reais, ambas visíveis e balanceadas; coluna esquerda em noite profunda com narrativa curta, prova de contexto e Vex; coluna direita em noite base/elevada com tarefa/formulário. A separação é tonal e estrutural, sem superfície clara.
- A coluna narrativa não lista fornecedores (“Supabase Auth”) e não promete 2FA universal; comunica benefícios verificáveis.
- Mobile: formulário é a tarefa principal; a identidade reaparece como faixa editorial compacta e significativa, sem tentar apertar duas colunas físicas em 320px.
- Cadastro pode rolar, mas ação, progresso, erros e alternativas mantêm hierarquia; não comprimir campos por padding fixo.

### Família B — shell e orientação diária

`/`, `/tarefas`, `/agenda`, `/metas-habitos`, `/gamificacao`.

- Hoje valida a hierarquia macro e o traço temporal.
- Tarefas valida captura, views, drag alternativo, falha e preservação de rascunho.
- Agenda valida navegação temporal, densidade e criação.
- Metas/Hábitos valida progresso, rotinas e modais.
- Gamificação valida dados e celebração sem estética infantil.

### Família C — conhecimento

`/estudos`, `/estudos/:notebookId`, `/segundo-cerebro`, `/segundo-cerebro/:pageId`, `/biblioteca`.

Validar listas, detalhes, editores, grafos, tabs, conteúdo longo, tags, empty/error/not-found e ação persistente no fim do trabalho.

### Família D — gestão e confiança operacional

`/documentos`, `/financas`, `/vida-pessoal`, `/perfil`, `/seguranca`, `/manager`.

Validar tabelas/grades, dados sensíveis, PIN/cofre, números tabulares, filtros, permissões, configurações, confirmações destrutivas e metadado correto de `/manager`.

### Família E — Vex

`/vex` e `VexPanel` nas demais rotas.

Estados separados: saudação, conversa vazia, digitando, pensando, resposta, contexto anexado, proposta de ação, aguardando confirmação, executando, concluída, falha recuperável e histórico. O painel desktop permanece uma terceira região temporária e dimensionável; no mobile é uma experiência integral com safe area, teclado virtual e retorno claro. Página e painel compartilham a mesma gramática e sessão.

## 7. Interações e movimento

- Uma entrada de página breve (180–240ms) pode organizar hierarquia; chrome persistente não se move.
- Troca entre rotas pares usa fade/ênfase, não slide direcional enganoso.
- Sheet e painel comunicam origem espacial; confirmação Vex comunica progressão de estado.
- Animações usam opacity/transform e possuem equivalente sem movimento.
- Hover nunca contém informação necessária; touch, teclado e ponteiro chegam às mesmas ações.
- Alvos principais e icon buttons devem ter área interativa mínima de 44×44px, inclusive mostrar senha.
- Drag-and-drop mantém alternativa por menu/teclado.
- O traço de percurso pode animar somente ao comunicar avanço, nunca em loop decorativo.

## 8. Responsividade com paridade real

Viewports obrigatórios por preview e validação:

| Faixa | Viewport mínimo de prova | Comportamento a verificar |
|---|---|---|
| Mobile estreito | 320×800 | reflow, texto longo, campos, overlays, zero overflow |
| Mobile alvo | 390×844 | navegação, safe area, teclado virtual e toques |
| Tablet | 768×1024 | mudança de densidade e painéis sem “desktop encolhido” |
| Limite do shell | 1023×900 e 1024×900 | transição nav inferior/sidebar e auth 1→2 colunas |
| Desktop alvo | 1440×900 | hierarquia, duas colunas, densidade e Vex lateral |
| Desktop amplo | 1920×1080 | limites de leitura e ausência de expansão vazia |

Gates por faixa:

- `document.documentElement.scrollWidth === clientWidth`;
- nenhum grid usa `minmax()` maior que a área útil sem fallback com `min(100%, ...)`;
- filhos flex/grid com texto longo têm `min-width: 0` e quebra apropriada;
- popovers e menus são limitados por `min(100vw - margem, largura-alvo)`;
- conteúdo não fica oculto por nav fixa, safe area ou teclado;
- desktop e mobile preservam as mesmas capacidades essenciais, com composição adequada ao contexto;
- zoom de 200% e reflow a 320px não removem ações.

## 9. Preview obrigatório da Etapa 2

O Executor deve criar uma **prova de direção**, não uma implementação completa das rotas. Ela deve ser estática/interativa, isolada da aplicação, sem acessar Supabase nem alterar componentes de produção. Pode ficar em `docs/redesign/preview-etapa-2/` e usar fixtures claramente fictícias. O preview só é iniciado depois que `DESIGN.md` existir.

Conteúdo mínimo:

1. **Login:** 1440×900 e 390×844; desktop com duas colunas.
2. **Hoje:** 1440×900 e 390×844; shell, hierarquia, traço temporal e estados de atenção.
3. **Recorte de interação:** dentro da composição de Hoje, incluir uma captura rápida de tarefa e um painel/overlay da Vex com contexto, preview de ferramenta e confirmação. A alternância deve provar apenas default, foco, pending e erro recuperável; a rota completa de Tarefas e a conversa completa ficam para a Etapa 3.
4. **Faixa de componentes essenciais:** tipografia, paleta, botão, campo, chip/badge, card, notice e skeleton suficientes para julgar a linguagem. A prancha exaustiva pertence ao Ciclo 0 da Etapa 3.
5. **Breakpoints críticos:** capturas a 320 e no par 1023/1024 para provar reflow e a manutenção das duas colunas quando aplicável.

O preview deve permitir alternar os estados selecionados sem mutation real. Cada quadro precisa identificar viewport e estado. O propósito é decidir identidade, composição, hierarquia, densidade e linguagem de interação; cobertura completa de componentes e fluxos continua sendo critério dos ciclos de execução.

Após a entrega, o Maestro deve apresentar as imagens desktop/mobile juntas e pedir uma decisão específica:

- **Aprovar “Cartografia Pessoal — Dark” como está**;
- **Manter estrutura dark e ajustar temperatura/contraste**;
- **Manter dark mode e a nova identidade, mas refazer sua linguagem gráfica**.

Nenhum ciclo de UI de produção começa sem essa escolha.

## 10. Ordem dos ciclos da Etapa 3

Cada ciclo deve ter plano do Revisor, execução do Executor, revisão, preview desktop/mobile e aprovação do usuário.

### Ciclo 0 — fundação

Criar/migrar tokens, fontes, ícones, utilitários, componentes base e harness de estados. Corrigir FormField, foco, tamanhos e overlays antes de multiplicar UI. Aprovação: `DESIGN.md` corresponde ao código e a prancha cobre todos os estados.

### Ciclo 1 — autenticação

Aplicar as duas colunas e os cinco fluxos públicos. Corrigir PasswordField, padding estreito, linguagem de segurança, sucesso/erro e teclado. Aprovação: pares 320/390 e 1024/1440; fluxo de Tab, zoom e mensagens associadas.

### Ciclo 2 — shell e navegação

Sidebar, AppHeader, MobileBottomNav, MoreSheet, CommandPalette, PageHeader e metadados das 22 rotas. Aprovação: orientação, trap de foco, escopo de busca explícito e transição 1023/1024 sem perda.

### Ciclo 3 — Hoje, Tarefas e Agenda

Estabelecer resumo, captura, coleções, calendário e feedback assíncrono. Corrigir F01, F08 e interpretação do item Hoje. Aprovação: falha simulada preserva entrada; dado parcial e vazio não se confundem.

### Ciclo 4 — Vex

Página, painel, histórico, composer, contexto e confirmação. Corrigir F02/F09. Aprovação: uma confirmação produz uma chamada; falha sempre libera controles; histórico é operável por teclado; painel não cobre navegação/composer.

### Ciclo 5 — organização e conhecimento

Metas/Hábitos, Gamificação, Estudos, Segundo Cérebro e Biblioteca. Aprovação: listas/detalhes/editor, conteúdo longo, not-found, progresso e ações finais em mobile/desktop.

### Ciclo 6 — gestão, pessoal e segurança

Documentos, Finanças, Vida Pessoal, Perfil, Segurança e Manager. Aprovação: dados sensíveis, tabelas, números, filtros, permissões, PIN e confirmações com clareza e reflow.

### Ciclo 7 — integração e acabamento

Estados cruzados, performance, consistência, textos, movimento, acessibilidade, Tauri/APK e regressão das 22 rotas. Remover aliases antigos somente quando não houver consumidores. Aprovação: gates completos e comparação visual final com o preview aprovado.

## 11. Validação e evidência obrigatória

### A cada componente/ciclo

- renderizar antes de avaliar; nunca aprovar pelo código sozinho;
- capturar desktop e mobile no mesmo estado e com conteúdo curto/longo;
- inspecionar screenshot limpo e, quando disponível, screenshot anotado pelo layout audit;
- medir overflow, alvo de toque, contraste e colisões; sinais de alinhamento/balanço orientam inspeção, não padronização cega;
- navegar por teclado completo, incluindo Escape, Tab/Shift+Tab, Enter e Espaço;
- verificar nomes, estados e descrições na árvore de acessibilidade;
- testar `prefers-reduced-motion`;
- simular loading, vazio, erro recuperável, erro terminal, sucesso e disabled;
- testar falhas com mocks/fixtures, sem ação destrutiva em conta real.

### Gates técnicos

- typecheck do workspace;
- suíte Vitest existente (linha de base 87/87) e testes novos apenas para contratos funcionais críticos;
- build de produção;
- console sem erro novo;
- zero overflow horizontal nos viewports obrigatórios;
- contraste mínimo WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande e componentes/foco;
- foco visível e não coberto;
- nenhuma ação somente por cor, hover ou drag;
- nenhuma regressão nos métodos de autenticação, autorização, confirmação destrutiva ou contexto Vex.

Testes em navegador não equivalem a dispositivo físico. Antes da conclusão global, validar pelo menos um Android real/Tauri e registrar limitações de iOS/leitor de tela caso não estejam disponíveis.

## 12. Critérios de aprovação do Revisor

A etapa/ciclo só pode ser aprovado quando:

1. o artefato cumpre o `DESIGN.md`, ou a mudança de especificação foi feita antes do código;
2. a interface tem uma hierarquia legível ao “teste do desfoque” e uma âncora reconhecível;
3. a solução não parece template SaaS, painel de IA ou coleção de cards genéricos;
4. as duas colunas de autenticação desktop permanecem e têm função, não apenas decoração;
5. preview pareado comprova equivalência de capacidade entre mobile e desktop;
6. todos os estados do escopo existem e são diferenciáveis;
7. os achados F01–F12 relacionados ao ciclo possuem evidência de correção ou decisão explícita;
8. gates de acessibilidade, overflow, interação, typecheck, testes e build passam;
9. o Revisor inspecionou a renderização e listou evidência, não só opinião;
10. o usuário viu o preview e aprovou a direção antes do próximo ciclo.

Não aprovar por “parecer moderno”. A aprovação deve citar tarefas concluídas, medidas, viewports, estados e riscos restantes.

## 13. Entregáveis imediatos do Executor da Etapa 2

Sem alterar a UI de produção, entregar:

1. `DESIGN.md` completo na raiz;
2. matriz de rastreabilidade `F01–F12 → ciclo → componente → teste → preview`;
3. inventário `token atual → token novo → estratégia de compatibilidade`;
4. preview isolado descrito na seção 9;
5. capturas nomeadas por tela, viewport e estado;
6. relatório de medições e interações do preview;
7. registro claro de fontes/assets novos e respectivas licenças, ou dependências pendentes;
8. lista de decisões que ainda precisam do usuário, limitada às que realmente mudam identidade ou comportamento.

O Executor não deve editar `apps/`, `modules/` ou `packages/` nesta etapa, exceto se o Maestro ampliar explicitamente o escopo após aprovação do preview. O `DESIGN.md`, a documentação e o preview isolado são os únicos artefatos autorizados.
