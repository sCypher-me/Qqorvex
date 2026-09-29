import { useEffect, useState } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { TurnstileCaptcha } from "./TurnstileCaptcha";

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
    const { error } = await resendSignupConfirmation(email, captchaToken ?? undefined);
    setSending(false);
    if (captchaSiteKey) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }
    if (error) {
      setFeedback({ tone: "error", text: error });
      return;
    }
    setFeedback({ tone: "success", text: "E-mail reenviado." });
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="flex flex-col gap-[18px] items-center text-center">
      <h1 className="font-display text-[24px] font-semibold m-0">Verifique seu e-mail</h1>
      <p className="text-[13px] text-text-secondary m-0">
        Enviamos um link de confirmação para <span className="text-text-primary font-medium">{maskEmail(email)}</span>.
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
        <Button type="button" variant="secondary" onClick={handleResend} disabled={cooldown > 0 || sending || (Boolean(captchaSiteKey) && !captchaToken)} className="w-full">
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : sending ? "Enviando…" : "Reenviar e-mail"}
        </Button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="bg-transparent border-none p-0 text-[13px] text-text-secondary hover:text-text-primary cursor-pointer"
        >
          Alterar e-mail
        </button>
      </div>
    </div>
  );
}
