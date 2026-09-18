import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, Database } from "@qqorvex/database";
import { signInWithOAuth, type OAuthProviderId } from "./oauth";
import { mapAuthError } from "./authErrors";

export interface SignUpMetadata {
  fullName: string;
  /** Vazio = o backend gera um "qqXXXXX" automaticamente (ver migração `auth_registro_completo`). */
  username?: string;
  /** Já em E.164 (`+55...`) — normalização acontece no formulário, nunca aqui. */
  phone?: string;
}

interface AuthContextValue {
  client: SupabaseClient<Database>;
  session: Session | null;
  /** true enquanto a sessão inicial ainda não foi resolvida (evita flash de tela de login). */
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProviderId) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: string | null }>;
  /** `scope: "others"` revoga as demais sessões sem derrubar a atual — usado depois de trocar a senha. */
  signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  client,
  children,
}: {
  client: SupabaseClient<Database>;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      isLoading,
      async signInWithPassword(email, password) {
        const { error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        return { error: error ? mapAuthError(error) : null };
      },
      async signUpWithPassword(email, password, metadata) {
        const { error } = await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: metadata.fullName.trim(),
              display_name: metadata.fullName.trim(),
              username: metadata.username?.trim().toLowerCase() || undefined,
              phone: metadata.phone || undefined,
            },
          },
        });
        return { error: error ? mapAuthError(error) : null };
      },
      async signInWithOAuth(provider) {
        return signInWithOAuth(client, provider);
      },
      async resetPasswordForEmail(email) {
        const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        // Nunca revela se o e-mail existe ou não (previne enumeração de contas) — o Supabase já
        // retorna sucesso nos dois casos; só erros de verdade (rate limit, etc.) chegam aqui.
        return { error: error ? mapAuthError(error) : null };
      },
      async updatePassword(newPassword) {
        const { error } = await client.auth.updateUser({ password: newPassword });
        return { error: error ? mapAuthError(error) : null };
      },
      async resendSignupConfirmation(email) {
        const { error } = await client.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
        return { error: error ? mapAuthError(error) : null };
      },
      async signOut(options) {
        await client.auth.signOut(options?.scope ? { scope: options.scope } : undefined);
      },
    }),
    [client, session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
