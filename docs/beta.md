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

## Antes de liberar

1. **Endereço público do app.** Publique o build (`pnpm --filter qqorvex build`, pasta
   `apps/qqorvex/dist`) e, com o domínio definido:
   - atualize `app_base_url` em Central do Dono → Integrações → "URL pública do Qqorvex" (hoje aponta para `http://localhost:5173`;
     o retorno da conexão com o Google Agenda usa esse endereço);
   - no Supabase, Authentication → URL Configuration: Site URL e Redirect URLs com o domínio novo
     (login com GitHub/Google/Discord e links de e-mail);
   - no Cloudflare Turnstile, inclua o domínio na chave do site (`VITE_TURNSTILE_SITE_KEY`).
2. **Proteção de senhas vazadas.** Supabase → Authentication → Password Security → ligar
   "Leaked password protection" (o único alerta de segurança pendente do Supabase).
3. **Cobrança desligada no beta.** Deixe `VITE_BILLING_CHANNEL` sem valor: a página de assinatura mostra
   os planos, mas ninguém consegue pagar ainda (ver `docs/assinaturas.md` para ligar o Stripe depois).
4. **Acesso dos testers.** Duas opções na Central do Dono → Códigos:
   - código **Beta Tester** para cada pessoa (dá a insígnia, mantém os limites do Free);
   - uma campanha de **Parceiro** "Beta" com data de fim e um código por tester — acesso ilimitado
     durante o beta, que acaba sozinho na data (ou em "Encerrar agora").
   A pessoa ativa o código tocando 7 vezes seguidas na estrela do Qqorvex.
5. **Custo da Vex.** Cada conversa usa o Gemini e cada busca na internet usa a Tavily. As cotas
   mensais (Free: 50 conversas e 10 buscas; Parceiro/Lifetime: sem limite) protegem o orçamento —
   confira o uso nos painéis do Google AI Studio e da Tavily na primeira semana.

## Acompanhamento

- **Crons e notificações:** no SQL Editor,
  `select created, status_code, left(content, 200) from net._http_response order by created desc limit 20;`
  — tudo deve ser 200 (um 401 isolado de vez em quando é a corrida do segredo do cron, inofensivo).
- **Erros das funções:** Supabase → Edge Functions → Logs (`vex-chat` é a mais importante).
- **Uso da Vex por conta:** tabela `billing_usage_monthly`.
- **Alertas do banco:** Supabase → Advisors (segurança e desempenho) depois de cada migration.
