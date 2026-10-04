import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, "supabase/templates");
const templates = [
  { key: "password_changed_notification", subject: "Sua senha foi alterada — Qqorvex", eyebrow: "SENHA ALTERADA", title: "Sua senha foi atualizada.", body: "A senha da sua conta Qqorvex foi alterada com sucesso.", detail: "A mudança de senha foi registrada.", footer: "Se você não fez essa alteração, redefina sua senha e encerre as outras sessões imediatamente." },
  { key: "email_changed_notification", subject: "Seu e-mail foi alterado — Qqorvex", eyebrow: "E-MAIL ALTERADO", title: "O e-mail da conta mudou.", body: "A alteração do endereço de acesso da sua conta foi concluída.", detail: "De {{ .OldEmail }} para {{ .Email }}", footer: "Se você não fez essa alteração, entre no app usando o endereço oficial e proteja sua conta." },
  { key: "phone_changed_notification", subject: "Seu telefone foi alterado — Qqorvex", eyebrow: "TELEFONE ALTERADO", title: "O telefone de acesso mudou.", body: "Um novo telefone foi confirmado para sua conta Qqorvex.", detail: "De {{ .OldPhone }} para {{ .Phone }}", footer: "Se você não fez essa alteração, revise os métodos de acesso e encerre as sessões abertas." },
  { key: "identity_linked_notification", subject: "Novo método de acesso vinculado — Qqorvex", eyebrow: "NOVO ACESSO VINCULADO", title: "Um método de acesso foi adicionado.", body: "A conta abaixo agora pode ser usada para entrar no seu Qqorvex.", detail: "{{ .Provider }}", footer: "Se você não reconhece essa alteração, remova o método vinculado e encerre as sessões desconhecidas." },
  { key: "identity_unlinked_notification", subject: "Método de acesso removido — Qqorvex", eyebrow: "ACESSO REMOVIDO", title: "Um método de acesso foi removido.", body: "O método abaixo não está mais vinculado à sua conta Qqorvex.", detail: "{{ .Provider }}", footer: "Se você não fez essa alteração, revise os acessos restantes e proteja sua conta." },
  { key: "mfa_factor_enrolled_notification", subject: "Verificação extra ativada — Qqorvex", eyebrow: "PROTEÇÃO ADICIONADA", title: "Um método de verificação foi ativado.", body: "Sua conta agora tem uma etapa extra de segurança.", detail: "{{ .FactorType }}", footer: "Se você não reconhece essa alteração, remova o método desconhecido nas configurações de segurança." },
  { key: "mfa_factor_unenrolled_notification", subject: "Verificação extra removida — Qqorvex", eyebrow: "PROTEÇÃO REMOVIDA", title: "Um método de verificação foi removido.", body: "A etapa extra abaixo não está mais ativa na sua conta.", detail: "{{ .FactorType }}", footer: "Se você não fez essa alteração, ative novamente a verificação em duas etapas e revise suas sessões." },
];

function render({ eyebrow, title, body, detail, footer }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title.replaceAll("<br />", " ")} — Qqorvex</title></head>
  <body style="margin:0;padding:0;width:100%;background:#100f0e;font-family:Arial,Helvetica,sans-serif;color:#f3ebdd;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Aviso de segurança importante sobre sua conta Qqorvex.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#100f0e" style="width:100%;background:#100f0e;"><tr><td align="center" style="padding:36px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
        <tr><td style="padding:0 0 22px;text-align:center;"><p style="margin:0;font-size:25px;line-height:32px;font-weight:bold;letter-spacing:-1px;color:#f3ebdd;">Qqorvex<span style="color:#d4a056;">.</span></p><p style="margin:6px 0 0;font-size:12px;line-height:18px;color:#b5aa99;">Avisos de segurança da sua conta</p></td></tr>
        <tr><td bgcolor="#171513" style="padding:30px 24px;background:#171513;border:1px solid #393229;border-top:3px solid #d4a056;border-radius:16px;">
          <p style="margin:0 0 13px;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:1.7px;color:#e3b26d;">${eyebrow}</p>
          <h1 style="margin:0 0 16px;font-size:28px;line-height:36px;font-weight:bold;letter-spacing:-.6px;color:#f3ebdd;">${title}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:24px;color:#cfc6b8;">${body}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;"><tr><td bgcolor="#23201d" style="padding:15px 16px;border:1px solid #393229;border-radius:10px;background:#23201d;">
            <p style="margin:0 0 5px;font-size:10px;line-height:16px;font-weight:bold;letter-spacing:1.2px;color:#b5aa99;">DETALHE</p>
            <p style="margin:0;font-size:14px;line-height:22px;color:#f3ebdd;word-break:break-word;">${detail}</p>
          </td></tr></table>
          <p style="margin:22px 0 0;font-size:13px;line-height:22px;color:#cfc6b8;">${footer}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:23px 0 0;"><tr><td align="center" bgcolor="#d4a056" style="border-radius:9px;background:#d4a056;"><a href="https://qqorvex-app.pages.dev/configuracoes/seguranca" style="display:inline-block;padding:12px 18px;border:1px solid #d4a056;border-radius:9px;font-size:14px;line-height:20px;font-weight:bold;text-decoration:none;color:#1b1307;background:#d4a056;">Abrir segurança da conta</a></td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 12px 0;text-align:center;"><p style="margin:0;font-size:11px;line-height:18px;color:#8f8577;">Mensagem automática de segurança. Não responda a este e-mail.</p><p style="margin:8px 0 0;font-size:11px;line-height:18px;color:#8f8577;">Qqorvex · Segurança da conta</p></td></tr>
      </table>
    </td></tr></table>
  </body>
</html>
`;
}

await mkdir(output, { recursive: true });
for (const template of templates) {
  await writeFile(resolve(output, `${template.key}.html`), render(template), "utf8");
  await writeFile(resolve(output, `${template.key}-subject.txt`), `${template.subject}\n`, "utf8");
}
console.log(`Generated ${templates.length} security notification templates.`);
