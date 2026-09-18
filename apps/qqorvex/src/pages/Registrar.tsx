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

export function RegistrarPage() {
  const { session, isLoading, signUpWithPassword } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
  const canSubmit = trimmedName.length > 0 && email.trim().length > 0 && isPasswordValid(password) && passwordsMatch && phoneOk;

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

    setSubmitting(true);
    const result = await signUpWithPassword(email, password, {
      fullName: trimmedName,
      username: username.trim() || undefined,
      phone: normalizeBRPhone(phone) ?? undefined,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setRegistered(true);
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">Criar conta</h1>
          <p className="text-[13px] text-text-secondary m-0">Você recebe um e-mail para confirmar o cadastro.</p>
        </div>

        <div className="flex flex-col gap-3.5">
          <Input
            label="Nome completo"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={120}
          />
          <UsernameField value={username} onChange={setUsername} />
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PhoneField value={phone} onChange={setPhone} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                <span className={`text-xs ${passwordsMatch ? "text-success" : "text-error"}`}>
                  {passwordsMatch ? "✓ As senhas coincidem." : "✕ As senhas não coincidem."}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button
          type="submit"
          variant="primary"
          disabled={submitting || !canSubmit}
          className="w-full py-3 text-[15px] shadow-[0_0_24px_rgba(67,185,210,.12)]"
        >
          {submitting ? "Criando…" : "Criar conta"}
        </Button>

        <OAuthButtons />

        <Link to="/login" className="text-[13px] text-text-secondary hover:text-text-primary">
          Já tem conta? Entrar
        </Link>
      </form>
    </AuthLayout>
  );
}
