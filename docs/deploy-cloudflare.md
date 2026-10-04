# Publicação no Cloudflare Pages

Dois projetos do Cloudflare Pages, os dois ligados ao repositório `sCypher-me/Qqorvex`: a cada push na
`main` eles são publicados sozinhos, e cada PR ganha um endereço de prévia.

| Projeto | Endereço | Pasta |
| --- | --- | --- |
| `qqorvex` | https://qqorvex.pages.dev | site de apresentação (`apps/site`) |
| `qqorvex-app` | https://qqorvex-app.pages.dev | app web (`apps/qqorvex`) |

Com domínio próprio, depois, é só adicionar em cada projeto (Custom domains) — por exemplo
`qqorvex.com.br` no site e `app.qqorvex.com.br` no app — e repetir o passo 3 com o domínio novo.

## 1. Criar o projeto do app

Cloudflare → Workers & Pages → Create → Pages → Connect to Git → escolha `sCypher-me/Qqorvex`.

- **Project name:** `qqorvex-app`
- **Production branch:** `main`
- **Framework preset:** None
- **Build command:** `pnpm --filter qqorvex build`
- **Build output directory:** `apps/qqorvex/dist`
- **Root directory:** deixe vazio (raiz do repositório — o build precisa dos pacotes do monorepo)

Em **Environment variables** (Production e Preview):

| Variável | Valor |
| --- | --- |
| `NODE_VERSION` | `22` |
| `PNPM_VERSION` | `9.15.9` |
| `VITE_SUPABASE_URL` | `https://uowipikbumbaprckdvkg.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | a mesma do seu `apps/qqorvex/.env` |
| `VITE_TURNSTILE_SITE_KEY` | a mesma do `.env` |
| `VITE_VAPID_PUBLIC_KEY` | a mesma do `.env` |
| `VITE_GOOGLE_CLIENT_ID` | a mesma do `.env` (conexão com o Google Agenda) |
| `VITE_TMDB_API_KEY` | a mesma do `.env` (capas de filmes e séries) |

Não crie `VITE_BILLING_CHANNEL` durante o beta (cobrança desligada) nem `VITE_VEX_USE_OLLAMA`.
Todas essas variáveis são públicas por natureza (vão para o navegador); chaves secretas ficam só no
Supabase (`app_secrets`).

O Cloudflare instala as dependências sozinho (detecta o `pnpm-lock.yaml`). Rotas como
`/planejar/tarefas` funcionam direto: sem `404.html`, o Pages trata o projeto como SPA. Os
cabeçalhos de segurança e cache estão em `apps/qqorvex/public/_headers`.

## 2. Primeiro deploy

Salve e aguarde o build (uns 2–3 minutos). Abra https://qqorvex-app.pages.dev — a tela de login deve
aparecer. O login ainda não volta para lá até o passo 3.

## 3. Cadastrar o endereço nos serviços

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://qqorvex-app.pages.dev`
   - Redirect URLs (adicione, mantendo o localhost para desenvolvimento):
     - `https://qqorvex-app.pages.dev/**`
     - `https://*.qqorvex-app.pages.dev/**` (prévias dos PRs)
     - `http://localhost:5173/**`
2. **Central do Dono → Integrações → "URL pública do Qqorvex"** (`app_base_url`):
   `https://qqorvex-app.pages.dev` — é para onde o Google Agenda devolve a pessoa depois de conectar.
3. **Cloudflare → Turnstile →** o widget usado no login → Hostnames: adicione `qqorvex-app.pages.dev`
   (e `qqorvex.pages.dev`, que o formulário da lista de espera do site também usa).
4. **GitHub, Google e Discord (login social):** nada a mudar — o retorno desses provedores passa pelo
   Supabase (`https://uowipikbumbaprckdvkg.supabase.co/auth/v1/callback`), não pelo app.

## 4. Conferir

- Entrar com e-mail e senha (o captcha deve aparecer e passar).
- Entrar com GitHub e voltar logado.
- "Esqueci a senha" → o link do e-mail abre `qqorvex-app.pages.dev/redefinir-senha`.
- Abrir a Vex e mandar uma mensagem.
- Recarregar a página numa rota interna (ex.: `/planejar/agenda`) — deve abrir normalmente.

## 5. Site de apresentação e lista de espera

Mesmo caminho do passo 1, com outro projeto:

- **Project name:** `qqorvex`
- **Build command:** `pnpm --filter site build`
- **Build output directory:** `apps/site/dist`
- **Root directory:** vazio

| Variável | Valor |
| --- | --- |
| `NODE_VERSION` | `22` |
| `PNPM_VERSION` | `9.15.9` |
| `VITE_SUPABASE_URL` | `https://uowipikbumbaprckdvkg.supabase.co` |
| `VITE_TURNSTILE_SITE_KEY` | a mesma do app (o mesmo widget, com os dois hostnames do passo 3.3) |
| `VITE_APP_URL` | `https://qqorvex-app.pages.dev` (botão "Entrar") |

Sem `VITE_TURNSTILE_SITE_KEY` o formulário mostra "A lista de espera abre em breve". Para abrir a lista:

1. **Cloudflare → Turnstile →** o widget → copie a **Secret key**.
2. **Central do Dono → Integrações → Nova chave:** `turnstile_secret_key` com essa secret. Sem ela, a
   função `waitlist-join` recusa tudo com "A lista de espera ainda não está aberta.".
3. Opcional, só com domínio próprio: `site_base_url` com o endereço do site — a função já aceita
   `qqorvex.pages.dev`, suas prévias e `localhost:5180`.

As inscrições aparecem em **Manager → Lista de espera**: copie os e-mails pendentes ou exporte o CSV,
gere os códigos de convite e marque cada pessoa como convidada. A função confere o Turnstile no
servidor, limita 5 tentativas por hora por IP (guardado só como hash) e ignora robôs que preenchem o
campo-armadilha.

Para rodar localmente: `pnpm --filter site dev` (porta 5180). Com
`VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` em `apps/site/.env.local` (chave de teste da
Cloudflare, sempre aprova) o formulário funciona sem o widget real.
