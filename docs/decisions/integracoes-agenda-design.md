# Integrações da Agenda (Zoom + Google Calendar) — design

Escopo definido com o usuário em 11/09/2026 (pendência "Google Calendar/Meet/Zoom" nunca tinha
sido detalhada antes — só existia a nota "depende de credenciais OAuth externas"). Duas peças
independentes, construídas em fases (mesmo padrão de Vida Pessoal): Fase 1 (Zoom) primeiro,
valida o padrão de segredo isolado com bem menos risco antes da Fase 2 (Google Calendar, maior).

## Fase 1 — Zoom (criar reunião com um clique)

**Decisão-chave**: como o Qqorvex é um app de uma pessoa só, o Zoom app é do tipo **Server-to-
Server OAuth** (Zoom Marketplace → App Types), não o fluxo de 3 pernas com redirecionamento e
tela de "Conectar conta". O usuário cria o app uma vez e entrega 3 valores (Account ID, Client
ID, Client Secret) — sem consentimento repetido, sem token por usuário pra gerenciar.

- **Segredos**: os 3 valores do Zoom entram em `app_secrets` (tabela já existente, RLS sem
  nenhuma policy pra anon/authenticated — só `service_role` lê, mesmo padrão das chaves VAPID e
  do segredo do cron).
- **Nova Edge Function `create-zoom-meeting`**: função de propósito único — só fala com a API do
  Zoom, não escreve no banco. Recebe `{ title, startAt, endAt }` do cliente autenticado (JWT
  normal do Supabase, `verify_jwt=true` — diferente de `send-notifications`, que usa segredo
  próprio porque é acionada pelo cron, não por um usuário logado). Internamente: troca as
  credenciais Server-to-Server por um token OAuth do Zoom (`POST
  https://zoom.us/oauth/token?grant_type=account_credentials`), cria a reunião (`POST
  /users/me/meetings`), retorna `{ joinUrl, startAt, endAt }` pro cliente.
- **Cliente**: um novo botão "Nova reunião Zoom" na Agenda pede só título + início/fim; ao
  confirmar, chama a Edge Function e, com a resposta, chama a função `createEvent()` que já
  existe em `@qqorvex/module-agenda` (passando `category: 'reuniao'`, `meeting_link: joinUrl`) —
  reaproveita toda a lógica de criação já existente (incluindo `findConflicts()`), a Edge Function
  não duplica nada disso. O formulário manual de Reunião (colar link à mão) continua existindo
  sem mudanças — o novo botão é uma alternativa, não substitui nada.
- **Erros**: se a chamada ao Zoom falhar (credencial inválida, rate limit, rede), a Edge Function
  retorna erro e o cliente mostra a mensagem sem criar o evento — nunca cria uma "reunião" com
  link quebrado ou ausente.
- **Teste**: a chamada real à API do Zoom só pode ser testada com as credenciais de verdade do
  usuário — diferente do resto da sessão, isso não dá pra simular sozinho. Fica pro usuário
  fornecer os 3 valores do Zoom quando o app estiver criado, para o teste ponta a ponta final.

## Fase 2 — Google Calendar (sincronização completa)

Decisões já fechadas com o usuário nesta rodada de brainstorming:
- Sincronização **bidirecional completa** (criar/editar/apagar em qualquer lado reflete no outro).
- Mecanismo: **polling periódico** via Edge Function + `pg_cron` (reaproveita a infraestrutura já
  existente de `send-notifications`), não webhooks do Google (evita gerenciar renovação de canal
  a cada 7 dias). Usuário aceitou que não seja instantâneo.
- Conflito (evento editado nos dois lados entre uma sincronização e outra): **quem editou por
  último vence** (compara timestamp de atualização dos dois lados), sem tela de resolução manual.
- Escopo de eventos: **todos** os eventos da Agenda sincronizam, não só um subconjunto.
- Calendário de destino: um **calendário dedicado "Qqorvex"** dentro da conta Google do usuário
  (criado automaticamente na primeira conexão), não o calendário pessoal principal — evita
  misturar com compromissos que o usuário já organiza direto no Google.

### Esquema

- `events` ganha `google_event_id` (texto, opcional) e `google_updated_at` (timestamptz,
  opcional) — relação 1:1, mesmo espírito de `task_id`/`document_id` já usados em outras tabelas
  (sem tabela de mapeamento separada).
- **`google_calendar_connections`** (nova): `user_id` (único, RLS por dono), `refresh_token`,
  `google_calendar_id` (o calendário dedicado "Qqorvex" criado na primeira conexão),
  `last_synced_at`.
- **`pending_google_deletions`** (nova): `google_event_id`, `user_id`. `deleteEvent()` insere
  aqui só quando o evento apagado já tinha `google_event_id` (ou seja, já estava sincronizado) —
  não muda o comportamento de exclusão da Agenda que já existe (continua exclusão física direta),
  só adiciona esse efeito colateral pequeno pra permitir que a exclusão propague pro Google depois
  que a linha já não existe mais.

### Fluxo de conexão (OAuth de 3 pernas — diferente do Zoom, contas Google pessoais não têm
equivalente ao Server-to-Server)

1. Botão "Conectar Google Calendar" em `/seguranca` (mesma seção de conta que já tem Perfil/2FA/
   Passkeys/Notificações) monta a URL de consentimento do Google (`client_id` público via
   `VITE_GOOGLE_CLIENT_ID`, `scope=.../auth/calendar`, `access_type=offline`, `prompt=consent` —
   necessários pra garantir que o Google devolva um `refresh_token`) e redireciona.
2. Google redireciona de volta pra uma Edge Function pública `google-oauth-callback`
   (`verify_jwt=false`, igual a `send-notifications` — mas aqui porque quem chama é o Google via
   redirecionamento do navegador, sem JWT nenhum; a segurança vem de um `state` assinado
   (HMAC com segredo em `app_secrets`) que carrega o `user_id`, pra ninguém conseguir forjar essa
   chamada).
3. A função troca o código pelo `refresh_token` (`POST oauth2.googleapis.com/token`, usando o
   Client Secret — nunca sai do servidor), cria o calendário dedicado "Qqorvex"
   (`POST /calendars`), guarda tudo em `google_calendar_connections` e redireciona de volta pro
   app.
4. "Desconectar" só apaga essa linha — nunca apaga nada que já foi sincronizado nos dois lados.

### Algoritmo de sincronização (Edge Function nova `sync-google-calendar`, `pg_cron` a cada 10 min,
mesmo padrão de segredo próprio de `send-notifications`)

Para cada usuário conectado: (1) renova o `access_token` via `refresh_token`; (2) processa
`pending_google_deletions` — apaga no Google o que foi apagado no Qqorvex, remove a linha; (3)
busca eventos do Google mudados desde `last_synced_at` (`updatedMin`, `showDeleted=true`) — evento
cancelado com `google_event_id` conhecido apaga no Qqorvex; evento sem `google_event_id`
correspondente cria no Qqorvex; evento existente compara `google_updated_at` salvo vs. o `updated`
novo do Google e vs. `events.updated_at` do Qqorvex, aplicando "quem editou por último vence"; (4)
busca eventos do Qqorvex mudados desde `last_synced_at` — sem `google_event_id` cria no Google;
com `google_event_id` e mais recente que o `google_updated_at` salvo, atualiza no Google; (5)
atualiza `last_synced_at`.

### O que o usuário precisa fazer no Google Cloud Console

1. Criar um projeto no Google Cloud Console e ativar a "Google Calendar API".
2. Configurar a tela de consentimento OAuth em modo **Testing** (suficiente pra uso pessoal —
   evita a revisão do Google exigida pra apps "Production" com escopos sensíveis).
3. Criar uma credencial OAuth Client ID do tipo "Web application", com Authorized redirect URI
   apontando pra URL da Edge Function `google-oauth-callback` (fornecida quando a função estiver
   implantada).
4. Fornecer o Client ID (não é segredo, entra em `VITE_GOOGLE_CLIENT_ID`) e o Client Secret (vai
   pra `app_secrets`, nunca exposto ao cliente).
