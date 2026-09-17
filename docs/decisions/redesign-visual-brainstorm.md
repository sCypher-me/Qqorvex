# Redesign visual do Qqorvex — estado do brainstorming (15/09/2026)

Registro do que foi descoberto/decidido na sessão de brainstorming pra não se perder se o
design continuar numa conversa/modelo diferente. Quando o design final chegar (imagem, HTML,
Figma, o que for), a próxima etapa é **writing-plans** (plano de implementação) →
**executing-plans** (execução em lotes com checkpoints) — não pular direto pra código.

## Descoberta crítica: identidade visual real do projeto

`docs/design-system/tokens.md` só tinha cor/tipografia extraídas do Xmind — **não capturava a
arte de personagem nem o símbolo de marca**, que existem como arte-fonte na raiz do repo, fora
de `docs/`, e nunca tinham sido lidos antes desta sessão:

- `Vex/` — arte oficial da Vex (a assistente de IA do produto, "o cérebro de todo o projeto" nas
  palavras do usuário): personagem anime/dark academia/techwear gótico — cabelo preto com mechas
  azul-petróleo, orelhas e cauda de gato, óculos, roupa preta com fivelas/correntes douradas,
  joias/tatuagens com motivos geométricos (diamante, círculos concêntricos). Arte de corpo
  inteiro em `8. official.png`; avatares circulares prontos em `VEX_AVATAR_TRANSPARENT_CIRCLE_
  {64,128,256,512}.png` (recorte só do rosto/ombros, não o corpo inteiro).
- `Logotipos/` — símbolo da marca (`Symbol Official.png` dourado, `Symbol Secundaria.png` ciano):
  glifo de diamante/bússola de 4 pontas com ponto central, geometricamente derivado das
  tatuagens/joias da própria Vex. `Wordmark Official.png`: "Qqorvex." em creme com textura
  desgastada/grunge.
- Até 15/09/2026 essa arte não era usada em nenhum lugar do código (`packages/vex/src` não
  referenciava nada de `Vex/`) — presença visual da Vex no app era zero apesar de ela ser central
  ao produto.

## O briefing (destilado de 5 rodadas de pergunta/resposta)

- **Não pode parecer um dashboard genérico** — rejeição explícita de qualquer coisa que pareça
  "qualquer app aí".
- **Alinhado com o visual da Vex** — ela é o "cérebro" do projeto, o design tem que ser dela, não
  só ter a cor dela.
- **Gótico/anime espalhado agressivamente por toda tela, inclusive listas densas de dados**
  (tabela de transações em Finanças, Kanban de Tarefas) — não só nos momentos de destaque.
  Abordagem aprovada pra reconciliar isso com legibilidade: **densidade adaptativa** — o mesmo
  vocabulário visual (glifo de diamante, hairlines douradas, tipografia mono maiúscula) aparece
  em toda parte, mas a escala/intensidade do ornamento diminui onde a informação é mais densa
  (não desaparece, não vira genérico — só fica menor).
- **"Tem que parecer um produto de verdade e ao mesmo tempo o lar da Vex"** — duas exigências
  simultâneas: disciplina de composição de produto de verdade (grid organizado, hierarquia clara,
  módulos de tamanhos variados — não uma pilha de cards iguais) + presença espacial real da Vex
  (não só um ícone/cor, ela como âncora estrutural do layout).
- **Referência de layout** (não de cor/forma): um kit de dashboard com fundo saturado de cor
  única, cards arredondados, anel de progresso, botão de ação flutuante — o usuário deixou claro
  que só a *disciplina de composição* (módulos de tamanho variado, hierarquia confiante) é
  relevante, não a paleta magenta nem as formas arredondadas/suaves.
- **Touchstone confirmado pelo usuário**: UI da Persona 5 (anguloso, confiante, tipo HUD de
  personagem, extremamente estilizado mas ainda assim muito bem estruturado — não é bagunça).
- **Vex — padrão de interação**: página cheia (`/vex`) pra conversa focada continua existindo;
  além disso, uma **barra retrátil fixa na borda esquerda extrema** (fora da Sidebar de navegação
  atual, que continua no lugar dela) com o avatar/glifo da Vex, visível em qualquer página —
  clicar expande um painel de chat lateral sobrepondo o conteúdo (não empurra a tela).

## Tentativas já feitas e por que foram rejeitadas

1. **v1 — dashboard genérico**: cards com ícones redondos, tags coloridas fofas. Rejeitado:
   "parece um dashboard genérico ou qualquer app aí" — causa raiz era eu ter desenhado só a
   partir de `tokens.md` (cor/tipografia) sem checar `Vex/`/`Logotipos/`.
2. **v2 — glifo de diamante introduzido**: cantos ornamentados, avatar real da Vex no botão de
   chat, tags retangulares. Feedback: "ainda estão limpos demais".
3. **v3 — densidade adaptativa + barra retrátil**: glifo grande no destaque/pequeno nas tabelas,
   barra da Vex funcional (clique abre painel). Aprovado o conceito de densidade adaptativa
   (opção 3 de 3 propostas) e a posição da barra da Vex; ainda não validado estilisticamente.
4. **v4 — Vex como âncora HUD (Persona 5)**: painel fixo à esquerda com retrato dela + nível/XP +
   CTA de conversa embutidos, grid "bento" assimétrico à direita. Rejeitado ("tudo tá esquisito"),
   com causas identificadas (não só gosto):
   - **Bug real**: media query escondia o painel inteiro da Vex abaixo de 860px — na largura real
     da janela do usuário, ele via só o cabeçalho "Vex / Em sincronia" boiando sem imagem nenhuma.
   - Usei o avatar circular (recorte só do rosto) esticado num painel alto e estreito — corta as
     orelhas de um jeito estranho, deixa espaço morto. A arte de corpo inteiro (`8. official.png`)
     encaixaria melhor nesse formato vertical.
   - Os cards de conteúdo (Prioridades/Saldo/Sequência) não foram redesenhados de verdade — só
     ganharam um painel da Vex do lado, continuam com a mesma linguagem fina já rejeitada em v2.

## Ferramentas usadas nesta sessão

- **Artifact** (claude.ai) pras primeiras 3 rodadas — funciona, mas exige o usuário logado pra
  visualizar e eu não confirmo cliques de forma confiável via automação de navegador.
  - v1: `https://claude.ai/artifact/HqgroyrwSDqDqHBoQqAZVM`
  - v2: `https://claude.ai/artifact/CotfYDynykoTN4ec2uWa6T`
  - v3 (também publicado como Artifact): `https://claude.ai/artifact/27PR4hGtXTFv9Dxt4nS1tg`
- **Visual Companion do plugin Superpowers** (`skills/brainstorming/visual-companion.md`) —
  servidor local que serve HTML direto no navegador do usuário, sem precisar de login; usado pra
  v3 (re-publicado) e v4. Arquivos ficam em `.superpowers/brainstorm/<sessão>/content/` dentro do
  próprio repo (adicionar ao `.gitignore` se ainda não estiver).

## Resolvido — design aplicado (16/09/2026)

O usuário desenhou o sistema numa sessão separada e já **aplicou direto no código** (não voltou
como spec pra eu planejar/executar em lotes — o `writing-plans`/`executing-plans` previstos abaixo
não chegaram a rodar, o design chegou pronto e integrado). Estado ao reabrir esta sessão: 103
arquivos alterados (+7303/-3927 linhas), não commitados, repo git inicializado (não estava antes).

Verificação feita: `pnpm -r run typecheck` limpo nos 18 projetos, `pnpm --filter qqorvex build`
limpo (chunk principal 599kB → 644kB), `npx vitest run` 87/87 testes passando (os testes de
função pura de 15/09 sobreviveram intactos, como esperado). Confirmado ao vivo no navegador:
tela de login (`AuthLayout.tsx`, arte de corpo inteiro da Vex integrada), Hoje (anel de nível/XP,
card "Seu dia", card ambiente da Vex sugerindo ajuda), Finanças (stat cards com números mono,
painel lateral da Vex abrindo com "contexto atual: Finanças" e sugestões relevantes à página).
Resultado entrega o briefing: produto de verdade + lar da Vex, sem parecer dashboard genérico.

Detalhes completos do sistema (paleta "Balanced Vex" v1.0, classes `qv-*`, onde mexer) agora em
`docs/design-system/tokens.md` — esse arquivo é a fonte de verdade daqui pra frente, este aqui
(`redesign-visual-brainstorm.md`) fica só como histórico de como se chegou até lá.

Limpeza feita: `designq.zip` (40MB, material bruto) e `.superpowers/` adicionados ao `.gitignore`
— não fazem parte do app, não deveriam ir pro histórico do git.

**Pendências reais, não fecho sozinho:**
- Nada ainda commitado — perguntar ao usuário antes de criar o primeiro commit (regra de
  autonomia: não commitar sem pedido explícito).
- `designq.zip` continua em disco na raiz do repo (só ignorado pelo git) — perguntar se o usuário
  quer apagar, mover pra fora do repo, ou manter aí mesmo como referência local.

## Varredura completa de QA (17/09/2026)

Percorri as 13 páginas autenticadas (Hoje, Tarefas, Agenda, Metas & Hábitos, Estudos, Segundo
Cérebro, Biblioteca, Documentos, Finanças, Vida Pessoal, Segurança, Perfil, Gamificação) mais a
Paleta de Comando (Ctrl+K) e o painel lateral da Vex com usuário de teste real
(`khyron.box@gmail.com`, apagado ao final — cascata confirmada por SQL, 0 linhas órfãs). Nenhum
problema visual encontrado em nenhuma — todas consistentes com o sistema `qv-*`, estados vazios
com cópia útil, cores semânticas aplicadas corretamente (verde/vermelho em Finanças, pílulas de
status em Segurança/Tarefas).

**Teste funcional** (não só visual): criei uma tarefa real via captura rápida (persistiu, contador
da coluna Kanban atualizou) e uma transação real em Finanças (persistiu, Saldo Projetado recalculou
e ficou negativo corretamente, indicador apareceu no Calendário Financeiro) — confirma que a
migração de 103 arquivos não quebrou lógica por trás da nova aparência, só mudou a casca visual.

**1 erro de console encontrado, não é bug do redesign**: falha ao registrar o Service Worker de
notificações push (`/sw.js` existe, é feature anterior a esta sessão) — muito provavelmente
limitação do sandbox do navegador desta sessão de testes (Service Workers costumam ser bloqueados
dentro de iframes sandboxed), não uma regressão introduzida pelo redesign. Não investiguei mais a
fundo porque não há evidência de que seja causado pelas mudanças desta sessão.
