# Qqorvex

App de gestão de vida pessoal com uma assistente de IA própria, a **Vex**. Tarefas, agenda,
metas e hábitos, estudos, notas (segundo cérebro), biblioteca, documentos, finanças e vida
pessoal num lugar só — e a Vex consultando e agindo em todos eles, sempre pedindo confirmação
antes de mudar qualquer dado. Interface em pt-BR.

## Stack

- **App:** React 19 + Vite 6 + Tailwind v4 + TanStack Query (`apps/qqorvex`)
- **Desktop/Android:** Tauri 2 (`src-tauri`), empacotando o mesmo frontend
- **Backend:** Supabase — Postgres com RLS, Auth, Storage, Edge Functions (Deno) e pg_cron
- **Monorepo:** pnpm 9 (`packageManager` no `package.json`)

## Como rodar

```bash
pnpm install
cp apps/qqorvex/.env.example apps/qqorvex/.env   # preencha as chaves (ver comentários no arquivo)
pnpm dev                                          # http://localhost:5173
```

A porta 5173 é a cadastrada nos redirecionamentos de OAuth do Supabase; o login com GitHub/Google
no ambiente local só volta para ela.

## Verificações

```bash
pnpm test          # Vitest (regras puras de todos os módulos)
pnpm typecheck     # TypeScript em todos os workspaces
pnpm build         # build de produção
pnpm audit:edge    # invariantes de segurança das Edge Functions (inclui a allow-list da Vex)
pnpm audit:native  # configuração do Tauri
```

O CI (`.github/workflows/ci.yml`) roda tudo isso em todo PR e push na `main`.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `apps/qqorvex` | o app: shell, páginas, Vex na interface, assinatura |
| `modules/<área>/<módulo>` | um módulo de domínio cada: `types` → `repository` (Supabase) → `service` (regras puras, testadas) → `hooks` (TanStack Query) → `components` |
| `packages/auth` | sessão, 2FA, PIN do Cofre, perfil |
| `packages/database` | cliente e tipos gerados do Supabase, busca global |
| `packages/ui`, `packages/design-system` | componentes e tokens visuais |
| `packages/vex` | ferramentas da Vex (uma por ação em cada módulo), personalidade e provedores de IA |
| `packages/notifications` | Web Push |
| `supabase/migrations` | schema versionado (o nome de cada arquivo é a versão aplicada no banco) |
| `supabase/functions` | Edge Functions: `vex-chat`, `vex-web-search`, cobrança Stripe, Google Agenda, Zoom, notificações |
| `brand-source` | artes originais da marca e da Vex (o app usa cópias otimizadas em `apps/qqorvex/public`) |
| `tools` | auditorias usadas no CI e scripts de apoio |

## Banco de dados

Mudanças de schema entram como nova migration em `supabase/migrations`, aplicada no projeto e com
o arquivo renomeado para a versão registrada pelo Supabase. Depois de aplicar, regenere os tipos
em `packages/database/src/types.ts`. Toda tabela tem RLS; funções `SECURITY DEFINER` usam
`search_path` vazio e só são liberadas para os papéis que precisam delas.

## Documentação

- [`docs/beta.md`](docs/beta.md) — checklist para liberar o beta e como acompanhar
- [`docs/deploy-cloudflare.md`](docs/deploy-cloudflare.md) — publicar o app e o site no Cloudflare Pages
- [`docs/assinaturas.md`](docs/assinaturas.md) — planos Free/Plus/Ilimitado e configuração do Stripe
- [`docs/vex-online-setup.md`](docs/vex-online-setup.md) — publicar a Vex (modelos, segredos, funções)
- [`docs/vex-behavior.md`](docs/vex-behavior.md) — onde e como a Vex aparece na interface
- [`docs/authentication-flows.md`](docs/authentication-flows.md) — fluxos de login, 2FA e recuperação
- [`docs/DESIGN.md`](docs/DESIGN.md) — linguagem visual
