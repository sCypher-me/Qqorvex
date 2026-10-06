<div align="center">

# Qqorvex

**Organização de verdade para a vida que acontece.**

Eu estou construindo o Qqorvex para reunir planejamento, estudos, documentos, finanças e vida pessoal em um só lugar — com a Vex ajudando a transformar pedidos em ações que eu posso revisar e confirmar.

[Conheça o projeto](https://qqorvex.pages.dev) · [Abrir o app](https://qqorvex-app.pages.dev) · [Versões e downloads](https://github.com/sCypher-me/Qqorvex/releases) · [Changelog](CHANGELOG.md)

![CI](https://github.com/sCypher-me/Qqorvex/actions/workflows/ci.yml/badge.svg?branch=main)
![Versão beta](https://img.shields.io/badge/beta-0.2.0-D6A04D)
![Idioma](https://img.shields.io/badge/idioma-pt--BR-2C9C7A)

</div>

---

## O que é o Qqorvex

O Qqorvex é meu app de organização pessoal, feito para que eu não precise espalhar tarefas, ideias, estudos e informações importantes por um monte de ferramentas diferentes. Estou desenvolvendo o produto em português, para desktop, web e Android.

A Vex é a assistente do app. Ela conhece os módulos do Qqorvex, pode ajudar a organizar informações e preparar ações com contexto. Quando uma ação altera meus dados, a interface mostra o que será feito e pede minha confirmação antes de executar.

O projeto está em beta. Algumas integrações dependem de configuração externa, podem ter limites e podem mudar enquanto eu testo o produto.

## O que já estou construindo

| Área | O que encontro nela |
| --- | --- |
| **Hoje e planejamento** | Visão do dia, tarefas, agenda, metas, hábitos e check-ins. |
| **Estudos e conhecimento** | Cadernos, resumos, flashcards, avaliações, biblioteca e notas conectadas. |
| **Documentos** | Arquivos, organização, datas importantes e Cofre protegido. |
| **Finanças** | Contas, cartões, movimentações, orçamento e acompanhamento informativo de ações, FIIs e cripto. |
| **Vida pessoal** | Espaço para cuidar de planos, ideias e informações pessoais. |
| **Conquistas** | Níveis, badges e temas, sem apagar progresso por deixar de usar o app. |
| **Vex** | Ajuda com o conteúdo dos módulos e prepara ações para eu revisar e confirmar. |
| **Discord** | Vinculação opcional de cargos conforme benefícios como Beta Tester, Plus, Lifetime e Parceiro. |

As cotações são informativas e podem atrasar ou falhar. O Qqorvex não executa investimentos nem substitui uma fonte financeira profissional.

## O que eu priorizo

- **Eu continuo no controle.** A Vex mostra uma proposta antes de criar, alterar ou apagar dados.
- **Meus dados têm dono.** O acesso às informações da conta é limitado no banco por políticas de segurança; operações administrativas e códigos são validados no servidor.
- **O app deve ser acolhedor.** Gamificação serve para motivar, não para punir quando eu faço uma pausa.
- **O beta precisa ser transparente.** Integrações, limites e recursos experimentais podem mudar, e as telas devem deixar isso claro.

A Vex pode errar ou não ter informação atualizada. Eu confiro respostas importantes e uso fontes confiáveis para decisões de saúde, direito e finanças.

## Beta e acesso

O beta é distribuído por convite. Baixar o APK não libera uma conta automaticamente; o acesso continua sujeito ao convite ou código emitido pelo Qqorvex. A página do projeto e a tela de acesso mostram o fluxo disponível.

O APK Android desta fase é destinado ao **Android 14 ou superior**. Para instalar, baixe a versão adequada ao aparelho na [página de releases](https://github.com/sCypher-me/Qqorvex/releases) ou pelo [site do Qqorvex](https://qqorvex.pages.dev). Os APKs são assinados para que versões futuras possam atualizar a mesma instalação. Confira o SHA-256 publicado junto com cada release se quiser validar o arquivo.

## Tecnologias

- **Interface:** React 19, TypeScript, Vite 6, Tailwind CSS 4 e TanStack Query.
- **Aplicativo nativo:** Tauri 2 para desktop e Android.
- **Servidor:** Supabase Auth, PostgreSQL com RLS, Storage e Edge Functions em Deno.
- **Organização do código:** pnpm workspaces em um monorepo.
- **Publicação web:** Cloudflare Pages.

## Rodar localmente

### Requisitos

- Node.js 22 ou superior.
- Corepack e pnpm 9.15.9.
- Para compilar o app nativo: Rust, JDK 21 e Android SDK/NDK configurados.

### Instalação

```bash
corepack pnpm install --frozen-lockfile
cp apps/qqorvex/.env.example apps/qqorvex/.env
```

Preencha somente as variáveis necessárias para os serviços que você habilitar. A porta web local é `5173` e a do site é `5180`; esses endereços aparecem nos fluxos de retorno OAuth de desenvolvimento.

```bash
corepack pnpm dev
corepack pnpm --filter site dev
```

Nunca publique arquivos `.env`, tokens OAuth, chaves de provedor, credenciais de assinatura ou segredos do Supabase. Segredos de servidor devem ficar no Supabase, e não em variáveis `VITE_*`.

## Verificações

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit:edge
corepack pnpm audit:edge:runtime
corepack pnpm audit:native
```

A suíte Vitest cobre regras dos módulos, fluxos de autenticação, Vex, finanças, estudos, documentos, convites e gamificação. O CI executa testes, tipos, builds e auditorias estáticas em pull requests e na branch principal. `audit:edge:runtime` chama endpoints reais sem autenticação para conferir que funções protegidas negam a requisição.

A auditoria de isolamento entre duas contas é somente leitura e precisa de dois tokens de teste temporários:

```bash
RLS_AUDIT_USER_A_TOKEN=... RLS_AUDIT_USER_B_TOKEN=... corepack pnpm audit:rls:two-user
```

## Dados e migrations

O schema do Supabase é versionado em [`supabase/migrations`](supabase/migrations). Quando eu adiciono uma tabela exposta pela API, habilito RLS e concedo apenas as permissões necessárias. Funções `SECURITY DEFINER` usam um `search_path` controlado e verificam a identidade e a autorização no servidor.

As variáveis públicas do navegador ficam em `VITE_*`; segredos e chaves privadas ficam no Supabase. Os Termos de Uso e o aceite versionado estão descritos em [`docs/termos-e-aceitacao.md`](docs/termos-e-aceitacao.md) e disponíveis no app em `/termos`.

## Versões e changelog

Eu sigo `MAJOR.MINOR.PATCH`:

- **Mudança pequena:** `1.0.0` → `1.1.0`.
- **Nova versão principal:** `1.1.0` → `2.0.0`.
- **Correção pontual:** `1.1.0` → `1.1.1`.

Assim, uma melhoria pequena não vira uma versão principal. O histórico de cada lançamento fica em [`CHANGELOG.md`](CHANGELOG.md), e os APKs e respectivos hashes ficam nas [releases do GitHub](https://github.com/sCypher-me/Qqorvex/releases).

## Estrutura do projeto

| Caminho | Conteúdo |
| --- | --- |
| `apps/qqorvex` | Aplicativo web, shell, autenticação, Vex e configurações. |
| `apps/site` | Site de apresentação e lista de espera. |
| `modules` | Módulos de tarefas, agenda, estudos, documentos, finanças e organização pessoal. |
| `packages/auth` | Sessão, OAuth, segurança, 2FA e dados do perfil. |
| `packages/vex` | Personalidade, contexto, ferramentas e regras de segurança da Vex. |
| `packages/ui`, `packages/design-system` | Componentes e tokens de interface. |
| `packages/database` | Cliente Supabase, tipos e utilitários do banco. |
| `supabase` | Migrations, Edge Functions e configuração do backend. |
| `tools` | Auditorias e scripts de verificação. |

## Documentação

- [Checklist do beta](docs/beta.md)
- [Publicação no Cloudflare Pages](docs/deploy-cloudflare.md)
- [Geração e publicação do APK](docs/android-apk.md)
- [Fluxos de autenticação](docs/authentication-flows.md)
- [Cargos vinculados do Discord](docs/discord-cargos-vinculados.md)
- [Termos de Uso e registro de aceite](docs/termos-e-aceitacao.md)
- [Configuração online da Vex](docs/vex-online-setup.md)
- [Comportamento da Vex no app](docs/vex-behavior.md)
- [Planos e benefícios](docs/assinaturas.md)
- [Linguagem visual](docs/DESIGN.md)

---

**Qqorvex é um projeto em construção.** Eu agradeço cada teste, cada relato honesto e cada ideia que ajude a deixar o app mais útil, claro e confiável.
