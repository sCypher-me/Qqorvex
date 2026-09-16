import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getAssuranceLevel, isMfaPending } from "./mfa";

/** Sessão existe mas o 2FA (se ativado) ainda não foi completado nesta sessão. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { client, session, isLoading } = useAuth();
  const [mfaPending, setMfaPending] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setMfaPending(null);
      return;
    }
    getAssuranceLevel(client).then((level) => setMfaPending(isMfaPending(level)));
  }, [client, session]);

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (mfaPending === null) return null;
  if (mfaPending) return <Navigate to="/mfa" replace />;

  return children;
}
