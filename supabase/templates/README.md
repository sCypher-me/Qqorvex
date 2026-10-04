# E-mails de autenticação do Qqorvex

| Template no Supabase | HTML do Body | Arquivo do Subject |
| --- | --- | --- |
| Confirm sign up | `confirmation.html` | `confirmation-subject.txt` |
| Invite user | `invite.html` | `invite-subject.txt` |
| Magic link or OTP | `magic-link.html` | `magic-link-subject.txt` |
| Change email address | `email-change.html` | `email-change-subject.txt` |
| Reset password | `recovery.html` | `recovery-subject.txt` |
| Reauthentication | `reauthentication.html` | `reauthentication-subject.txt` |
| Password changed | `password_changed_notification.html` | `password_changed_notification-subject.txt` |
| Email address changed | `email_changed_notification.html` | `email_changed_notification-subject.txt` |
| Phone number changed | `phone_changed_notification.html` | `phone_changed_notification-subject.txt` |
| Sign-in method linked | `identity_linked_notification.html` | `identity_linked_notification-subject.txt` |
| Sign-in method removed | `identity_unlinked_notification.html` | `identity_unlinked_notification-subject.txt` |
| MFA method added | `mfa_factor_enrolled_notification.html` | `mfa_factor_enrolled_notification-subject.txt` |
| MFA method removed | `mfa_factor_unenrolled_notification.html` | `mfa_factor_unenrolled_notification-subject.txt` |

Para cada template, copie o assunto do arquivo correspondente e cole o HTML completo no Body → Source.
Confira Preview e clique em Save changes. Esses arquivos não aplicam alterações ao projeto remoto por si só.

Reauthentication usa `{{ .Token }}`, sem botão de link. Magic link or OTP oferece o link e
o código para o fluxo solicitado pelo usuário; mostrar o código não implementa uma tela OTP no app.
Change email address usa `{{ .NewEmail }}`. A confirmação em ambos os endereços depende
da configuração Secure email change do projeto, que não é alterada por estes modelos.

No Supabase, abra Authentication → Email → Templates → Confirm sign up.

- Subject: copie `confirmation-subject.txt`.
- Body → Source: substitua o conteúdo pelo HTML de `confirmation.html`.
- Confira Preview e clique em Save changes.

Preserve `{{ .ConfirmationURL }}` e `{{ .Email }}`: o Supabase substitui esses valores
para cada destinatário. Não use um link fixo do site no botão de confirmação.
Este modelo não muda o fluxo de autenticação ou o acesso ao beta.

## Notificações de segurança

Abra Authentication → Email → Templates e configure cada item da tabela acima. Cole o assunto
do arquivo `*-subject.txt` e o HTML completo do `.html` correspondente em Body → Source; confira
Preview e salve. Os nomes das variáveis são os usados pelo Supabase para cada notificação:
`{{ .OldEmail }}`/`{{ .Email }}`, `{{ .OldPhone }}`/`{{ .Phone }}`, `{{ .Provider }}` e
`{{ .FactorType }}`. O projeto só envia essas mensagens quando cada notificação estiver habilitada
em Authentication → Email → Notifications.

O `supabase/config.toml` aponta para todos os 13 modelos e habilita as sete notificações apenas
no ambiente local. Isso não altera os templates nem os toggles do projeto hospedado; cole os modelos
no Dashboard para publicá-los. Alterações de telefone, método de acesso e MFA são flows diferentes:
o app já permite alterar/verificar telefone, vincular/remover identidades e adicionar/remover o
fator MFA TOTP nas configurações de Segurança.

O HTML usa tabelas e estilos inline, sem JavaScript, fontes externas ou imagens necessárias
para ler a mensagem. A prévia em navegador não substitui um teste em caixas reais de e-mail.
Não envie e-mails de teste a terceiros sem autorização.

Fonte: https://supabase.com/docs/guides/auth/auth-email-templates
