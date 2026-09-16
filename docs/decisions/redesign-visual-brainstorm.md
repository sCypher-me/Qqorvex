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

## Próximo passo

Usuário vai desenhar a interface numa conversa separada (outro modelo). Quando o design estiver
estruturado e for trazido de volta (imagem, HTML, Figma, ou só descrição), a sequência é:
1. Extrair o sistema de tokens do design trazido (cor, tipografia, espaçamento, tratamento de
   borda/canto, iconografia) — comparar com o que já existe em `packages/design-system`.
2. **writing-plans**: plano de implementação detalhado (quais componentes de `packages/ui` mudam,
   ordem de rollout pelas ~15 páginas, o que precisa de asset novo).
3. **executing-plans**: execução em lotes com checkpoints (não tudo de uma vez).
