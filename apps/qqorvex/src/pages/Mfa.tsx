import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Input } from "@qqorvex/ui";
import { useAuth, useMfaFactors, verifyTotpChallenge, getAssuranceLevel, isMfaPending } from "@qqorvex/auth";

/** Exibida logo após o login por senha quando a sessão está em `aal1` mas o usuário tem 2FA ativo. */
export function MfaPage() {
  const { client, session, isLoading } = useAuth();
  const { factors, isLoading: factorsLoading } = useMfaFactors(client);
  const [pending, setPending] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!session) return;
    getAssuranceLevel(client).then((level) => setPending(isMfaPending(level)));
  }, [client, session]);

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (done || pending === false) return <Navigate to="/" replace />;

  const verifiedFactor = factors.find((f) => f.status === "verified");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!verifiedFactor) return;
    setError(null);
    setBusy(true);
    const { error: verifyError } = await verifyTotpChallenge(client, verifiedFactor.id, code);
    setBusy(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-1 border border-border rounded-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="font-display text-2xl font-semibold text-text-primary">Verificação em duas etapas</h1>
        <p className="font-sans text-sm text-text-secondary-warm">
          Digite o código de 6 dígitos do seu app autenticador.
        </p>

        {factorsLoading || pending === null ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : (
          <>
            <Input
              label="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoFocus
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy || code.trim().length === 0}>
              Verificar
            </Button>
          </>
        )}
      </form>
    </main>
  );
}
