import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { FingerprintIcon } from "@phosphor-icons/react";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth, signInWithPasskey } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { TurnstileCaptcha } from "../components/TurnstileCaptcha";
import { OAuthButtons } from "../components/OAuthButtons";
import { VerifyEmailNotice } from "../components/VerifyEmailNotice";

export function LoginPage() {
  const { client, session, isLoading, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

  if (!isLoading && session) return <Navigate to="/" replace />;

  if (needsVerification) {
    return (
      <AuthLayout>
        <VerifyEmailNotice email={email} onChangeEmail={() => setNeedsVerification(false)} />
      </AuthLayout>
    );
  }

  async function handlePasskeyLogin() {
    setError(null);
    if (captchaSiteKey && !captchaToken) {
      setError("Conclua a verificação de segurança para entrar.");
      return;
    }
    setPasskeySubmitting(true);
    const { error: passkeyError } = await signInWithPasskey(client, captchaToken ?? undefined);
    setPasskeySubmitting(false);
    if (captchaSiteKey) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }
    if (passkeyError) setError(passkeyError);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (captchaSiteKey && !captchaToken) {
      setError("Conclua a verificação de segurança para entrar.");
      return;
    }
    setSubmitting(true);
    const result = await signInWithPassword(email, password, captchaToken ?? undefined);
    setSubmitting(false);
    if (captchaSiteKey) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }

    if (result.error) {
      if (result.error.toLowerCase().includes("confirme seu e-mail")) {
        setNeedsVerification(true);
        return;
      }
      setError(result.error);
      // Foco automático no primeiro erro.
      emailInputRef.current?.focus();
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Que bom ter você de volta</h1>
          <p className="m-0 text-[14px] text-fg-3">Entre para continuar de onde parou.</p>
        </div>

        <div className="flex flex-col gap-3.5">
          <Input
            ref={emailInputRef}
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fieldSize="lg"
            placeholder="voce@exemplo.com"
          />
          <PasswordField
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            fieldSize="lg"
          />
          <Link to="/esqueci-senha" className="-mt-1.5 self-end text-[13px] font-medium text-gold-fg hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {captchaSiteKey && (
          <TurnstileCaptcha
            siteKey={captchaSiteKey}
            resetSignal={captchaResetSignal}
            onToken={setCaptchaToken}
          />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col gap-2.5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={Boolean(captchaSiteKey) && !captchaToken}
          >
            Entrar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePasskeyLogin}
            size="lg"
            fullWidth
            loading={passkeySubmitting}
            disabled={Boolean(captchaSiteKey) && !captchaToken}
            leadingIcon={<FingerprintIcon size={17} />}
          >
            Entrar com passkey
          </Button>
        </div>

        <OAuthButtons />

        <p className="m-0 text-center text-[13.5px] text-fg-3">
          Ainda não tem conta?{" "}
          <Link to="/criar-conta" className="font-medium text-gold-fg hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
