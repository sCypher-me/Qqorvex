# Cargos vinculados do Discord

A pessoa conecta o Discord em **Configurações → Conexões → Integrações** e o servidor do Qqorvex dá
sozinho os cargos que combinam com a conta: 🧪 Beta Tester, ✨ Plus, 💎 Amigo Lifetime e 🤝 Parceiro.
Quando o plano muda, os cargos acompanham (sincronização de hora em hora).

## Como funciona

1. O app chama `discord-link` (`action: "start"`), que cria um `state` de uso único em
   `discord_oauth_states` e devolve a URL de autorização do Discord (escopos `identify role_connections.write`).
2. O Discord redireciona para `discord-link-callback`, que consome o `state` (expira em 10 min), troca o
   código pelos tokens, calcula os metadados com `discord_role_metadata(user_id)` e os envia ao Discord.
3. `discord-roles-sync` (pg_cron, minuto 15 de cada hora) renova tokens, recalcula os metadados e só
   chama o Discord quando algo mudou (ou uma vez por dia). Conexões revogadas no Discord são removidas.
4. Desconectar (`action: "disconnect"`) zera os metadados, revoga o token e apaga a conexão.

Os tokens ficam em `discord_connections`, sem acesso pelo cliente (mesma proteção do Google Agenda).
O app só lê `get_my_discord_connection()`: nome no Discord, cargos e última sincronização.

## Regras dos cargos (`discord_role_metadata`)

| Metadado | Regra (mesma de `get_my_access`) |
|---|---|
| `beta_tester` | `profiles.is_beta_tester` ou insígnia `beta_tester` (Lifetime já concede) |
| `plus` | assinatura Plus ativa (`billing_subscriptions`) |
| `lifetime` | `profiles.account_tier = 'lifetime'` |
| `parceiro` | `account_tier = 'parceiro'` com campanha ainda ativa |

## Configuração

**Discord Developer Portal** (aplicativo da Vex, ID `1557070162304442398`):
- OAuth2 → Redirects: `https://uowipikbumbaprckdvkg.supabase.co/functions/v1/discord-link-callback`
- General Information → Linked Roles Verification URL:
  `https://qqorvex-app.pages.dev/configuracoes/conexoes?discord=conectar`
- Metadados registrados pela API (`PUT /applications/{id}/role-connections/metadata`): `beta_tester`,
  `plus`, `lifetime`, `parceiro`, todos booleanos.

**Central do Dono → Integrações** (`app_secrets`): `discord_client_id` e `discord_client_secret`
(OAuth2 → Client Secret no portal).

**Servidor do Discord:** em Configurações do servidor → Cargos → (cargo) → **Links**, adicione o requisito
do aplicativo para cada cargo: Beta Tester → `beta_tester`, Plus → `plus`, Amigo Lifetime → `lifetime`,
Parceiro → `parceiro`.
