import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Input } from "@qqorvex/ui";
import { useAuth, signInWithPasskey } from "@qqorvex/auth";

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
    <main className="min-h-screen bg-background flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-1 border border-border rounded-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          {mode === "login" ? "Entrar no Qqorvex" : "Criar conta"}
        </h1>

        <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

        <Input
          label="Senha"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-error">{error}</p>}
        {info && <p className="text-sm text-success">{info}</p>}

        <Button type="submit" variant="primary" disabled={submitting}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>

        {mode === "login" && (
          <Button type="button" variant="secondary" onClick={handlePasskeyLogin} disabled={passkeySubmitting}>
            Entrar com Passkey
          </Button>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="text-sm text-text-secondary-warm hover:text-text-primary text-left"
        >
          {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </form>
    </main>
  );
}
