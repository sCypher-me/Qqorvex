# Vex — comportamento e presença visual

## Presença

O personagem/avatares da Vex ficam restritos à conversa em `apps/qqorvex/src/vex/VexConversationView.tsx`. No restante do produto, `CrystalCore` é o sinal abstrato: acionador no header desktop, ponto central da navegação mobile e motivo geométrico estático na coluna editorial de autenticação. A implementação não mostra Vex-avatar em dashboard, header, navegação ou autenticação.

## Entradas e continuidade

- O botão desktop “Falar com a Vex” abre/fecha o painel lateral. Se já está na rota `/vex`, o controle retorna à Hoje e abre o painel.
- A barra mobile abre a experiência de conversa em `/vex`; a rota integral permanece disponível no menu e na paleta de comandos.
- O painel e `/vex` compartilham a conversa ativa via `VexSessionProvider` e histórico persistido nas conversas existentes. A apresentação muda; não se cria uma segunda conversa de demonstração.
- A paleta oferece “Falar com a Vex” e abrir a conversa em tela cheia.

## Contexto e privacidade de escopo

`CurrentItemProvider` limpa o item ao trocar de rota. Tarefas e Documentos podem definir o item visível; `VexConversationView` acrescenta seu identificador e rótulo a uma mensagem de contexto construída por chamada, não persistida como mensagem de usuário. O rótulo da conversa mostra a página/módulo atual e, quando aplicável, a tarefa ou documento em foco.

Não ampliar silenciosamente o contexto para outras áreas, persistir a mensagem contextual, ou mudar o backend/agente como parte de um ajuste visual. Novas superfícies contextuais exigem revisão do contrato de dados e privacidade.

## Estados da conversa

Manter os estados atuais de carregamento, conversa vazia, envio/processamento, resposta, erro, confirmação de ação e histórico/renomeação. Avatar é decorativo (`alt="Vex"` atual); controles de conversa e ações precisam continuar com nomes acessíveis e foco visível. O movimento de processamento pode ser reduzido pelo sistema.
