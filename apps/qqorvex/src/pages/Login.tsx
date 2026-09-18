import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth, signInWithPasskey } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { OAuthButtons } from "../components/OAuthButtons";
import { VerifyEmailNotice } from "../components/VerifyEmailNotice";

export function LoginPage() {
  const { client, session, isLoading, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

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
    setPasskeySubmitting(true);
    const { error: passkeyError } = await signInWithPasskey(client);
    setPasskeySubmitting(false);
    if (passkeyError) setError(passkeyError);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signInWithPassword(email, password);
    setSubmitting(false);

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">Entrar no Qqorvex</h1>
          <p className="text-[13px] text-text-secondary m-0">Sessão protegida por 2FA. Você confirma cada ação sensível.</p>
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
            className="py-3 text-[15px]"
          />
          <PasswordField
            label="Senha"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
            className="py-3 text-[15px]"
          />
          <Link to="/esqueci-senha" className="self-end text-[13px] text-text-secondary hover:text-text-primary -mt-1.5">
            Esqueci minha senha
          </Link>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col gap-2.5">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full py-3 text-[15px] shadow-[0_0_24px_rgba(67,185,210,.12)]"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePasskeyLogin}
            disabled={passkeySubmitting}
            className="w-full py-3 text-[15px]"
          >
            Entrar com Passkey
          </Button>
        </div>

        <OAuthButtons />

        <Link to="/criar-conta" className="text-[13px] text-text-secondary hover:text-text-primary">
          Ainda não possui uma conta? Criar conta
        </Link>
      </form>
    </AuthLayout>
  );
}
