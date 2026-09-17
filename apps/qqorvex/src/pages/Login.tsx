import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth, signInWithPasskey } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { client, session, isLoading, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);

  if (!isLoading && session) return <Navigate to="/" replace />;

  async function handlePasskeyLogin() {
    setError(null);
    setInfo(null);
    setPasskeySubmitting(true);
    const { error: passkeyError } = await signInWithPasskey(client);
    setPasskeySubmitting(false);
    if (passkeyError) setError(passkeyError);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result =
      mode === "login"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === "register") {
      setInfo("Conta criada. Verifique seu e-mail para confirmar o cadastro.");
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">
            {mode === "login" ? "Entrar no Qqorvex" : "Criar conta"}
          </h1>
          <p className="text-[13px] text-text-secondary m-0">
            {mode === "login"
              ? "Sessão protegida por 2FA. Você confirma cada ação sensível."
              : "Você recebe um e-mail para confirmar o cadastro."}
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="py-3 text-[15px]"
          />
          <Input
            label="Senha"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="py-3 text-[15px]"
          />
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}

        <div className="flex flex-col gap-2.5">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full py-3 text-[15px] shadow-[0_0_24px_rgba(67,185,210,.12)]"
          >
            {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
          {mode === "login" && (
            <Button
              type="button"
              variant="secondary"
              onClick={handlePasskeyLogin}
              disabled={passkeySubmitting}
              className="w-full py-3 text-[15px]"
            >
              Entrar com Passkey
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="bg-transparent border-none p-0 text-left text-[13px] text-text-secondary hover:text-text-primary cursor-pointer"
        >
          {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
