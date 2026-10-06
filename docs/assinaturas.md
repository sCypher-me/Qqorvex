# Planos: Free, Plus e acesso Ilimitado

## Valores e limites definidos

| Recurso | Free | Plus |
| --- | ---: | ---: |
| Metas ativas | 5 | Ilimitadas |
| Hábitos ativos | 10 | Ilimitados |
| Cadernos não arquivados | 5 | Ilimitados |
| Mapas mentais ativos | 5 | Ilimitados |
| Interações de texto com a Vex/mês | 50 | 300 |
| Buscas web da Vex/mês | 10 | 60 |
| Armazenamento de documentos por conta | 25 MB | 100 MB |
| Tamanho máximo por arquivo | 10 MB | 50 MB |
| Preço | Grátis | R$ 19,90/mês ou R$ 214,90/ano |

Todos os módulos continuam acessíveis no Free. O período anual custa R$ 23,90 menos que doze cobranças mensais (10% de desconto, arredondado). A Vex é uma assistente de texto; uma mensagem pode consumir mais de uma chamada se ela precisar executar uma ação, e a busca na internet é contabilizada à parte. O período de uso reinicia no primeiro dia do mês em `America/Sao_Paulo`.

O armazenamento é implementado no bucket privado `documents` do Supabase Storage, com acesso restrito por usuário. A cota individual inclui arquivos atuais, versões históricas e itens na lixeira, pois todos continuam ocupando espaço até serem removidos fisicamente. Além da cota individual, o plano do Supabase impõe uma cota global compartilhada pelo projeto; ela precisa ser monitorada e ampliada quando o uso crescer.

## Acesso Ilimitado (Lifetime, Parceiro e Dono)

Acima do Plus, sem nenhuma cota: metas, hábitos, cadernos, mapas, Vex, buscas e armazenamento por conta (o tamanho de cada arquivo continua limitado a 50 MB pelo bucket). Também libera tudo que o Plus libera. Quem decide é `has_unlimited_access()` no banco, e o app lê o nível por `get_my_access()`.

- **Lifetime:** para sempre. Não está à venda — só nasce de um código gerado pelo Dono em Central do Dono → Códigos. Ao ativar, a pessoa ganha as insígnias Amigo Lifetime e Beta Tester automaticamente.
- **Parceiro:** ilimitado enquanto a campanha durar. Crie a campanha (nome e data de fim) em Central do Dono → Códigos → Campanhas de Parceiro e gere os códigos dentro dela. Estender a data ou "Encerrar agora" vale para todos os parceiros da campanha; ao terminar, a conta volta ao plano que tinha, sem perder nada.
- **Beta Tester:** o mesmo fluxo de código concede a insígnia de Beta Tester (sem mudar o plano).
- **Como a pessoa ativa:** tocando 7 vezes seguidas, rápido, na estrela do Qqorvex (menu lateral no computador, barra do topo no celular). O código vale uma vez; 5 tentativas erradas em 15 minutos bloqueiam novas por um tempo.

Downgrade não apaga registros. Leitura, organização e exportação continuam disponíveis; novas criações e novos arquivos/versões que ultrapassem a cota Free são impedidos. A tabela de assinatura é separada de `profiles.account_tier`, que continua representando privilégios administrativos, parceiro, VIP ou Lifetime.

## Estado atual da configuração

- Os limites e a cota de documentos estão aplicados no Supabase (migrations `plus_subscriptions`, `owner_plus_entitlement` e `secret_access_codes`).
- O canal de cobrança permanece desabilitado por padrão. Nenhum método de pagamento deve ser considerado ativo até a configuração e validação futuras.
- A integração de cobrança permanece apenas como preparação: as funções `billing-*` e `stripe-webhook` ainda não estão publicadas. Não habilite Checkout/Portal antes de configurar os segredos abaixo.
- O bucket privado `documents` e a política que aplica a cota de cada plano já estão no Supabase.

## Configuração Stripe (modo de teste primeiro)

1. No Stripe Dashboard, crie um produto **Qqorvex Plus** e dois preços recorrentes em BRL: `R$ 19,90` a cada mês e `R$ 214,90` a cada ano. Copie os dois IDs que começam por `price_`.
2. Configure o Customer Portal no Stripe para exibir faturas, atualizar forma de pagamento e permitir cancelamento ao fim do período pago.
3. Defina estes segredos nas Edge Functions do Supabase (Dashboard → Edge Functions → Secrets):

   - `STRIPE_SECRET_KEY` — comece com a chave de teste `sk_test_…`.
   - `STRIPE_PRICE_PLUS_MONTHLY` — ID do preço mensal.
   - `STRIPE_PRICE_PLUS_ANNUAL` — ID do preço anual.
   - `STRIPE_WEBHOOK_SECRET` — segredo de assinatura do endpoint Stripe.
   - `APP_BASE_URL` — origem HTTPS pública do app, sem caminho (por exemplo `https://app.seudominio.com`). Obrigatória somente se também habilitar checkout/portal web; no APK direto o retorno usa uma URL HTTPS fixa do Supabase.

   Não coloque nenhuma chave `sk_…` ou `whsec_…` em `VITE_*`, no `.env` do frontend, em `app_secrets` ou no Git.

4. Crie um endpoint Webhook no Stripe apontando para `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` e selecione `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`. Copie o signing secret criado e guarde-o em `STRIPE_WEBHOOK_SECRET`.
5. No ambiente de build/hospedagem **web**, defina `VITE_BILLING_CHANNEL=web`. Para o APK distribuído diretamente, gere com `VITE_BILLING_CHANNEL=direct_apk`. Esse valor não deve ser usado em um futuro build da Play Store.
6. Em teste, use os produtos/preços e chaves do modo de teste, complete uma compra de teste e confira se o webhook colocou a linha correspondente em `billing_subscriptions`. O navegador de retorno por si só nunca concede Plus; só o webhook assinado atualiza o entitlement.

## Publicação

Depois dos segredos, publique as funções:

```powershell
npx supabase@latest functions deploy billing-checkout
npx supabase@latest functions deploy billing-portal
npx supabase@latest functions deploy billing-app-return
npx supabase@latest functions deploy stripe-webhook
npx supabase@latest functions deploy vex-chat
npx supabase@latest functions deploy vex-web-search
```

`supabase/config.toml` desabilita a verificação JWT apenas no webhook Stripe — que verifica `Stripe-Signature` sobre o corpo bruto — e na página fixa de retorno do APK, que não acessa nem altera dados. Checkout e portal continuam autenticando o JWT do Supabase.

## APK direto e Google Play

O app é empacotado com Tauri 2. Para não misturar regras de loja, o build da Play deve usar `VITE_BILLING_CHANNEL=play`, que mantém os botões de compra bloqueados. Antes de ativar, falta adicionar Billing Library no wrapper Android, publicar os produtos na Play Console, validar e reconhecer as compras no servidor e conectar RTDN. A própria documentação oficial recomenda que o backend consulte a Google Play Developer API e sincronize o ciclo da assinatura.

Para o APK instalado diretamente, o Tauri registra o esquema customizado `qqorvex://assinatura` e abre Stripe no navegador do sistema. Checkout e portal retornam primeiro à função HTTPS fixa `billing-app-return`, que aceita somente os estados permitidos e abre o deep link; a tela atualiza, mas o entitlement continua dependendo do webhook assinado. Não é necessário manter um site público para esse retorno no APK. Gere o APK direto com `VITE_BILLING_CHANNEL=direct_apk`; nunca use `web` como atalho no pacote Android.

Referências: [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [Stripe Customer Portal](https://docs.stripe.com/api/customer_portal/sessions/create), [segredos de Edge Functions no Supabase](https://supabase.com/docs/guides/functions/secrets), [backend de pagamentos Google Play](https://developer.android.com/google/play/billing/backend).
