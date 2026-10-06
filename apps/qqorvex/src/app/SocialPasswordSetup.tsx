import { useEffect, useState, type FormEvent } from "react";
import { Button, Notice } from "@qqorvex/ui";
import { isPasswordValid, useAuth } from "@qqorvex/auth";
import { AuthLayout } from "../pages/AuthLayout";
import { PasswordField } from "../components/PasswordField";

export function SocialPasswordSetup({ onComplete }: { onComplete: () => void }) {
  const { client, session } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || session.user.user_metadata.qqorvex_password_setup_pending === true) return;
    void client.auth.updateUser({
      data: {
        qqorvex_password_setup_pending: true,
        qqorvex_onboarding_pending: true,
      },
    }).then(({ error: metadataError }) => {
      if (metadataError) console.error("Não foi possível salvar o estado pendente da senha social.", metadataError.message);
    }).catch(() => {
      console.error("Não foi possível salvar o estado pendente da senha social.");
    });
  }, [client, session?.user.id, session?.user.user_metadata.qqorvex_password_setup_pending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) {
      setError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({
        password,
        data: {
          qqorvex_password_setup_pending: false,
          qqorvex_password_setup_completed: true,
          qqorvex_password_setup_completed_at: new Date().toISOString(),
          qqorvex_onboarding_pending: true,
        },
      });
      if (updateError) {
        setError("Não foi possível salvar sua senha. Confira sua conexão e tente novamente.");
        return;
      }
      onComplete();
    } catch {
      setError("Não foi possível salvar sua senha. Confira sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-gold-fg">Etapa de segurança</p>
          <h1 className="m-0 font-display text-2xl font-semibold text-fg">Crie uma senha para sua conta</h1>
          <p className="m-0 text-sm leading-6 text-fg-3">Você pode continuar entrando com Google, Discord ou GitHub. A senha também permite acessar sua conta por e-mail.</p>
        </div>
        <PasswordField label="Criar senha" value={password} onChange={setPassword} autoComplete="new-password" showChecklist />
        <PasswordField label="Confirmar senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={busy}>Salvar senha e continuar</Button>
      </form>
    </AuthLayout>
  );
}
