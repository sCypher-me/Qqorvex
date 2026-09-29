# Qqorvex v1.0 — implementação do design

**Direção aplicada:** Casa-Observatório, com identidade de produto discreta, escura e funcional. O app continua sendo a fonte de verdade de comportamento; a referência visual é `designq.zip` entregue pelo usuário, lida em conjunto com `Design-System-Handoff.md`, `UI-Components.md` e `Final-QA-Review.md` contidos no pacote. Onde um handoff anterior diverge do briefing final, prevalece o briefing final do usuário.

## Auditoria e escopo

O repositório já continha uma aplicação React/Vite/TypeScript com rotas, módulos, Supabase, autenticação real e componentes compartilhados. O pacote ZIP contém um protótipo HTML e documentos de handoff, não uma implementação funcional substituta. Por isso a mudança atualiza a camada visual e os pontos de entrada sem substituir operações, modelos, permissões, chamadas Supabase ou dados por fixtures.

O arquivo `Qqorvex-Codex-Implementation-Guide-v1.0.md` citado no pedido não aparece no ZIP nem no repositório auditado. A ausência foi registrada; nenhum detalhe foi inventado em nome desse guia.

## Mapeamento da implementação

| Área | Mudança visual/comportamental | Fonte principal |
| --- | --- | --- |
| Design tokens | Paleta do briefing, aliases compatíveis, camadas primitiva/semântica/componente, tipografia, raios, breakpoints, motion e overlays | `packages/design-system/src/tokens/` |
| Shell desktop | Sidebar persistente, breadcrumb, busca/paleta, captura rápida, notificações e acionador geométrico da Vex | `apps/qqorvex/src/app/` |
| Shell mobile | Barra fixa Hoje · Carteira · Vex · Planejar · Perfil, safe-area e folha “Módulos” | `apps/qqorvex/src/app/shell/MobileNav.tsx` |
| Autenticação | Layout editorial responsivo sem personagem; formulários e provedores reais preservados | `apps/qqorvex/src/pages/AuthLayout.tsx`, `packages/auth/` |
| Vex | Símbolo abstrato fora do chat; avatar oficial restrito à conversa; painel e `/vex` continuam usando o mesmo contexto de sessão | `apps/qqorvex/src/vex/` |
| Componentes | Superfícies foscas, controles com foco visível, abas por teclado, avisos semânticos, botões de ícone nomeados e diálogos responsivos | `packages/ui/src/components/` |
| Features | Cores e estados migrados a tokens nos módulos sem retirar seus controles ou regras | `modules/` e `apps/qqorvex/src/pages/` |

## Funcionalidade preservada

As rotas existentes continuam registradas: Hoje, Tarefas, Agenda, Metas & Hábitos, Estudos e cadernos, Segundo Cérebro e páginas, Biblioteca, Documentos, Finanças, Vida Pessoal, Perfil, Gamificação, Manager, Segurança e Vex; também login, cadastro, recuperação/redefinição de senha e MFA. O Manager continua condicionado ao perfil de dono e as proteções no backend continuam sendo a barreira de segurança real.

Busca/atalho `Ctrl/⌘ K`, captura rápida (abre a área real de Tarefas e foca o campo de captura), notificações derivadas da Hoje, painel da Vex, ações dos módulos e fluxos de conta usam suas integrações atuais. Não foram adicionados dados de demonstração nem uma API simulada.

## Decisões de identidade

- A Vex é personagem apenas dentro do estúdio de conversa. Header, navegação e autenticação usam o `CrystalCore` abstrato.
- O símbolo e o wordmark oficiais continuam assets de marca; texto da interface usa Space Grotesk, Manrope e JetBrains Mono.
- Superfícies são foscas; cyan comunica ação/atividade, gold marca conteúdo premium/marcos e cores semânticas ficam reservadas a status.
- Gradientes decorativos, glows persistentes e efeitos de fundo foram removidos. Degradês funcionais de capa com imagem e indicadores de progresso continuam por legibilidade/dado.
- Nenhuma publicação, deploy, migração de banco ou mudança de schema foi feita.

## Artefatos de trabalho existentes

`DESIGN.md` e `docs/redesign/` já existiam como material de trabalho do usuário e foram preservados sem edição. Este documento e `docs/design-system/tokens.md` registram a implementação final baseada no pacote entregue para esta solicitação; os materiais anteriores permanecem disponíveis para histórico, não como substitutos desta fonte visual.

## Documentação complementar

- [Tokens](design-system/tokens.md)
- [Componentes](design-system/components.md)
- [Breakpoints e layout responsivo](design-system/responsiveness.md)
- [Estados](design-system/states.md)
- [Overlays](design-system/overlays.md)
- [Fluxos de autenticação](authentication-flows.md)
- [Comportamento da Vex](vex-behavior.md)
- [Relatório de QA](qqorvex-design-qa.md)
