# Checklist do beta

O que precisa estar certo antes de abrir o Qqorvex para os primeiros testers, e como acompanhar
depois. Itens marcados com ✅ já foram verificados em 03/10/2026.

## Já pronto

- ✅ Banco reconciliado: `supabase/migrations` é igual ao histórico aplicado; RLS em todas as tabelas,
  nenhum acesso sem login, gamificação e PIN do Cofre só pelo servidor.
- ✅ Edge Functions publicadas na versão atual (`vex-chat`, `vex-web-search`, `send-notifications`,
  `sync-google-calendar`, `google-oauth-callback`, `google-calendar-disconnect`, `create-zoom-meeting`).
- ✅ Crons rodando (`send-notifications` a cada 5 min, `sync-google-calendar` a cada 10 min, retenção
  do log de auditoria às 03:20).
- ✅ Segredos das integrações configurados (Gemini, Tavily, VAPID, Google, Zoom, cron).
- ✅ Todas as 20 telas abrem sem erro de console nem chamada falhando; a Vex testada de ponta a ponta
  (caderno → resumo → flashcards → quiz respondido com XP).
- ✅ Publicado no Cloudflare Pages (04/10/2026): app em https://qqorvex-app.pages.dev e site em
  https://qqorvex.pages.dev, ambos publicados a cada push na `main`. Endereço do app no Supabase Auth
  (Site URL e Redirect URLs) e no `app_base_url`; hostnames no Turnstile; lista de espera aberta
  (`turnstile_secret_key`) e testada com uma inscrição real.

## Antes de liberar

1. **Testar o login no endereço publicado.** Entrar com e-mail e senha e com GitHub em
   https://qqorvex-app.pages.dev, e conferir que o "Esqueci a senha" abre `/redefinir-senha` lá.
2. **Proteção de senhas vazadas (adiada).** Só existe nos planos pagos do Supabase; o projeto está no
   Free. Quando assinar o Pro: Authentication → Attack Protection → ligar "Leaked password
   protection" (é o único alerta de segurança pendente do Supabase).
3. **Cobrança desligada no beta.** Deixe `VITE_BILLING_CHANNEL` sem valor: a página de assinatura mostra
   os planos, mas ninguém consegue pagar ainda (ver `docs/assinaturas.md` para ligar o Stripe depois).
4. **Acesso dos testers.** Duas opções na Central do Dono → Códigos:
   - código **Beta Tester** para cada pessoa (dá a insígnia, mantém os limites do Free);
   - uma campanha de **Parceiro** "Beta" com data de fim e um código por tester — acesso ilimitado
     durante o beta, que acaba sozinho na data (ou em "Encerrar agora").
   A pessoa ativa o código tocando 7 vezes seguidas na estrela do Qqorvex. Quem veio pela lista de
   espera do site está em Manager → Lista de espera (copiar e-mails pendentes, marcar convidado).
5. **Custo da Vex.** Cada conversa usa o Gemini e cada busca na internet usa a Tavily. As cotas
   mensais (Free: 50 conversas e 10 buscas; Parceiro/Lifetime: sem limite) protegem o orçamento —
   confira o uso nos painéis do Google AI Studio e da Tavily na primeira semana.

## Acompanhamento

- **Crons e notificações:** no SQL Editor,
  `select created, status_code, left(content, 200) from net._http_response order by created desc limit 20;`
  — tudo deve ser 200. Um 401 do PostgREST ao ler `app_secrets` logo no início da função derrubava
  a rodada inteira; desde a 0.3.1 a leitura tenta de novo e, se o cofre continuar inacessível, a função
  responde 503 (falha de infraestrutura) em vez de 401 (segredo do cron incorreto).
- **Erros das funções:** Supabase → Edge Functions → Logs (`vex-chat` é a mais importante).
- **Uso da Vex por conta:** tabela `billing_usage_monthly`.
- **Alertas do banco:** Supabase → Advisors (segurança e desempenho) depois de cada migration.
