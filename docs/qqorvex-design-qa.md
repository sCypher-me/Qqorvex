# Qqorvex v1.0 — QA e verificação

Este registro diferencia checks executados de cenários que ainda precisam de validação visual/interativa no app. Atualizar os resultados após executar a suíte autorizada; não apresentar uma inspeção estática como teste E2E.

## Escopo revisado

- Fonte visual do usuário: `designq.zip`, `Design-System-Handoff.md`, `UI-Components.md` e `Final-QA-Review.md`.
- Rotas, auth, shell, tokens, componentes e módulos existentes; sem trocar integrações por dados de protótipo.
- Checagem de avatar: uso de arte Vex limitado à conversa; símbolo/wordmark e núcleo abstrato fora dela.
- Responsividade, área segura do rodapé, estados, foco, overlays, cores semânticas e motion reduzido.

## Verificações executadas (23/09/2026)

| Verificação | Resultado |
| --- | --- |
| TypeScript do app | Passou via `corepack pnpm typecheck`, incluindo o app e os 19 workspaces com script. |
| Build Vite de produção | Passou; 551 módulos transformados e chunk raiz de 275,16 kB, sem aviso acima de 500 kB. |
| Testes Vitest existentes | Passaram: 14 arquivos, 106 testes. |
| Busca por cores/efeitos ad hoc e uso de avatar | Revisada; usos restantes são as cores oficiais das marcas OAuth, degradê de legibilidade em capa fotográfica e avatar dentro do chat da Vex. |
| AccessLint | Zero violações no loading imediato e nas rotas `/login`, `/criar-conta`, `/esqueci-senha`, `/redefinir-senha` e `/mfa` após aguardar o conteúdo. |
| Smoke HTTP | As 22 rotas registradas entregam o shell React; o runtime não substitui o teste autenticado interativo. |

## Roteiro manual antes de release

1. Login, cadastro, OAuth, passkey, recuperação de senha e MFA (caminhos de sucesso e erro).
2. Captura pelo header abre Tarefas com foco no campo; busca `Ctrl/⌘ K`, navegação por setas/Enter/Escape e restauração do foco.
3. Notificações: vazio, itens por prioridade, navegação e fechamento externo/Escape.
4. Tarefas/Documentos: item em foco informado à Vex, troca de rota limpa o foco, ação de confirmação real.
5. Abrir/fechar o painel e `/vex` mantendo a conversa; envio, erro, carregamento e lista de conversas.
6. CRUD/estados reais de Agenda, Metas, Estudos, Segundo Cérebro, Biblioteca, Documentos, Finanças e Vida Pessoal.
7. Viewports 320×800, 390×844, 768×1024, 1199px, 1200px, 1440×900 e 1600×900; confirmar teclado, safe-area, overflow e conteúdo final acima do rodapé.
8. Modal, bottom sheet, menu mobile e paleta: foco contido, Escape, backdrop, retorno de foco e redução de movimento.

## Limites desta rodada

O protótipo HTML extraído é uma referência visual estática, não o app autenticado ligado ao backend. A tentativa de abri-lo como `file://` foi bloqueada pela política do navegador nesta sessão; não foi substituída por servidor local ou outro mecanismo. Por isso screenshots/casos visuais antigos em `docs/redesign/preview-etapa-2/` não são evidência visual desta implementação. O roteiro manual responsivo/acessível autenticado acima continua pendente; TypeScript/build/testes e AccessLint público não substituem essa conferência. O APK foi gerado, mas a validação em Android foi adiada pelo usuário.
