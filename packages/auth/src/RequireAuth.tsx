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
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 w-full max-w-md p-6">
          <h1 className="font-display text-xl font-semibold">Não foi possível validar sua sessão</h1>
          <p className="mt-2 text-sm text-fg-2">
            Verifique sua conexão e tente novamente. Por segurança, o acesso fica bloqueado até a validação terminar.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 h-9 px-3.5 text-[13.5px] bg-gold text-on-gold hover:bg-gold-hover mt-5"
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
        className="flex min-h-screen items-center justify-center bg-bg px-6 text-fg-2"
      >
        <div role="status" aria-live="polite" className="flex items-center gap-2.5 text-sm">
          <span className="h-[7px] w-[7px] animate-pulse-soft rounded-full bg-gold" />
          Validando sua sessão...
        </div>
      </main>
    );
  }
  if (mfaPending) return <Navigate to="/mfa" replace />;

  return children;
}
