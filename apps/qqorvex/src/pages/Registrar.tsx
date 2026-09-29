import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth, isPasswordValid, normalizeBRPhone } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { UsernameField } from "../components/UsernameField";
import { PhoneField } from "../components/PhoneField";
import { OAuthButtons } from "../components/OAuthButtons";
import { VerifyEmailNotice } from "../components/VerifyEmailNotice";
import { StatusIcon } from "../components/StatusIcon";
import { TurnstileCaptcha } from "../components/TurnstileCaptcha";

export function RegistrarPage() {
  const { session, isLoading, signUpWithPassword } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  if (!isLoading && session) return <Navigate to="/" replace />;

  if (registered) {
    return (
      <AuthLayout>
        <VerifyEmailNotice email={email} onChangeEmail={() => setRegistered(false)} />
      </AuthLayout>
    );
  }

  const trimmedName = fullName.trim();
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const phoneOk = phone.trim() === "" || normalizeBRPhone(phone) !== null;
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
  const canSubmit = trimmedName.length > 0 && email.trim().length > 0 && isPasswordValid(password) && passwordsMatch && phoneOk && (!captchaSiteKey || Boolean(captchaToken));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!trimmedName) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!isPasswordValid(password)) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (!passwordsMatch) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!phoneOk) {
      setError("Telefone inválido.");
      return;
    }
    if (captchaSiteKey && !captchaToken) {
      setError("Conclua a verificação de segurança para criar sua conta.");
      return;
    }

    setSubmitting(true);
    const result = await signUpWithPassword(email, password, {
      fullName: trimmedName,
      username: username.trim() || undefined,
      phone: normalizeBRPhone(phone) ?? undefined,
    }, captchaToken ?? undefined);
    setSubmitting(false);
    if (captchaSiteKey) {
      setCaptchaToken(null);
      setCaptchaResetSignal((value) => value + 1);
    }

    if (result.error) {
      setError(result.error);
      return;
    }
    setRegistered(true);
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Criar conta</h1>
          <p className="m-0 text-[14px] text-fg-3">Grátis, com todos os módulos. Leva um minuto.</p>
        </div>

        <div className="flex flex-col gap-3.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Identidade</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Nome completo"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              maxLength={120}
            />
            <UsernameField value={username} onChange={setUsername} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PhoneField value={phone} onChange={setPhone} />
          </div>

          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4 mt-1.5">Acesso</span>
          <div className="flex flex-col gap-3.5">
            <PasswordField
              label="Senha"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              showChecklist
            />
            <div className="flex flex-col gap-2">
              <PasswordField
                label="Confirmar senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onBlur={() => setConfirmTouched(true)}
                autoComplete="new-password"
                required
              />
              {(confirmTouched || confirmPassword.length > 0) && confirmPassword.length > 0 && (
                <span className={`text-xs flex items-center gap-1.5 transition-colors duration-150 ${passwordsMatch ? "text-success" : "text-danger"}`}>
                  <StatusIcon ok={passwordsMatch} />
                  {passwordsMatch ? "As senhas coincidem." : "As senhas não coincidem."}
                </span>
              )}
            </div>
          </div>
        </div>

        {captchaSiteKey && (
          <TurnstileCaptcha
            siteKey={captchaSiteKey}
            resetSignal={captchaResetSignal}
            onToken={setCaptchaToken}
          />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !canSubmit}
          size="lg"
          fullWidth
        >
          {submitting ? "Criando…" : "Criar conta grátis"}
        </Button>

        <OAuthButtons />

        <p className="m-0 text-center text-[13.5px] text-fg-3">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-gold-fg hover:underline">
            Entrar
          </Link>
        </p>
        <p className="m-0 text-center text-xs leading-relaxed text-fg-4">Você recebe um e-mail para confirmar o cadastro antes do primeiro acesso.</p>
      </form>
    </AuthLayout>
  );
}
