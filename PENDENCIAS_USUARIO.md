# Pendências do usuário

## Proteção contra senhas vazadas — recurso pago do Supabase

### O que precisa ser feito

O Supabase Auth oferece proteção nativa contra senhas comprometidas, mas a documentação oficial
indica que esse recurso está disponível apenas no plano Pro ou superior:
https://supabase.com/docs/guides/auth/password-security

### Por que é necessário

O advisor de segurança do projeto reporta que a verificação contra senhas expostas está desativada.
Isso não é uma falha corrigível no código atual nem uma configuração disponível no plano gratuito.

### Onde fazer

Se o projeto for atualizado para o Pro no futuro: Supabase Dashboard → projeto `qqorvex` →
Authentication → Configuration → Password security → habilitar leaked password protection.

### Passo a passo

1. Abra o projeto `qqorvex` no Supabase Dashboard.
2. Entre em Authentication → Configuration.
3. Ative a proteção contra senhas vazadas/comprometidas, caso o plano permita.
4. Salve a configuração.

### O que já foi preparado pelo Codex

No plano atual, o fluxo de registro já valida os requisitos locais de senha e não expõe segredos no
frontend. A correção de acesso explícito à tabela `app_secrets` também já foi
aplicada e verificada no banco. Não foi adicionada uma integração improvisada com terceiros que
pudesse enviar ou expor a senha do usuário.

### Como validar depois

Se a configuração for ativada no futuro, rode novamente o Security Advisor e confirme que o aviso
`auth_leaked_password_protection` desapareceu. Enquanto o projeto permanecer no plano gratuito,
esse aviso deve ser tratado como uma limitação conhecida do provedor, sem custo obrigatório para
o Qqorvex.

## Instalação limpa das dependências — resolvida

Em 23/09/2026, `corepack pnpm install --frozen-lockfile` terminou com sucesso usando o
lockfile atual e `pnpm@9.15.9`. Em seguida, `corepack pnpm typecheck` passou nos 19 workspaces
com script e `corepack pnpm test` passou com 14 arquivos e 106 testes.

O modo offline ainda não é garantido quando um tarball não está no cache local; em um ambiente
sem acesso ao registry, é necessário fornecer esse cache previamente.

## Assinatura dos instaladores Desktop — pendência de distribuição

O build release Windows foi concluído e os hashes foram registrados em
`docs/release/web-desktop-acceptance.md`. A verificação `Authenticode` retornou `NotSigned` para
o executável, o MSI e o instalador NSIS. Isso não impede testes locais, mas uma distribuição
pública deve adicionar um certificado de assinatura de código para reduzir alertas do Windows.
Nenhum certificado pago foi contratado nesta fase.

## Cron secret — resolvido

O segredo compartilhado dos jobs de notificações e sincronização foi movido para o Supabase Vault
e rotacionado. Os jobs `send-notifications-every-5-min` e `sync-google-calendar-every-10-min`
continuam ativos e consultam o segredo em tempo de execução; o valor literal não fica mais em
`cron.job.command`.

## Reconciliação histórica e aprovação para otimização ampla das policies RLS

### Estado da reconciliação

As incompatibilidades funcionais encontradas nesta rodada foram corrigidas no remoto sem apagar
dados: tarefas e eventos recorrentes agora têm suas colunas/índice de ocorrência, e a gamificação
agora tem os contadores de conquistas e a tabela de progresso diário com RLS. A divergência histórica entre
as migrations locais e remotas ainda exige um inventário final para que uma instalação nova seja
reproduzível; não faça reset do banco para tentar resolver isso.

As FKs que o Performance Advisor apontava sem cobertura foram tratadas de forma aditiva pela
migration local `supabase/migrations/20260923000010_performance_fk_indexes.sql`, aplicada no
remoto como `performance_fk_indexes`. O advisor não reporta mais `unindexed_foreign_keys`.
Os índices ainda podem aparecer como não utilizados enquanto o projeto não tiver tráfego
representativo; não os remova antes de observar uso real.

### O que precisa ser feito

Aplicar a migration local `supabase/migrations/20260923000004_rls_auth_uid_initplan.sql`,
que normaliza o uso de `auth.uid()` nas 271 policies atuais para `(select auth.uid())`.

### Por que é necessário

O Performance Advisor reporta reavaliação por linha em todas essas policies. A alteração
é uma otimização recomendada, mas toca o isolamento de acesso de todas as tabelas e não
deve ser aplicada em produção sem revisão/backup e um plano de rollback.

### Onde fazer

Primeiro em um branch de desenvolvimento do Supabase; depois no projeto principal após
os testes de isolamento com pelo menos dois usuários.

### Passo a passo

1. Criar um branch de desenvolvimento do projeto.
2. Aplicar a migration `20260923000004_rls_auth_uid_initplan.sql` no branch.
3. Rodar testes de leitura/escrita com usuários diferentes em cada domínio.
4. Confirmar que usuário A não acessa dados do usuário B.
5. Só então aplicar no projeto principal.

O CLI Supabase `2.115.0` confirmou a diferença atual: 41 migrations locais e 62 remotas. A criação de
um branch de desenvolvimento para continuar a validação custa atualmente **US$ 0,01344 por hora**
na organização do projeto; nenhuma branch foi criada sem confirmação explícita.

### O que já foi preparado pelo Codex

A migration é idempotente e foi testada em transação de rollback contra o schema remoto.
O guardrail recusou a aplicação direta em produção por ser uma alteração ampla.

### Como validar depois

O Performance Advisor deve deixar de reportar `auth_rls_initplan`, sem surgimento de
falhas de RLS ou acesso cruzado entre contas.

## Validação real de browser e Android — Android adiado pelo usuário

O código já possui estados explícitos para falhas de sessão inicial, MFA, perfil e disponibilidade
de username, além de Error Boundary global. A Vex também já inclui STT do navegador sem TTS e a
permissão Android `RECORD_AUDIO` é adicionada automaticamente pelo build.

O bootstrap de autenticação agora tem timeout de 8 segundos e falha fechado, evitando que uma
indisponibilidade do Auth deixe as rotas públicas presas em `Carregando...`. O fallback global
também possui `main`, `h1` e status semântico. O preview foi validado com AccessLint no loading
e nas rotas públicas de autenticação, sem violações.

Ainda é necessária uma validação externa ao ambiente do Codex para o browser autenticado:

1. abrir as rotas em browser real nos viewports desktop e mobile;
2. exercitar JWT válido, cron secret, idempotência e isolamento RLS contra um projeto/branch de
   teste. O smoke sem autenticação já foi executado: as cinco funções protegidas retornaram
   `401` e o callback OAuth sem estado retornou `302`; o comando reproduzível é
   `corepack pnpm audit:edge:runtime` com `SUPABASE_FUNCTIONS_BASE_URL` definido.

A instalação do APK, a permissão de microfone e o reconhecimento `pt-BR` no Android/Tauri foram
explicitamente adiados pelo usuário. O APK debug continua disponível, mas essa validação física
não será considerada requisito desta rodada.

O segundo usuário foi criado e o teste de isolamento entre as duas contas já foi executado em
transações reversíveis. O usuário comum viu somente o próprio perfil e não acessou os badges,
gamificação ou domínios do Dono; o Dono manteve apenas a visibilidade administrativa prevista.
Uma tarefa temporária foi criada para a conta comum dentro da transação: ela foi visível para o
próprio usuário e invisível para o Dono, depois removida por `ROLLBACK`. Não há dado de teste
persistido.

Foi preparado o harness somente leitura `corepack pnpm audit:rls:two-user`. Ele recebe dois
access tokens curtos por `RLS_AUDIT_USER_A_TOKEN` e `RLS_AUDIT_USER_B_TOKEN`, verifica linhas
próprias e consultas cruzadas em 15 domínios, perfis e `app_secrets`, sem criar ou alterar dados.
O contrato equivalente já passou diretamente no banco com `SET LOCAL ROLE authenticated` e
`ROLLBACK`; o harness HTTP aguarda apenas os dois JWTs de sessão.

Essa pendência não indica erro de compilação: o typecheck recursivo, 106 testes Vitest e o build Vite passam.

## Auditoria de dependências npm

`corepack pnpm audit --prod` foi tentado, mas o ambiente bloqueou o POST de metadados da árvore
de dependências para o endpoint de advisories do npm. A tentativa de liberar esse egress foi
recusada pela política de segurança. Portanto, a auditoria de vulnerabilidades das dependências
continua não verificada; ela deve ser executada em um ambiente autorizado, sem alterar o projeto.

Enquanto o branch não é autorizado, já foi validado em transação reversível o contrato dos RPCs
administrativos: usuário sem perfil não recebe visão geral, contas nem metadados de segredos;
Dono recebe somente os resultados previstos. Isso não substitui o teste de isolamento entre dois
usuários reais.
