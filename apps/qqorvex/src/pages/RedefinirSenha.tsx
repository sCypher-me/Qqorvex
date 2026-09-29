import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { LinkBreakIcon } from "@phosphor-icons/react";
import { Button, ButtonLink, Notice } from "@qqorvex/ui";
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
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning">
            <LinkBreakIcon size={24} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-display text-[26px] font-semibold tracking-[-0.02em] text-fg">Link inválido ou expirado</h1>
            <p className="m-0 text-[14px] leading-relaxed text-fg-3">Por segurança, cada link de redefinição vale uma vez e por pouco tempo. Peça um novo — chega em segundos.</p>
          </div>
          <ButtonLink to="/esqueci-senha" variant="primary" size="lg" fullWidth>
            Pedir novo link
          </ButtonLink>
          <Link to="/login" className="text-[13.5px] font-medium text-gold-fg hover:underline">
            Voltar para entrar
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-semibold tracking-[-0.02em] text-fg">Nova senha</h1>
          <p className="m-0 text-[14px] text-fg-3">Ao salvar, as outras sessões abertas são encerradas.</p>
        </div>

        <div className="flex flex-col gap-3.5">
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
              <span className={`text-xs flex items-center gap-1.5 transition-colors duration-150 ${passwordsMatch ? "text-success" : "text-danger"}`}>
                <StatusIcon ok={passwordsMatch} />
                {passwordsMatch ? "As senhas coincidem." : "As senhas não coincidem."}
              </span>
            )}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" variant="primary" disabled={submitting} size="lg" fullWidth>
          {submitting ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
