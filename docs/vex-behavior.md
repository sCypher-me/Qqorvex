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

## Personalidades

A pessoa escolhe como a Vex conversa no onboarding, em Configurações → Aparência ("Jeito da Vex") ou pedindo à própria Vex, que propõe a troca com `set_vex_style` e só grava depois do botão de confirmação. A escolha fica em `qqorvex_preferences.vex_style` e vale a partir da resposta seguinte.

| Chave | Personalidade | Jeito de falar |
| --- | --- | --- |
| `direct` (padrão) | Direta e acolhedora | Até 4 frases; responde na primeira frase; sem preâmbulo nem emoji. |
| `conversational` | Calorosa e conversadora | 3 a 6 frases; próxima, explica o porquê, humor leve e no máximo um emoji. |
| `encouraging` | Mentora estratégica | Objetivo → recomendação ou até 2 caminhos → próximo passo; aponta riscos com números reais. |

- **Fonte única:** `supabase/functions/_shared/vexPersonalities.ts`. O `vex-chat` envia a personalidade logo depois do guia base, o Ollama local usa o mesmo texto, e os rótulos do app (`packages/vex/src/vexStyle.ts`) vêm do mesmo arquivo.
- **Regras comuns:** as três personalidades têm as mesmas ferramentas, confirmações, regras de dados reais e segurança. Assuntos sensíveis pedem seriedade antes do estilo. Frases motivacionais prontas e saudações a cada mensagem são proibidas.
- **Exemplos:** os exemplos de tom são de outro assunto (gastos com delivery) e vêm com a instrução de não reaproveitar frases nem dados. Num teste com o modelo local, um exemplo sobre o próprio dia fazia a Vex repetir os números do exemplo como se fossem da pessoa.
- **Chave `encouraging`:** é o nome histórico da Mentora estratégica e não deve ser renomeada sem migrar as preferências salvas.
