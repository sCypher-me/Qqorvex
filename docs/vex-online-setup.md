# Vex online — configuração e publicação

## O que foi integrado

A Vex agora usa um registro único de ferramentas para todos os pontos de entrada autenticados:

- Tarefas, Agenda, Metas & Hábitos, Estudos, Segundo Cérebro, Biblioteca, Documentos e Finanças.
- Vida Pessoal: resumo, histórico de check-ins, planos, projetos, ideias e lista de compras.
- Gamificação: nível, XP, título, conquistas e desafios do dia.
- Perfil: leitura e alteração dos campos editáveis, sempre com confirmação.
- Busca atual na internet via Tavily.

O painel lateral e a rota /vex usam a mesma conversa, o mesmo contexto e o mesmo conjunto de ferramentas. A tela atual também é enviada como contexto, então a Vex entende em qual módulo a pessoa está.

Senha, e-mail de autenticação, 2FA, sessões, código de resgate, plano da conta e controles do Manager continuam fora das ferramentas da Vex por segurança. Essas ações devem ser feitas nas telas Segurança, Perfil ou Manager.

## 1. Criar as chaves

Crie uma chave gratuita no Google AI Studio para o Gemini:

https://aistudio.google.com/app/apikey

Para busca atual na internet, crie também uma chave na Tavily:

https://app.tavily.com

Não coloque nenhuma dessas chaves em apps/qqorvex/.env, em variáveis VITE_*, no Git ou no código do navegador.

## 2. Guardar as chaves no Supabase

Abra o SQL Editor do projeto qqorvex e execute o SQL abaixo, substituindo apenas os valores entre aspas:

```sql
insert into public.app_secrets (key, value)
values
  ('gemini_api_key', 'COLE_A_CHAVE_DO_GEMINI_AQUI'),
  ('gemini_model', 'gemini-flash-latest'),
  ('tavily_api_key', 'COLE_A_CHAVE_DA_TAVILY_AQUI')
on conflict (key) do update
set value = excluded.value, updated_at = now();
```

gemini_api_key é o único valor obrigatório para conversa online. tavily_api_key é necessária apenas quando a Vex precisar pesquisar na internet.

## 3. Publicar as Edge Functions

Instale ou use o CLI pelo npx, faça login e vincule o projeto:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref uowipikbumbaprckdvkg
```

A partir da raiz do Qqorvex, publique as duas funções:

```bash
npx supabase@latest functions deploy vex-chat
npx supabase@latest functions deploy vex-web-search
```

Não use --no-verify-jwt. As funções aceitam somente chamadas com sessão autenticada.

Os arquivos publicados são:

- supabase/functions/vex-chat/index.ts
- supabase/functions/vex-web-search/index.ts
- supabase/functions/_shared/billing.ts (cotas mensais) e supabase/functions/_shared/vexGuide.ts

O `vexGuide.ts` é a instrução confiável da Vex: personalidade, regras e o mapa de todas as seções do
app (o que tem em cada uma, como adicionar cada coisa e qual ferramenta usar). Sempre que uma tela,
botão ou ferramenta mudar, atualize esse arquivo e publique `vex-chat` de novo. Ferramentas novas
também precisam entrar em `ALLOWED_TOOL_NAMES` (o `pnpm audit:edge` acusa se faltar).

## 4. Configurar o frontend

No ambiente local, copie .env.example e preencha:

```env
VITE_SUPABASE_URL=https://uowipikbumbaprckdvkg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel
VITE_TMDB_API_KEY=sua_chave_tmdb
VITE_VEX_USE_OLLAMA=false
```

O Gemini e a Tavily não entram no .env do frontend. O navegador chama o Supabase com a sessão do usuário; as Edge Functions leem as chaves pelo service_role no servidor.

VITE_VEX_USE_OLLAMA=true só deve ser usado em desenvolvimento local, caso você queira testar um Ollama instalado na própria máquina. Em produção, mantenha false ou remova a variável.

## 5. Publicar o app web

Use o comando de build:

```bash
corepack pnpm install
corepack pnpm build
```

No provedor de hospedagem, configure as mesmas variáveis públicas do frontend (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e, se necessário, VITE_TMDB_API_KEY) e use:

- Build command: corepack pnpm build
- Diretório publicado: apps/qqorvex/dist

O frontend pode ser hospedado em Vercel, Netlify, Cloudflare Pages ou outro serviço estático. A IA continua no Supabase, portanto o navegador do usuário não precisa de Ollama.

## 6. Testar

Depois do deploy:

1. Entre no app com uma conta real.
2. Abra a Vex pelo painel lateral ou por /vex.
3. Teste uma consulta: qual é o meu nível e XP?
4. Teste uma consulta de módulo: resuma minha vida pessoal.
5. Teste uma ação: crie uma ideia chamada ...; a Vex deve mostrar a confirmação antes de persistir.
6. Teste a busca: o que aconteceu hoje nas notícias?

Smoke test sem sessão, que deve retornar 401:

```powershell
$env:SUPABASE_URL="https://uowipikbumbaprckdvkg.supabase.co"
corepack pnpm audit:edge:runtime
```

Validações locais do código:

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit:edge
```

## Problemas comuns

### “gemini_api_key não configurada”

A chave não foi inserida em public.app_secrets, ou foi inserida com outro nome. Confira o SQL Editor usando apenas:

```sql
select key, length(value) as tamanho
from public.app_secrets
where key in ('gemini_api_key', 'gemini_model', 'tavily_api_key');
```

Nunca selecione ou compartilhe a coluna value.

### A Vex só entende comandos diretos

O frontend caiu no EchoProvider, que é o fallback sem IA. Verifique se vex-chat foi publicado e se gemini_api_key existe.

### A busca na internet falha

Confira tavily_api_key, publique vex-web-search e confirme que a pergunta realmente depende de informação atual.

### Ação criada não aparece na tela

A Vex invalida as consultas do app depois da confirmação. Se a página estiver aberta há muito tempo, faça um recarregamento normal e confira se a sessão Supabase ainda está válida.

## Regras de segurança mantidas

- JWT do usuário é obrigatório nas Edge Functions.
- Chaves privadas ficam somente em app_secrets.
- Ferramentas persistentes sempre pedem confirmação na interface.
- Argumentos de tools são validados antes da execução.
- Documentos do Cofre continuam protegidos pelo PIN.
- RLS do Supabase continua sendo a barreira final de isolamento entre usuários.
