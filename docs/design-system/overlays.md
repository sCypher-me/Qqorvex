# Overlays e superfícies temporárias

## Modal e confirmação

`Modal` usa `<dialog>.showModal()` para semântica modal nativa, isolamento do conteúdo atrás, Escape/cancel, foco e retorno ao disparador. Backdrop pode fechar; o botão explícito de fechar permanece disponível nos modais com título. Abaixo de 1200px o diálogo ocupa a largura e se ancora ao rodapé como bottom sheet, com safe-area e rolagem interna. Confirmações destrutivas precisam dizer a consequência, oferecer cancelar e exigir ação explícita.

## Paleta de comandos

Abre por `Ctrl/⌘ K`, inicia o foco no campo, filtra destinos, navega por setas e executa com Enter. Escape fecha; Tab permanece no diálogo; conteúdo principal fica inert enquanto aberta e o foco retorna ao disparador. Clique no backdrop fecha.

## Folha “Módulos” no mobile

Portal fora da raiz do app, `aria-modal`, título nomeado, fundo inert, contenção de Tab, Escape e restauração de foco. Link de módulo fecha a folha e navega para a rota existente.

## Notificações

Popover não modal controlado pelo botão “Notificações”; `aria-expanded` e `aria-controls` expõem o vínculo. Clique externo fecha; Escape fecha e devolve foco ao acionador. Os itens são derivados da prioridade da Hoje e levam à rota do módulo de origem.

## Regras comuns

- Um overlay aberto deve ter nome acessível, camada acima do shell e saída clara por teclado.
- Não empilhar modais; não bloquear o usuário com loading sem saída/contexto.
- Usar scrim e blur apenas no fundo do overlay; evitar blur/gradiente em superfícies comuns.
- Respeitar redução de movimento e manter rolagem em conteúdo longo dentro do overlay.
