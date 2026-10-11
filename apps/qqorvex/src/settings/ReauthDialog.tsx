import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { hasPassword, listMfaFactors, requestEmailLogin, useAuth, verifyCurrentPassword, verifyEmailLogin, verifyTotpChallenge } from "@qqorvex/auth";
import { Button, Input, Modal, Notice, TurnstileCaptcha } from "@qqorvex/ui";
import { PasswordField } from "../components/PasswordField";

/** Depois de confirmar, ações seguidas não pedem de novo por alguns minutos. */
const CONFIRMATION_WINDOW_MS = 5 * 60_000;
let confirmedAt = 0;

type Method = { kind: "totp"; factorId: string } | { kind: "password" } | { kind: "email" };

/**
 * Confirmação de identidade antes de ações sensíveis (trocar e-mail/senha, desativar 2FA, gerar
 * códigos de recuperação, encerrar todas as sessões). Usa o app autenticador quando o 2FA está
 * ativo; senão a senha atual; e, para contas só com login social, um código por e-mail.
 *
 *   const reauth = useReauth();
 *   if (!(await reauth.confirm("trocar o e-mail"))) return;
 *   ...
 *   return <>{...}{reauth.dialog}</>;
 */
export function useReauth() {
  const { client, session } = useAuth();
  const [request, setRequest] = useState<{ reason: string; method: Method } | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    async (reason: string, options?: { force?: boolean }): Promise<boolean> => {
      if (!options?.force && Date.now() - confirmedAt < CONFIRMATION_WINDOW_MS) return true;
      const factors = await listMfaFactors(client);
      const totp = factors.find((factor) => factor.status === "verified");
      const method: Method = totp ? { kind: "totp", factorId: totp.id } : (await hasPassword(client)) ? { kind: "password" } : { kind: "email" };
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setRequest({ reason, method });
      });
    },
    [client],
  );

  function finish(ok: boolean) {
    if (ok) confirmedAt = Date.now();
    resolver.current?.(ok);
    resolver.current = null;
    setRequest(null);
  }

  const dialog: ReactNode = request ? <ReauthModal reason={request.reason} method={request.method} email={session?.user.email ?? ""} onDone={finish} /> : null;
  return { confirm, dialog };
}

function ReauthModal({ reason, method, email, onDone }: { reason: string; method: Method; email: string; onDone: (ok: boolean) => void }) {
  const { client } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (method.kind === "totp") {
        const { error: totpError } = await verifyTotpChallenge(client, method.factorId, value);
        if (totpError) return setError("Código incorreto ou expirado. Confira o app autenticador.");
        return onDone(true);
      }
      if (method.kind === "password") {
        const result = await verifyCurrentPassword(client, value);
        if (!result.ok) return setError(result.error);
        return onDone(true);
      }
      if (!emailSent) {
        if (siteKey && !captcha) return setError("Conclua a verificação de segurança.");
        const result = await requestEmailLogin(client, email, captcha ?? undefined);
        setCaptcha(null);
        setCaptchaReset((count) => count + 1);
        if (result.error) return setError(result.error);
        return setEmailSent(true);
      }
      const result = await verifyEmailLogin(client, email, value);
      if (result.error) return setError(result.error);
      onDone(true);
    } catch {
      setError("Não foi possível confirmar agora. Verifique a conexão e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const description =
    method.kind === "totp"
      ? "Digite o código de 6 dígitos do seu app autenticador."
      : method.kind === "password"
        ? "Digite a senha atual da sua conta."
        : emailSent
          ? `Enviamos um código para ${email}.`
          : `Vamos enviar um código para ${email}.`;

  return (
    <Modal isOpen onClose={() => !busy && onDone(false)} title={`Confirme que é você para ${reason}`} description={description} size="sm" icon={<ShieldCheckIcon size={18} />}>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        {method.kind === "totp" && (
          <input
            data-autofocus
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Código do app autenticador"
            className="q-input w-full font-mono tracking-[.3em] sm:w-44"
          />
        )}
        {method.kind === "password" && <PasswordField label="Senha atual" value={value} onChange={setValue} autoComplete="current-password" />}
        {method.kind === "email" &&
          (emailSent ? (
            <Input label="Código recebido" value={value} onChange={(event) => setValue(event.target.value.replace(/\s/g, ""))} inputMode="numeric" autoComplete="one-time-code" data-autofocus />
          ) : (
            <TurnstileCaptcha siteKey={siteKey} resetSignal={captchaReset} onToken={setCaptcha} />
          ))}
        {error && <Notice compact>{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onDone(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy} disabled={method.kind === "totp" ? value.length !== 6 : method.kind === "email" && !emailSent ? false : !value}>
            {method.kind === "email" && !emailSent ? "Enviar código" : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
