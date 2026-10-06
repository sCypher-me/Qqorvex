import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { TurnstileCaptcha } from "@qqorvex/ui";

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local || local.length <= 2) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

/** Tela pós-cadastro e também o que aparece se o login falhar por "e-mail não confirmado" (mesmo componente, dois pontos de entrada). */
export function VerifyEmailNotice({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const { resendSignupConfirmation } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (captchaSiteKey && !captchaToken) {
      setFeedback({ tone: "error", text: "Conclua a verificação de segurança para reenviar." });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const { error } = await resendSignupConfirmation(email, captchaToken ?? undefined);
      if (error) {
        setFeedback({ tone: "error", text: error });
        return;
      }
      setFeedback({ tone: "success", text: "E-mail reenviado." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setFeedback({ tone: "error", text: "Não foi possível conectar. Verifique sua internet e tente novamente." });
    } finally {
      setSending(false);
      if (captchaSiteKey) {
        setCaptchaToken(null);
        setCaptchaResetSignal((value) => value + 1);
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-fg">
        <EnvelopeSimpleIcon size={24} />
      </span>
      <h1 className="m-0 font-display text-[26px] font-semibold tracking-[-0.02em] text-fg">Verifique seu e-mail</h1>
      <p className="m-0 text-[14px] leading-relaxed text-fg-3">
        Enviamos um link de confirmação para <span className="text-fg font-medium">{maskEmail(email)}</span>.
      </p>
      {captchaSiteKey && (
        <TurnstileCaptcha
          siteKey={captchaSiteKey}
          resetSignal={captchaResetSignal}
          onToken={setCaptchaToken}
        />
      )}
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      <div className="flex flex-col gap-2.5 w-full">
        <Button type="button" variant="secondary" size="lg" fullWidth onClick={handleResend} disabled={cooldown > 0 || sending || (Boolean(captchaSiteKey) && !captchaToken)}>
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : sending ? "Enviando…" : "Reenviar e-mail"}
        </Button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="cursor-pointer text-[13.5px] font-medium text-gold-fg hover:underline"
        >
          Alterar e-mail
        </button>
      </div>
    </div>
  );
}
