# Fluxos de autenticação por e-mail

| Fluxo do Supabase | Onde usar |
| --- | --- |
| Confirm sign up | `/criar-conta`, confirmação e reenvio na tela de cadastro/login |
| Invite user | Central do Dono → Contas → Convidar por e-mail; retorno em `/aceitar-convite` |
| Magic link or OTP | Login → Entrar por link ou código de e-mail (`/entrar-por-email`) |
| Change email address | Configurações → Segurança → E-mail |
| Reset password | `/esqueci-senha` → e-mail → `/redefinir-senha` |
| Reauthentication | Configurações → Segurança → Senha; código solicitado quando o Supabase exige reautenticação |

O acesso por link/código usa `shouldCreateUser: false`. Convites só podem ser enviados pelo Dono, cuja identidade e papel são consultados no servidor. O convite cria uma conta padrão e não concede planos ou privilégios. A chave de serviço permanece no servidor.

## Configuração do Supabase

Em Authentication → URL Configuration, o Site URL deve apontar para `https://qqorvex-app.pages.dev`. Autorize os retornos:

- `https://qqorvex-app.pages.dev/login`
- `https://qqorvex-app.pages.dev/aceitar-convite`
- `https://qqorvex-app.pages.dev/redefinir-senha`
- `https://qqorvex-app.pages.dev/configuracoes/seguranca`

Cadastro direto com e-mail já inclui senha: depois de confirmar em `/login`, navegador ou Android segue ao onboarding. Contas novas por Google, Discord ou GitHub pedem a criação de uma senha antes do onboarding. Convites seguem outro caminho: `/aceitar-convite` abre a definição de senha e depois leva ao onboarding. No Android, os dois caminhos de retorno do APK são App Links. Domínios de preview precisam de autorização própria para testar links ali. O backend pode substituir retornos não autorizados pelo Site URL.

Em Email Templates, os arquivos e assuntos estão em [supabase/templates](../supabase/templates/README.md). Criar arquivos no repositório não altera os templates no painel. O template de Magic link precisa manter `{{ .Token }}` para permitir digitação do código; os links usam `{{ .ConfirmationURL }}`. Reauthentication usa `{{ .Token }}`.

Para exigir código na troca de senha após uma sessão antiga, habilite Secure password change. A interface trata `reauthentication_needed`, solicita o código e envia `nonce` na atualização. Secure email change pode exigir confirmação nos endereços atual e novo.

## Verificação

- `corepack pnpm test`: contratos do cliente, código expirado, nonce e falhas de envio.
- `node tools/test-invite-user.mjs`: execução do handler real com dependências simuladas; verifica autenticação, permissão, entrada inválida e impossibilidade de escolher privilégios/redirect.
- `corepack pnpm typecheck` e `corepack pnpm --filter qqorvex build`.

Na verificação de 04/10/2026, o projeto respondeu com e-mail habilitado, cadastro habilitado e confirmação obrigatória. `profiles` e o trigger de criação de perfil existem no banco. O endpoint de convite publicado rejeitou chamada sem sessão com 401. A tentativa de cadastro no endereço autorizado foi rejeitada pelo CAPTCHA antes de criar conta ou enviar mensagem. Recebimento na caixa de entrada, SMTP, allowlist de redirects e configurações de troca segura ainda precisam de verificação no painel e de um teste com CAPTCHA válido. Nenhuma proteção foi desabilitada.
