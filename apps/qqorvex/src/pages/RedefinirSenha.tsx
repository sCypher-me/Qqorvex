import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Notice } from "@qqorvex/ui";
import { useAuth, isPasswordValid } from "@qqorvex/auth";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";
import { StatusIcon } from "../components/StatusIcon";

/**
 * O link do e-mail cai aqui com o token de recuperação na URL — o `supabase-js` já troca isso por
 * uma sessão temporária sozinho (`detectSessionInUrl`, ligado por padrão) antes deste componente
 * montar de verdade; `AuthProvider` pega essa sessão pelo `onAuthStateChange` de sempre, sem lógica
 * extra aqui. Sem sessão = link inválido/expirado (o token já foi trocado e descartado, ou nunca existiu).
 */
export function RedefinirSenhaPage() {
  const { session, isLoading, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (isLoading) return null;

  if (!session) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-[18px] items-center text-center">
          <h1 className="font-display text-[24px] font-semibold m-0">Link inválido ou expirado</h1>
          <p className="text-[13px] text-text-secondary m-0">Peça um novo link de redefinição.</p>
          <Link to="/esqueci-senha" className="text-[13px] text-vex-cyan-bright hover:underline">
            Esqueci minha senha
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) return <Navigate to="/" replace />;

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (!passwordsMatch) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    // Revoga as outras sessões pra que a senha vazada/antiga pare de valer em qualquer dispositivo já conectado.
    await signOut({ scope: "others" });
    setDone(true);
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold m-0">Nova senha</h1>
          <p className="text-[13px] text-text-secondary m-0">Escolha uma nova senha pra sua conta.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <PasswordField label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" required showChecklist />
          <div className="flex flex-col gap-2">
            <PasswordField
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
            />
            {confirmPassword.length > 0 && (
              <span className={`text-xs flex items-center gap-1.5 transition-colors duration-150 ${passwordsMatch ? "text-success" : "text-error"}`}>
                <StatusIcon ok={passwordsMatch} />
                {passwordsMatch ? "As senhas coincidem." : "As senhas não coincidem."}
              </span>
            )}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3 text-[15px]">
          {submitting ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
