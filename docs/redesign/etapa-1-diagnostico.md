# Etapa 1 — diagnóstico UX/UI do Qqorvex

Status: aprovado pelo Revisor para apresentação ao usuário; validação visual pública parcial; feedback do usuário pendente. Data: 2026-09-20. Nenhum componente, regra de negócio ou backend foi alterado nesta etapa. Não há escolha de nova estética.

Este é um **diagnóstico estratégico com validação visual pública parcial**, não uma auditoria visual completa das 22 rotas. O produto já tem base visual e componentes reutilizáveis; o ponto de partida do redesign não é ausência de sistema. As lacunas prioritárias estão na confiança operacional (saber se uma ação foi aceita, falhou ou segue pendente), na navegação/contexto e na consistência dos estados. Para os módulos protegidos, oportunidades de hierarquia e densidade responsiva permanecem hipóteses até haver evidência renderizada. A direção visual deve responder a essas necessidades sem substituir decisões de produto ou antecipar a escolha de identidade pelo usuário.

## Escopo e nível de evidência

- **Código**: estrutura e comportamento demonstráveis nos arquivos citados. Não equivale a observação da interface funcionando.
- **Renderizado**: interface pública medida pelo Maestro no navegador local. Medidas e capturas fornecidas ao Executor; não houve sessão autenticada nem execução de mutations.
- **Hipótese**: consequência provável de estrutura/CSS, dependente de validação renderizada ou de uso. Não é defeito visual confirmado.

As 22 rotas foram reconciliadas com `apps/qqorvex/src/app/App.tsx:93`: 17 sob `ProtectedLayout`, 5 fora dele. “Fora do layout” não significa acesso funcional irrestrito: `/mfa` exige sessão e `/redefinir-senha` precisa de sessão válida para trocar a senha. Componentes de módulos foram seguidos nos fluxos representativos; a matriz abaixo registra estados encontrados nas páginas e nos filhos explicitamente citados, não garante cobertura de todo formulário interno.

Prioridades: P1 = bloqueio, perda de entrada ou ação repetida; P2 = compreensão, consistência ou acesso prejudicado; P3 = refinamento. Mobile e desktop têm o mesmo peso. Tablet/faixas intermediárias entram como continuidade, não como substituto de um dos dois.

## Inventário das 22 rotas e matriz de estados

P = sessão + verificação MFA pelo layout; E = fora do layout. Estados: C carregando; V vazio; E erro; S sucesso; D desabilitado. “Não exposto” significa não encontrado na composição analisada, não prova ausência em todos os filhos. A rota lazy tem fallback global de carregamento, que não substitui o carregamento dos dados.

| Rota | Acesso e componente em `src/pages` | Fluxo e componentes relevantes | Estados declarados e lacunas |
|---|---|---|---|
| `/` | P · `Hoje.tsx` | Resumo entre módulos, agenda, hábitos, leitura, nota diária; CardHeader, ProgressBar, GamificationWidget | C SkeletonList; V mensagens por seção; D nota diária pendente; E resumo não exposto; S por dados. |
| `/tarefas` | P · `Tarefas.tsx` | QuickCapture → KanbanBoard / TaskListView / RecurringTasksPanel; ChipTabs | C skeleton; V lista e colunas; E consulta/mutation não exposto na página; S lista após refetch; D captura sem estado pendente. |
| `/agenda` | P · `Agenda.tsx` | Navegar datas, visões de calendário, criar evento/reunião/recorrência; ChipTabs, calendário e formulários do módulo | C SkeletonBlock; vazio dependente da visão; D criação Zoom transmitida; E geral não exposto na página; S calendário atualizado. |
| `/metas-habitos` | P · `MetasHabitos.tsx` | GoalCard, HabitCard, RoutinesPanel; Modal e formulários | C skeleton; V metas/hábitos; modal fecha antes da confirmação; S por dados após sucesso; E e D criação não expostos pela página. |
| `/estudos` | P · `Estudos.tsx` | Criar/abrir caderno; NewNotebookForm, NotebookCard | C skeleton; V explícito; S dados; E consulta não exposto na página. |
| `/estudos/:notebookId` | P · `EstudosCaderno.tsx` | Resumos, tópicos, flashcards, quiz, dúvidas, avaliações → Agenda; Card/Input/Textarea | V por seção; D algumas ações/avaliação sem data; S resumo selecionado após criar; C/E consulta e caderno inexistente não diferenciados na página. |
| `/segundo-cerebro` | P · `SegundoCerebro.tsx` | NewPageForm, PageCard, GraphView, BasesPanel; Chip | C skeleton; V lista; S dados; E consulta não exposto na página. |
| `/segundo-cerebro/:pageId` | P · `SegundoCerebroPagina.tsx` | BlockEditor, CheckpointsPanel, tags/backlinks; Card/Button | V tags/backlinks; título `...` sem página; S dados; C/E/página inexistente não diferenciados na página. |
| `/biblioteca` | P · `Biblioteca.tsx` | Captura, filtro/tipo, grade, progresso; componentes do módulo | C skeleton; vazio delegado à grade; S dados; E consulta não exposto na página. |
| `/documentos` | P · `Documentos.tsx` | Upload, filtros/pastas, detalhe, versões, cofre/PIN, garantias | C SkeletonList; V arquivo/filtro/garantias; E PIN explícito; D upload/PIN; E consulta geral não exposto na página. |
| `/financas` | P · `Financas.tsx` | Saldos, transações, contas/cartões, recorrências e orçamento; painéis do módulo | C skeleton; estados adicionais delegados aos painéis; S dados; E consulta de transações não exposto na página. |
| `/vida-pessoal` | P · `VidaPessoal.tsx` | Planos, projetos, ideias e vida prática; ChipTabs e painéis do módulo | C SkeletonCards; V planos/projetos/ideias; S dados; E consultas principais não exposto na página. |
| `/perfil` | P · `Perfil.tsx` | Perfil, badges, resgate; Input/Button e campos de conta | C perfil/badges; E validação/salvar/resgatar; S perfil atualizado/resgate; D envio; estados de filhos não exaustivos. |
| `/gamificacao` | P · `Gamificacao.tsx` | Nível/XP, badges e progresso | C skeleton; S progresso/badges; E consulta não exposto na página; vazio depende da coleção de badges. |
| `/manager` | P + restrição dono · `Manager.tsx` | Visão geral, contas, códigos, configurações; ChipTabs/ConfirmDialog | C/V/E explícitos em consultas; D gerar código; perfil não dono recebe aviso; feedback de cada mutation não é uniforme. |
| `/seguranca` | P · `Seguranca.tsx` | Identidades, TOTP, passkeys, sessões, PIN, notificações | C por seção; E de várias ações; S PIN salvo/estado atualizado; D ações ocupadas; suporte indisponível previsto para notificações. |
| `/vex` | P · `Vex.tsx` | VexConversationView em página; mesmo motor do painel | V saudação/conversas; C “pensando”; confirmação/cancelamento; D Enviar; E operação sem tratamento recuperável geral. |
| `/mfa` | E, exige sessão · `Mfa.tsx` | Código TOTP e retorno ao login; AuthLayout, Skeleton, Notice | C fatores; E código; D incompleto/ocupado; S redireciona; sem sessão redireciona login. |
| `/login` | E · `Login.tsx` | Senha/passkey/OAuth → sessão → MFA quando ativo; AuthLayout | E Notice; D envio por método; S redireciona; verificação de e-mail alternativa; sessão em carregamento não tem estado próprio de página. |
| `/criar-conta` | E · `Registrar.tsx` | Identificação, telefone, senha/checklist → verificação e-mail | E Notice/checklist; D inválido/ocupado; S VerifyEmailNotice ou redirecionamento; validações presentes. |
| `/esqueci-senha` | E · `EsqueciSenha.tsx` | E-mail → solicitar recuperação | E Notice; D envio; S instrução de e-mail enviado; não testado envio real. |
| `/redefinir-senha` | E, sessão necessária para ação · `RedefinirSenha.tsx` | Nova senha/checklist; sem sessão mostra link inválido | E validação e link inválido; D envio; S redireciona após atualização; C inicial retorna null. |

Fontes complementares: `RequireAuth.tsx:19`; `Mfa.tsx:26`; `RedefinirSenha.tsx:23`; `Manager.tsx:48`; `EstudosCaderno.tsx:96`; `SegundoCerebroPagina.tsx:27`. Todas em `apps/qqorvex/src/pages`, exceto `packages/auth/src/RequireAuth.tsx`.

## Shell, sistema visual e componentes existentes

O shell usa sidebar a partir de `lg`, cabeçalho sticky, conteúdo com largura flexível e navegação inferior abaixo de `lg` (`ProtectedLayout.tsx:74`, `:82`; `MobileNav.tsx:17`). A barra expõe Hoje/Tarefas/Agenda/Vex/Mais; Mais reutiliza as seções da sidebar. O painel Vex é uma coluna de 372px no desktop e uma sobreposição integral abaixo de `lg` (`VexPanel.tsx:16`). A abertura da Vex em `/vex` navega para Hoje e abre o painel; a conversa é compartilhada pelo provider. Isso é comportamento existente a preservar ou discutir explicitamente.

Há base reutilizável real: Button e variantes, Input/Select/Textarea, Card, Badge, Modal/ConfirmDialog, ChipTabs, Notice, EmptyState, Skeleton e progressos. O Modal padrão move/restaura foco e contém Tab (`packages/ui/src/components/Modal.tsx:31`); MoreSheet implementa controle similar. A paleta e o painel Vex usam implementações distintas. Notice usa `role=status`; alguns formulários apresentam mensagens com simples `<p>`/`<span>`.

Tokens centralizam cores semânticas, fontes, raios e superfícies em `packages/design-system/src/tokens/tokens.css`. Fontes locais: Space Grotesk, Manrope e JetBrains Mono (`:87`). Texto base 15px (`:149`), campo base 14px (`:343`), rótulo 12px (`:375`), foco global (`:193`), redução de movimento (`:230`). As páginas também usam valores arbitrários de espaçamento, tamanho e mínimo de grade. Isso exige inventário posterior antes de consolidar escalas; não significa que todos esses valores estejam errados. `styles/global.css:12` inclui explicitamente packages/modules na detecção do Tailwind 4 e deve ser preservado.

Na autenticação renderizada, foco cyan ficou visível; amostras calculadas de contraste no login desktop foram 6,06:1 nos chips, 8,52:1 em texto secundário e 17,71:1 nos títulos. São amostras específicas, não auditoria integral de contraste ou conformidade.

## Três fluxos representativos

1. **Entrada/autenticação** — `Login.tsx:38` envia e-mail/senha pelo AuthProvider, apresenta erro e pode abrir VerifyEmailNotice. Com sessão, navega para Hoje; `RequireAuth.tsx:11` consulta nível de garantia e pode encaminhar a `/mfa`. `Mfa.tsx:59` verifica o código. O estado sem sessão de `/mfa` e o estado sem token de reset foram confirmados renderizados. Senha, OAuth, passkey, e-mail e MFA reais não foram executados. Preservar métodos, validações, retorno de foco e barreiras; revisar feedback sem trocar a política de autenticação.
2. **Lista → criação/edição → feedback** — `Tarefas.tsx:34` consulta tarefas/dependências; QuickCapture chama `mutate` e limpa o título; `modules/organizacao/tarefas/src/hooks/useTasks.ts:69` invalida a consulta no sucesso; Kanban/Lista alteram status e a lista oferece cancelamento/reativação e confirmação de exclusão. A edição representativa é de estado, não um editor completo de tarefa. Os filhos confirmam exclusão, mas não recebem erro da mutation nem estado pendente do pai. Não executar criação/exclusão para comprovar aparência.
3. **Contexto → Vex → confirmação** — Tarefas/Documentos definem CurrentItem; `VexConversationView.tsx:203` monta mensagens de contexto; `runVexTurn.ts:32` distingue consulta e ferramenta com confirmação. A UI mostra preview, Confirmar e Cancelar (`VexConversationView.tsx:305`); ao confirmar, executa ferramenta, invalida queries e adiciona resposta. Preservar essa separação e a conversa compartilhada. A efetividade do contexto em todos os providers exige verificação funcional separada; esta etapa não atesta a resposta da IA ou persistência no backend.

## Achados priorizados

### F01 · P1 · Captura pode perder o texto sem explicar falha

**Evidência — código:** `modules/organizacao/tarefas/src/components/QuickCapture.tsx:22` chama callback síncrono e limpa título na linha seguinte. `apps/qqorvex/src/pages/Tarefas.tsx:43` usa `createTask.mutate` sem passar erro/pendência ao filho. A página extrai somente dados/carregamento (`:34`); o hook retorna erro de consulta (`modules/organizacao/tarefas/src/hooks/useTasks.ts:61`). KanbanBoard/TaskListView não recebem esse erro. Metas também fecha o modal logo após mutate (`MetasHabitos.tsx:112`).

**Impacto:** uma falha pode parecer captura aceita ou coleção vazia; a pessoa precisa reconstruir a entrada. **Mobile/desktop:** mesma lacuna lógica; posição e visibilidade do feedback ainda não verificadas internamente. **Oportunidade:** contrato comum de pendência, sucesso e erro recuperável, mantendo rascunho até confirmação. **Critério:** falha simulada preserva texto e apresenta tentar novamente; sucesso adiciona uma única entidade; lista indisponível não vira “nenhuma tarefa”.

### F02 · P1 · Confirmação da Vex permite reentrada e não recupera exceção

**Evidência — código:** `VexConversationView.tsx:162` não bloqueia `isThinking`; botão Confirmar em `:312` não recebe disabled. As rotinas em `:123` e `:162` aguardam operações sem catch/finally; `runVexTurn.ts:65` aguarda `tool.execute`, que pode rejeitar.

**Impacto:** clique repetido pode solicitar ação mais de uma vez; falha pode deixar “pensando” sem recuperação. Ocorre na página e no painel. **Mobile/desktop:** controles compartilham a implementação; consequência não foi reproduzida com dados reais. **Oportunidade:** exclusão mútua na confirmação e feedback de execução/falha, preservando a confirmação explícita. **Critério:** duplo acionamento gera uma chamada; falha libera os controles e mantém informação suficiente para decidir se tenta novamente; nunca sugerir que falha no resumo significa que a ação foi revertida.

### F03 · P2 · Autenticação usa margem fixa que comprime telas estreitas

**Evidência — código e renderizado:** `AuthLayout.tsx:43` usa `p-12` em todas as larguras. Login em 320px: formulário 224px, OAuth 68×42px; em 390px: 294px; desktop: 392px. Cadastro em 320px: formulário 216px, CTA y775 e OAuth y867; em 390px altura total 998px. **Não houve overflow horizontal** nas medições públicas.

**Impacto:** menor área útil e mais rolagem, especialmente cadastro; isso não prova que toda rolagem seja inadequada. **Mobile:** margem tem custo proporcional alto. **Desktop:** campos de 392px e duas colunas do cadastro aproveitam contexto maior. **Oportunidade:** espaçamento adaptativo e hierarquia adequada a ambos sem comprimir o desktop. **Critério:** em 320/390, campos e ações mantêm leitura/uso confortável, sem rolagem horizontal; em 1440, agrupamento não perde clareza; validar com teclado virtual e zoom.

### F04 · P2 · Mostrar senha é excluído da navegação por Tab

**Evidência — código e renderizado:** `components/PasswordField.tsx:71` aplica `tabIndex={-1}`, seguido de `w-7 h-7`; Maestro mediu alvo 28×28 e observou Tab pular o botão no login.

**Impacto:** pessoa que usa só teclado não alcança uma ação disponível por ponteiro. **Mobile:** alvo pequeno merece revisão de ergonomia, sem concluir violação apenas por estar abaixo de 44px. **Desktop:** bloqueio por Tab confirmado. **Oportunidade:** acesso por teclado e área de acionamento confortável. **Critério:** Tab alcança, nome acessível reflete mostrar/ocultar, Enter/Espaço funcionam e foco permanece previsível; alvo touch avaliado com espaçamento real.

### F05 · P2 · Mínimos rígidos de grade e popover pedem validação estreita

**Evidência — código; consequência visual é hipótese:** Documentos `:193` usa minmax(340px); Gamificação `:69`, 330px; Metas `:57`, Segundo Cérebro `:78`, Perfil `:180` e Vida `:162`, 300px. Shell `ProtectedLayout.tsx:82` reserva 16px de cada lado abaixo de lg; a 320px sobram 288px. `AppHeader.tsx:79` fixa popover em 340px.

**Impacto provável:** conteúdo ou painel pode exceder área disponível; não houve captura das rotas protegidas. **Mobile:** verificar 320 e 390 com dados, skeleton e textos longos. **Desktop:** verificar 1024 com sidebar + Vex aberta e 1440; as colunas também reduzem espaço útil. **Oportunidade:** mínimos limitados pela largura disponível e overlays ancorados dentro da viewport. **Critério:** nenhuma ação/conteúdo essencial fora da viewport nem rolagem horizontal da página nas combinações testadas; rolagem local de tabela deliberada e identificável, quando necessária.

### F06 · P2 · Paleta declara modal, mas não contém Tab

**Evidência — código:** `CommandPalette.tsx:73` usa aria-modal; há foco inicial/restauração (`:53`), porém `onKeyDown` em `:84` só trata Escape/setas/Enter no input. Não há trap de Tab, inert do fundo ou handler de Escape global na paleta. Modal compartilhado já possui mecanismo de contenção.

**Impacto provável:** foco alcança o fundo enquanto overlay permanece; Escape pode deixar de agir ao sair do input. **Mobile/desktop:** mesmo comportamento com teclado físico; toque e leitor de tela ainda não verificados. **Oportunidade:** usar contrato coerente de modal e anúncio de seleção. **Critério:** Tab/Shift+Tab permanecem no diálogo, Escape funciona a partir de qualquer filho, retorno de foco correto e fundo não interativo enquanto modal.

### F07 · P2 · Erros e ajuda dos campos não são associados automaticamente

**Evidência — código:** `packages/ui/src/components/FormField.tsx:32` renderiza spans de erro/hint sem id; Input/Select/Textarea marcam aria-invalid (`:62`, `:88`, `:100`), mas não criam aria-describedby. Props extras permitem associação manual, portanto não se afirma que todo uso esteja sem associação.

**Impacto:** a explicação visual pode não ser lida quando o campo recebe foco. **Mobile/desktop:** mesma semântica; teste com leitor de tela em ambos permanece pendente. **Oportunidade:** contrato de campo com label, hint e erro associados e anúncio oportuno. **Critério:** árvore acessível do campo contém descrição atual, erro é comunicado sem repetição excessiva e nenhuma ajuda é descartada inadvertidamente.

### F08 · P2 · Hoje e notificações não modelam falha ou atualização contínua

**Evidência — código:** `modules/hoje/src/hooks/useHojeSummary.ts:13` só trata resolução e roda uma vez por mount (`:22`); `registry.ts:15` usa Promise.all. O cabeçalho monta outra instância (`AppHeader.tsx:22`). Não há catch, retry ou invalidation de Query nesse hook.

**Impacto:** falha em um provider pode manter carregamento; no cabeçalho, resumo inicial vazio pode aparecer como “Nada urgente”; atualizações posteriores podem não refletir enquanto o shell permanece montado. **Mobile/desktop:** mesmo dado, em pontos de entrada diferentes. **Oportunidade:** distinguir aguardando, indisponível, parcial e atualizado. **Critério:** falha de um módulo tem saída recuperável explícita; mudança relevante atualiza resumo e atenção sem recarregar toda a app. Mudanças de agregação/dados precisam de validação funcional separada do redesenho visual.

### F09 · P2 · Histórico da Vex depende de clique para selecionar conversa

**Evidência — código:** `VexConversationView.tsx:250` usa span com onClick; não há tabindex, papel de botão ou equivalente por teclado para selecionar. Renomear/Apagar são botões separados.

**Impacto:** teclado pode alcançar ações auxiliares sem conseguir abrir a conversa desejada. **Mobile/desktop:** mesma estrutura no painel/página; leitor de tela e gesto ainda não testados. **Oportunidade:** seleção semântica e estado ativo claro. **Critério:** toda conversa pode ser alcançada e aberta por Tab/Enter ou padrão equivalente corretamente implementado, mantendo ações auxiliares independentes.

### F10 · P2 · “Buscar” não explicita o escopo de navegação

**Evidência — código:** `AppHeader.tsx:59` mostra Buscar; `CommandPalette.tsx:34` contém somente destinos e comandos Vex, filtrados por rótulo, apesar de placeholder Buscar ou executar (`:96`).

**Impacto — hipótese de compreensão:** pessoa pode procurar tarefa/arquivo e interpretar nenhum resultado como ausência do conteúdo. Não há pesquisa com usuário confirmando essa expectativa. **Mobile/desktop:** mesmo texto; atalho Ctrl K é pista adicional no desktop. **Oportunidade:** explicitar escopo da paleta; não adicionar busca global como requisito implícito. **Critério:** texto e estado vazio deixam claro o que é pesquisável; teste de tarefa confirma que a pessoa escolhe o caminho adequado para localizar conteúdo.

### F11 · P2 · Texto de login generaliza proteção 2FA opcional

**Evidência — código e texto renderizado:** `Login.tsx:61` afirma “Sessão protegida por 2FA”; `RequireAuth.tsx:6` e condição `:22` aplicam segunda etapa quando ativada/pendente. Segurança permite estado TOTP inativo (`Seguranca.tsx:266`).

**Impacto:** comunicação pode sugerir uma garantia que não corresponde a toda conta. **Mobile/desktop:** frase está no formulário em ambos. O painel narrativo desktop desaparece abaixo de lg, mas o logo mobile continua (`AuthLayout.tsx:45`); isso é adaptação existente, não defeito por si só. **Oportunidade:** promessa compatível com estado real, evitando termos de infraestrutura sem benefício claro. **Critério:** nenhuma afirmação universal de 2FA para contas sem fator ativo; métodos disponíveis permanecem compreensíveis nas duas telas.

### F12 · P3 · Resumo Hoje sugere conclusão sem oferecer ação correspondente

**Evidência — código; interpretação é hipótese:** `Hoje.tsx:228` renderiza linha sem ação; `:232` adiciona quadrado com borda, aria-hidden. Não é checkbox funcional, e não deve ser descrito como checkbox quebrado. Rótulo de módulo fica hidden abaixo de sm (`:242`).

**Impacto provável:** pessoa pode tentar marcar ou abrir o item; no mobile perde também a indicação textual de origem. **Desktop:** rótulo de módulo permanece. **Oportunidade:** sinalização de resumo/encaminhamento inequívoca, sem introduzir conclusão de tarefas pelo Hoje sem decisão explícita. **Critério:** teste de compreensão identifica corretamente que ação está disponível; origem do item permanece recuperável no mobile e desktop.

## Observações complementares e preservação

- `/manager` não aparece em ROUTE_META (`PageMeta.tsx:14`), recaindo em Qqorvex (`:35`). É inconsistência localizada de orientação/título, sem prova de bloqueio. Incluir na consolidação de metadados das 22 rotas.
- RequireAuth retorna null enquanto sessão/MFA carrega (`:19`); detalhes de caderno/página não distinguem ausência e falha. Incluir casos no contrato de estados, sem afirmar que houve tela branca persistente renderizada.
- Vex em página usa composer sticky bottom-4 (`VexConversationView.tsx:428`), enquanto navegação mobile é fixed bottom-0. Interferência é hipótese a testar com teclado virtual, rolagem e safe area; o padding inferior do main já oferece reserva, portanto CSS isolado não prova sobreposição.
- MoreSheet mantém efeito enquanto isOpen mesmo se wrapper passa a lg:hidden (`MobileNav.tsx:61`, `:95`); validar mudança de viewport com menu aberto, sem classificar como defeito já renderizado.
- Preservar labels existentes, foco global, fontes locais, carregamento lazy, alternativas de mover tarefa sem arrastar, confirmação de exclusão, recuperação de senha, MFA/passkey e regras de autorização. Não transformar identidade visual pendente em escolha automática de tema.

## Backlog de preparação para redesign

1. **Contrato de operação/feedback:** F01/F02/F08 e lacunas da matriz. Definir visualmente pendente, sucesso, erro recuperável e preservação de rascunho; correções funcionais exigem testes de falha com mocks/ambiente próprio, sem mutations em conta real.
2. **Contrato de interação acessível:** F04/F06/F07/F09; padronizar foco, teclado, campos e overlays antes de multiplicar componentes.
3. **Layout adaptativo:** F03/F05 e hipóteses composer/MoreSheet. Validar pares 320/390 e 1024/1440; atravessar 768/1023 e lg; conteúdo curto/longo, zoom e teclado virtual.
4. **Arquitetura de informação e linguagem:** F10/F11/F12; alinhar rótulos, contexto, estados vazios e títulos sem inventar funcionalidades.
5. **Direção visual:** somente depois da decisão do usuário sobre identidade e aprovação do diagnóstico; aproveitar contratos/tokens existentes, revisar escalas e demonstrar equivalência mobile/desktop em protótipos.

## Evidência de navegador e limitações

Capturas públicas produzidas pelo Maestro:

- [Login desktop](C:/Users/Julio/.codex/visualizations/2026/09/20/01a0bf4a-60a3-7a12-be9f-5ffa2de9bd46/diagnostico/login-desktop.png)
- [Login mobile](C:/Users/Julio/.codex/visualizations/2026/09/20/01a0bf4a-60a3-7a12-be9f-5ffa2de9bd46/diagnostico/login-mobile.png)
- [Cadastro desktop](C:/Users/Julio/.codex/visualizations/2026/09/20/01a0bf4a-60a3-7a12-be9f-5ffa2de9bd46/diagnostico/cadastro-desktop.png)
- [Cadastro mobile](C:/Users/Julio/.codex/visualizations/2026/09/20/01a0bf4a-60a3-7a12-be9f-5ffa2de9bd46/diagnostico/cadastro-mobile.png)

Login/cadastro: 390×844 e 1440×900; medições adicionais a 320×800. Login em 768/1023 mantém painel narrativo oculto e formulário de 392px; em 1024 o painel aparece. Nenhum overflow horizontal nessas medições. Recuperação em 390: campo 294×43, CTA 294×44; reset sem token apresenta link inválido; MFA sem sessão retorna ao login. Console público sem avisos/erros observados. Ausência de erro de console não demonstra sucesso de integrações.

Linha de base técnica reportada pelo Maestro: **typecheck da aplicação aprovado e Vitest 87/87 testes aprovados em 9 arquivos**. Comandos executados: `.\apps\qqorvex\node_modules\.bin\tsc.CMD -p apps\qqorvex\tsconfig.json --noEmit` (sucesso sem saída) e `.\node_modules\.bin\vitest.CMD run`. O Executor não repetiu esses comandos. Esses resultados não equivalem a validação da interface nem demonstram ausência de regressão em fluxos não cobertos; antecedem qualquer implementação de redesign.

Rotas protegidas, dados vazios/longos, falhas de rede, mutações, conversas Vex e páginas de detalhe **não foram verificadas visualmente**. Não foram testados leitor de tela real, dispositivos físicos, teclado virtual, todas as combinações de zoom, outros navegadores, APK ou Tauri. Não há nota global, alegação de conformidade integral ou promessa de qualidade perfeita.
