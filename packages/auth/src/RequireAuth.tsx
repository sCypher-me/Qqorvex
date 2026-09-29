import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getAssuranceLevel, isMfaPending } from "./mfa";

/** Sessão existe mas o 2FA (se ativado) ainda não foi completado nesta sessão. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { client, session, isLoading } = useAuth();
  const [mfaPending, setMfaPending] = useState<boolean | null>(null);
  const [mfaError, setMfaError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!session) {
      setMfaPending(null);
      setMfaError(false);
      return;
    }

    let cancelled = false;
    setMfaPending(null);
    setMfaError(false);
    void getAssuranceLevel(client)
      .then((level) => {
        if (!cancelled) setMfaPending(isMfaPending(level));
      })
      .catch(() => {
        if (!cancelled) setMfaError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, session, retry]);

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (mfaError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
        <div className="qv-card w-full max-w-md p-6">
          <h1 className="font-display text-xl font-semibold">Não foi possível validar sua sessão</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Verifique sua conexão e tente novamente. Por segurança, o acesso fica bloqueado até a validação terminar.
          </p>
          <button
            type="button"
            className="qv-btn qv-btn-primary mt-5"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (mfaPending === null) {
    return (
      <main
        aria-busy="true"
        aria-label="Validando sua sessão"
        className="flex min-h-screen items-center justify-center bg-bg px-6 text-text-secondary"
      >
        <div role="status" aria-live="polite" className="flex items-center gap-2.5 text-sm">
          <span className="h-[7px] w-[7px] animate-core-glow rounded-full bg-vex-cyan-bright" />
          Validando sua sessão...
        </div>
      </main>
    );
  }
  if (mfaPending) return <Navigate to="/mfa" replace />;

  return children;
}
