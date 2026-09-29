# Etapa 2 — parecer final do Revisor

Status: **REABERTA — a aprovação anterior foi substituída pela exigência obrigatória de dark mode**.  
Data: 21/09/2026.

A prova clara abaixo registra a decisão anterior e não deve ser apresentada como solução atual. A nova aprovação depende do cumprimento de `docs/redesign/etapa-2-revisao-dark.md`. Nenhuma interface de produção está autorizada.

## Evidências de aprovação

1. `DESIGN.md` existe antes de qualquer UI de produção, segue a ordem canônica, contém 143 referências válidas, nenhum token referenciado ausente e nenhum cabeçalho `##` duplicado.
2. A direção **Cartografia Pessoal** estabelece uma linguagem reconhecível: papel quente, tinta azul-marinho, vermilhão de percurso e traço com nós semânticos. A inspeção das capturas confirmou hierarquia editorial clara e ausência dos clichês SaaS/IA vetados.
3. A autenticação preserva duas colunas reais a partir de 1024px. A coluna narrativa explica benefício, percurso e participação da Vex; a coluna de tarefa concentra o formulário. Em 320–1023px, a identidade reaparece como faixa editorial sem comprimir o formulário.
4. Login, Hoje e faixa essencial de componentes possuem prova pareada em mobile e desktop. O recorte interativo agora comprova captura rápida em 390/1440 e Vex em 390/1440, incluindo confirmação, pending e erro recuperável.
5. A matriz cobre as 22 rotas e rastreia F01–F12 até ciclo, componente, teste e preview esperados.
6. A especificação inclui contratos para 36 componentes/padrões, abrangendo os controles, feedback, navegação, overlays, listas/tabelas, traço/timeline e Vex necessários ao Ciclo 0.
7. As capturas verificadas mostram zero overflow horizontal nos viewports 320, 390, 768, 1023, 1024, 1440 e 1920; a mudança 1023→1024 está explícita e mantém capacidades essenciais.
8. Alvos interativos medidos têm pelo menos 44px. O mostrar senha entra na ordem de Tab, alterna nome/`aria-pressed` e preserva foco previsível.
9. Os overlays contêm Tab, fecham por Escape, devolvem foco e aplicam `inert` ao fundo do produto enquanto abertos.
10. Pending e erro da Vex têm texto, cor, borda e classe distintos. Pending usa mineral/informação; erro usa carmim. A confirmação fica bloqueada durante execução e a falha preserva contexto/proposta.
11. O foco claro usa `#285F7B`; sobre chrome escuro usa `#7DB9D2`, com razões registradas de 7,47:1 contra `#10232F` e 6,86:1 contra `#152A38`.
12. `app.js` passou em `node --check`; o relatório registra console sem erros durante os estados testados. `apps/`, `modules/` e `packages/` permanecem sem alterações nesta etapa.

## Correções exigidas e encerradas

- contraste do foco em superfícies escuras;
- separação visual e semântica entre pending e erro da Vex;
- fundo inerte durante diálogos modais;
- paridade mobile/desktop do recorte interativo;
- contratos ausentes de controles e padrões no `DESIGN.md`;
- atualização das capturas e do relatório de validação.

## Limites preservados para as próximas etapas

- Georgia é o fallback efetivo da prova; Fraunces ou outra serif própria depende de WOFF2 e licença versionados.
- A origem/licença dos assets existentes precisa ser formalizada antes de redistribuição.
- O preview não comprova Supabase, autenticação real, persistência, autorização ou execução real da Vex.
- Android físico, Tauri, iOS, teclado virtual real e leitor de tela permanecem gates do Ciclo 7.
- Typecheck, Vitest e build de produção não precisaram ser repetidos porque nenhum arquivo de produção foi alterado; tornam-se obrigatórios a cada ciclo da Etapa 3.

## Decisão a apresentar

O usuário deve ver os pares Login/Hoje e os estados Captura/Vex e escolher uma das opções já previstas:

1. aprovar **Cartografia Pessoal** como está;
2. manter estrutura e ajustar temperatura/contraste;
3. manter a nova identidade, mas refazer sua linguagem gráfica.
