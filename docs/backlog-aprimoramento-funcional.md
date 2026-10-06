# Backlog de aprimoramento funcional do Qqorvex

**Data da descoberta:** 05/10/2026
**Escopo:** funções e comportamento do sistema. Mudanças de identidade visual e layout estão fora deste backlog.
**Status:** decisões reunidas; ainda é necessário auditar a implementação atual antes de abrir tarefas de código, para distinguir o que já funciona do que falta ou está com defeito.

## Ordem recomendada

### 0. Auditoria funcional e reprodução dos problemas conhecidos

- Mapear o que já está implementado nas seis áreas e marcar cada item como funcionando, parcial, defeituoso ou ausente.
- Reproduzir cadastro e login em navegadores móveis e desktop; testar confirmação de e-mail, link/código de acesso, recuperação de senha, retomada da sessão e callbacks em navegadores internos de e-mail.
- Reproduzir a ativação de 2FA, inclusive a falha conhecida de exibição do QR.
- Testar no app web e no Android os caminhos que dependem de links profundos, notificações push e retomada depois de sair do app.
- Evitar duplicar funcionalidades existentes que só precisem de correção ou integração.

### 1. Login, cadastro e onboarding

- Exigir confirmação de e-mail antes de liberar os dados privados da conta; enquanto isso, mostrar claramente o estado pendente.
- No estado pendente, permitir reenviar a confirmação e corrigir o endereço de e-mail.
- Oferecer acesso por senha e como alternativa por link ou código de uso único.
- Tornar erros recuperáveis: preservar os campos preenchidos, explicar o próximo passo, permitir nova tentativa e evitar cadastros duplicados por cliques repetidos ou rede instável.
- Fazer links de confirmação, acesso e redefinição retornarem ao fluxo correto em web/mobile, inclusive quando abertos no navegador do aplicativo de e-mail.
- Tornar onboarding opcional e retomável. Oferecer escolha de personalidade da Vex; ao pular, usar um padrão que possa ser alterado depois.

### 2. Central de Segurança

- Corrigir o QR de 2FA e fornecer chave manual como alternativa.
- Só ativar 2FA depois de validar um código do autenticador.
- Emitir códigos de recuperação de uso único; invalidar os códigos anteriores ao gerar um novo conjunto.
- Pedir nova verificação de identidade para troca de e-mail/senha, desativação de 2FA, rotação de códigos e encerramento de todas as sessões.
- Permitir encerrar sessões individualmente, mantendo as outras conectadas.
- Avisar sobre novo dispositivo por e-mail e por push quando autorizado, com opção de encerrar a sessão desconhecida.
- Bloquear o Cofre ao sair da conta, quando o app vai para segundo plano e após inatividade. A Vex só consulta itens do Cofre desbloqueado quando o usuário pedir.

### 3. Vex: confiabilidade, contexto e execução

- Usar um catálogo atualizado das capacidades reais do app, com as permissões e ações disponíveis em cada área.
- Passar à Vex o contexto relevante da tela/item atual, sem carregar dados não relacionados ao pedido.
- Padronizar o fluxo de trabalho: entender o objetivo, consultar app/web conforme necessário, preparar o resultado, pedir apenas dados indispensáveis, exibir destino e mudanças, obter confirmação por botão, executar e verificar a gravação.
- Para objetivos que envolvam várias áreas, preparar um único plano revisável; permitir retirar ações e confirmar o restante com um botão.
- Preservar o pedido original e o estado das etapas quando houver falha. Retomar sem alegar conclusão sem confirmação do sistema e sem repetir uma ação já concluída.
- Usar respostas rápidas para pedidos simples e pesquisa aprofundada para tarefas complexas; consultar em paralelo quando seguro e sinalizar progresso em trabalhos longos.
- Implementar três personalidades: **Direta e acolhedora**, **Calorosa e conversadora** e **Mentora estratégica**. Todas compartilham as mesmas capacidades, permissões e regras de confirmação.
- Personalizar com preferências persistidas somente após pedido explícito ou confirmação; prever consulta, edição e remoção dessas memórias.
- Permitir conteúdo educativo/clinicamente informativo sem bloqueio por palavras isoladas; não pesquisar pornografia. Se a intenção continuar ambígua, pedir breve esclarecimento ou oferecer abordagem educativa segura.
- Em pesquisas salvas, usar fontes confiáveis, ligar referências a afirmações importantes e sinalizar incertezas. Referências são obrigatórias nos materiais de pesquisa salvos e opcionais em respostas rápidas.

### 4. Hoje

- Planejar o dia usando compromissos, tarefas, prazos, duração estimada das tarefas e preferências de disponibilidade.
- Usar janela inicial de **08:00–21:00**, ajustável pelo usuário; reservar aproximadamente **20%** do tempo disponível para pausas e imprevistos.
- Estimar duração de tarefas a partir da descrição e de correções anteriores; perguntar quando a estimativa for muito incerta.
- Reavaliar quando tarefas ou compromissos mudarem. Quando o dia ficar inviável, oferecer reorganização de tarefas e compromissos sem alterar nada antes da confirmação.
- Mostrar as mudanças propostas em conjunto; permitir retirar itens e confirmar as demais mudanças com um botão.
- Enviar push apenas para conflito real ou prazo em risco, se autorizado, evitando alertas repetidos para o mesmo problema.
- Próximo ao fim da janela de disponibilidade, mostrar no app um único convite opcional para fechar o dia. Não empurrar pendências automaticamente para amanhã nem insistir se for ignorado.
- Permitir captura rápida em linguagem natural para tarefa, compromisso, nota/ideia, despesa e outros tipos reconhecidos; apresentar categoria e destino corretos antes de salvar, com confirmação.
- Fazer avisos de outras áreas abrirem o item exato e oferecer ação direta quando segura; mudanças sensíveis continuam confirmadas.

### 5. Perfil

- Usar privacidade como padrão para novas contas, com controle público/privado e personalização opcional dos campos públicos.
- Manter e-mail e telefone sempre privados.
- Deixar o usuário escolher badges/títulos exibidos na vitrine, em vez de publicar toda a coleção.
- Aplicar as regras de privacidade de forma consistente em todas as áreas compartilhadas.

### 6. Gamificação

- Não retirar XP, níveis ou conquistas obtidas por ausência; não transformar dias perdidos em dívida nem usar sequência quebrável. Mostrar consistência acumulada sem penalidade.
- Sugerir desafios opcionais com base em metas e hábitos do usuário; permitir trocar ou ignorar sem punição.
- Atualizar progresso automaticamente por ações observáveis no app, sem exigir registro duplicado; usar confirmação manual apenas para ações externas ao app.
- Manter somente o badge do nível atual e o marco atual de assinatura como badges de progressão; os anteriores são substituídos conforme definido pelo usuário.
- Manter os demais badges na coleção e deixar o usuário escolher o que exibir e qual título ativar.
- Garantir que desbloqueios gerem animação e notificação uma única vez; permitir consultar a coleção depois.
- Preservar a concessão administrativa de badges/títulos com registro de origem e auditoria.

## Requisitos transversais

- Toda função nova ou alterada deve atualizar, no mesmo conjunto de mudanças, as ferramentas, instruções e conhecimento da Vex, além dos testes pertinentes.
- A Vex nunca deve afirmar que concluiu uma ação antes de verificar seu sucesso real.
- Ações com gravação ou alteração exigem confirmação por botão. Alterações agrupadas podem ter uma única confirmação que enumera os itens e permite removê-los antes de executar.
- Respeitar permissões e políticas do Supabase/RLS; dados do Cofre permanecem bloqueados enquanto o Cofre estiver fechado.
- Validar fluxos críticos na web, em navegador móvel e no Android; cobrir falhas de rede, sessão expirada, links expirados, duplicidade e retorno de deep links.
- Não incluir mudanças visuais neste trabalho, exceto ajustes funcionais mínimos necessários para acesso, estado ou confirmação.

## Sequência de entrega

1. Concluir a auditoria e reproduzir os problemas de autenticação e QR 2FA.
2. Corrigir e validar autenticação, segurança, sessões e recuperação de conta.
3. Consolidar os fluxos confiáveis e o catálogo de capacidades da Vex; adicionar personalidades, memória consentida, contexto e qualidade de pesquisa conforme lacunas confirmadas.
4. Implementar o planejamento adaptativo e a captura integrada de Hoje, incluindo duração, disponibilidade, margem, notificações e fechamento do dia.
5. Aplicar privacidade de Perfil e completar as regras de progresso e desbloqueios da Gamificação.

Cada etapa começa confirmando o estado atual do app; itens já completos e corretos ficam fora da implementação e entram apenas na validação de regressão.
