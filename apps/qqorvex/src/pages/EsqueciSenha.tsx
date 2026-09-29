import { useState, type FormEvent } from "react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";
import { TurnstileCaptcha } from "../components/TurnstileCaptcha";

export function EsqueciSenhaPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (captchaSiteKey && !captchaToken) {
      setError("Conclua a verificação de segurança para continuar.");
      return;
    }
    setSubmitting(true);
    const result = await resetPasswordForEmail(email, captchaToken ?? undefined);
    setSubmitting(false);
    if (captchaSiteKey) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }
    // Sempre neutro — o Supabase não diz se o e-mail existe, então não fingimos saber (previne enumeração).
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-fg">
            <EnvelopeSimpleIcon size={24} />
          </span>
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-[-0.02em] text-fg">Verifique seu e-mail</h1>
          <p className="m-0 text-[14px] leading-relaxed text-fg-3">
            Se existir uma conta associada a {email}, enviamos as instruções de recuperação.
          </p>
          <p className="m-0 text-xs text-fg-4">Não chegou? Confira a caixa de spam ou tente de novo em alguns minutos.</p>
          <Link to="/login" className="text-[13.5px] font-medium text-gold-fg hover:underline">
            Voltar para entrar
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Esqueci minha senha</h1>
          <p className="m-0 text-[14px] leading-relaxed text-fg-3">
            Informe seu e-mail. Se existir uma conta associada a ele, enviamos um link pra redefinir a senha.
          </p>
        </div>

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          fieldSize="lg"
          placeholder="voce@exemplo.com"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {captchaSiteKey && (
          <TurnstileCaptcha
            siteKey={captchaSiteKey}
            resetSignal={captchaResetSignal}
            onToken={setCaptchaToken}
          />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" variant="primary" disabled={submitting || (Boolean(captchaSiteKey) && !captchaToken)} size="lg" fullWidth>
          {submitting ? "Enviando…" : "Enviar instruções"}
        </Button>

        <Link to="/login" className="self-center text-[13.5px] font-medium text-gold-fg hover:underline">
          Voltar para entrar
        </Link>
      </form>
    </AuthLayout>
  );
}
