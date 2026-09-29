# Etapa 2 — matriz de rastreabilidade

Status: contrato de execução. As correções funcionais serão feitas somente nos ciclos da Etapa 3.

## Achados F01–F12

| Achado | Ciclo | Componente/padrão | Teste obrigatório | Evidência de preview |
|---|---:|---|---|---|
| F01 — captura perde texto em falha | 3 | QuickCapture, OperationStatus | falha preserva título; retry cria uma entidade; duplo envio não duplica | Hoje → captura rápida → estado erro recuperável |
| F02 — confirmação Vex permite reentrada | 4 | VexConfirmation, async action | duplo acionamento = uma chamada; exceção libera controles | painel Vex → proposta → pending/erro |
| F03 — auth comprimida por margem fixa | 1 | AuthLayout, FormField | 320/390 sem overflow; campos úteis; teclado virtual | Login 320, 390, 1023, 1024 e 1440 |
| F04 — mostrar senha fora do Tab | 1 | PasswordField, IconButton | Tab, Enter/Espaço, nome alterna, alvo 44×44 | Login, botão mostrar senha focável |
| F05 — mínimos rígidos | 0, 2, 5, 6 | grids, popover, container | 320–1920 sem overflow; texto longo; Vex aberta | Hoje e faixa de componentes em todas as larguras |
| F06 — paleta não contém foco | 2 | CommandPalette, Modal | Tab/Shift+Tab contidos; Escape global; retorno de foco | faixa de componentes documenta contrato; preview específico no ciclo 2 |
| F07 — ajuda/erro sem associação | 0, 1 | FormField, Input, Select, Textarea | `aria-describedby` compõe hint+erro; `aria-invalid` | Login e captura com descrição/erro anunciável |
| F08 — Hoje não modela falha/atualização | 3 | HojeSummary, Notice, Retry | parcial ≠ vazio; retry; invalidation atualiza resumo | Hoje mostra atenção e estado parcial na faixa |
| F09 — histórico Vex depende de clique | 4 | ConversationListItem | Tab + Enter selecionam; `aria-current`; ações separadas | Vex preview valida controles; histórico completo no ciclo 4 |
| F10 — Buscar não explica escopo | 2 | SearchTrigger, CommandPalette | nome e vazio dizem “páginas e comandos” | label do shell “Páginas e comandos” |
| F11 — promessa 2FA universal | 1 | AuthTrustCopy | texto reflete fator configurado; métodos preservados | Login usa “Verificação adicional quando ativada” |
| F12 — Hoje simula conclusão | 3 | TimelineRow, RouteNode | compreensão da ação; nó não parece checkbox | timeline usa círculo/losango/quadrado com legenda |

## Cobertura das 22 rotas

| Família | Rota | Padrão principal | Ciclo | Prova esperada |
|---|---|---|---:|---|
| Entrada | `/login` | duas colunas/formulário | 1 | 320, 390, 1024, 1440 |
| Entrada | `/criar-conta` | formulário longo/progresso | 1 | 320, 390, 1440 |
| Entrada | `/esqueci-senha` | recuperação/sucesso | 1 | mobile/desktop |
| Entrada | `/redefinir-senha` | token inválido/novo segredo | 1 | mobile/desktop |
| Entrada | `/mfa` | código/estado da conta | 1 | mobile/desktop |
| Shell | `/` | Hoje/timeline/atenção | 3 | 320, 390, 768, 1023/1024, 1440, 1920 |
| Organização | `/tarefas` | captura/lista/kanban | 3 | mobile/desktop + falha |
| Organização | `/agenda` | calendário/densidade | 3 | mobile/desktop |
| Organização | `/metas-habitos` | progresso/modal | 5 | mobile/desktop |
| Organização | `/gamificacao` | métricas/celebração | 5 | mobile/desktop |
| Conhecimento | `/estudos` | lista de cadernos | 5 | mobile/desktop |
| Conhecimento | `/estudos/:notebookId` | detalhe/conteúdo longo | 5 | mobile/desktop/not-found |
| Conhecimento | `/segundo-cerebro` | árvore/grafo/lista | 5 | mobile/desktop |
| Conhecimento | `/segundo-cerebro/:pageId` | editor/página | 5 | mobile/desktop/not-found |
| Conhecimento | `/biblioteca` | coleção/tabs | 5 | mobile/desktop |
| Gestão | `/documentos` | grid/filtros | 6 | 320/390/desktop |
| Gestão | `/financas` | dados/tabular | 6 | mobile/desktop |
| Pessoal | `/vida-pessoal` | dados sensíveis/PIN | 6 | mobile/desktop |
| Conta | `/perfil` | configurações/formulário | 6 | mobile/desktop |
| Conta | `/seguranca` | MFA/passkey/destrutivo | 6 | mobile/desktop |
| Gestão | `/manager` | permissão/metadado | 2, 6 | título correto + mobile/desktop |
| Vex | `/vex` | conversa/ação/histórico | 4 | mobile/desktop + todos os estados |

## Contrato de aceite transversal

Cada linha recebe evidência renderizada antes da aprovação: screenshots pareados, medidas de overflow e toque, contraste, navegação por teclado, árvore acessível e estados assíncronos. Browser não substitui Android físico, Tauri ou leitor de tela; essas validações permanecem no ciclo 7.
