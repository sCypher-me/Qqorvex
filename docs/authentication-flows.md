# Fluxos de autenticação

O redesenho não substitui o Supabase Auth, os guards, MFA nem passkeys. O `AuthLayout` contém apenas a apresentação comum e todas as páginas continuam chamando os fluxos existentes do pacote `@qqorvex/auth`.

## Entradas e caminhos

- **Login:** email/senha, entrada por passkey e provedores OAuth disponíveis. Erros e submissão são estados do fluxo real.
- **Cadastro:** email/senha e metadados de perfil; confirmação de email e sessão seguem a configuração Supabase.
- **Recuperação:** `Esqueci senha` solicita link via `resetPasswordForEmail`; `Redefinir senha` consome a sessão/token de recuperação.
- **MFA:** `RequireAuth` avalia o nível de garantia da sessão e encaminha para `/mfa` quando necessário. A consulta tem timeout de 8 segundos e falha fechada se o Auth não responder. O fator implementado é TOTP do Supabase Auth.
- **Segurança da conta:** `/seguranca` mantém gerenciamento real de TOTP, passkeys, sessões e integrações. Passkey/WebAuthn é distinto de MFA TOTP.
- **Sessão:** `AuthProvider` observa `onAuthStateChange`; rotas protegidas usam `RequireAuth`; sair usa `signOut` existente.

## Apresentação e estados

O layout editorial usa a identidade Casa-Observatório, o glifo/wordmark e um motivo geométrico estático. A personagem Vex não aparece nas telas de autenticação. Em viewports estreitos, o formulário ocupa uma coluna e mantém largura legível; em desktop, a coluna editorial aparece ao lado. Erros ficam junto ao formulário, botões refletem busy/disabled e links preservam rotas de recuperação e cadastro.

Nunca registrar segredos/códigos MFA, simular sucesso, substituir OAuth por link visual ou contornar políticas de autorização/RLS para ajustar a apresentação.
