import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Notice } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";

export function EsqueciSenhaPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await resetPasswordForEmail(email);
    setSubmitting(false);
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
        <div className="flex flex-col gap-[18px] items-center text-center">
          <h1 className="font-display text-[24px] font-semibold m-0">Verifique seu e-mail</h1>
          <p className="text-[13px] text-text-secondary m-0">
            Se existir uma conta associada a {email}, enviamos as instruções de recuperação.
          </p>
          <Link to="/login" className="text-[13px] text-vex-cyan-bright hover:underline">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">Esqueci minha senha</h1>
          <p className="text-[13px] text-text-secondary m-0">
            Informe seu e-mail. Se existir uma conta associada a ele, enviamos um link pra redefinir a senha.
          </p>
        </div>

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3 text-[15px]">
          {submitting ? "Enviando…" : "Enviar instruções"}
        </Button>

        <Link to="/login" className="text-[13px] text-text-secondary hover:text-text-primary">
          Voltar para o login
        </Link>
      </form>
    </AuthLayout>
  );
}
