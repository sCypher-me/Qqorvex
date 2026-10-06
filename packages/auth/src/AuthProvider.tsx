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
import { emailRedirect } from "./emailFlows";
import { resolveInitialSession } from "./initialSession";
import { CURRENT_TERMS_VERSION } from "./terms";

export interface SignUpMetadata {
  fullName: string;
  /** Vazio = o backend gera um "qqXXXXX" automaticamente (ver migração `auth_registro_completo`). */
  username?: string;
  /** Já em E.164 (`+55...`) — normalização acontece no formulário, nunca aqui. */
  phone?: string;
  /** Version of the terms explicitly accepted on the public registration form. */
  termsVersion: typeof CURRENT_TERMS_VERSION;
}

interface AuthContextValue {
  client: SupabaseClient<Database>;
  session: Session | null;
  /** true enquanto a sessão inicial ainda não foi resolvida (evita flash de tela de login). */
  isLoading: boolean;
  signInWithPassword: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, metadata: SignUpMetadata, captchaToken?: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: OAuthProviderId, options?: { redirectTo?: string; skipBrowserRedirect?: boolean }) => Promise<{ error: string | null; url?: string }>;
  resetPasswordForEmail: (email: string, captchaToken?: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  resendSignupConfirmation: (email: string, captchaToken?: string) => Promise<{ error: string | null }>;
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
    let mounted = true;

    void resolveInitialSession(client)
      .then((nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      client,
      session,
      isLoading,
      async signInWithPassword(email, password, captchaToken) {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });
        return { error: error ? mapAuthError(error) : null };
      },
      async signUpWithPassword(email, password, metadata, captchaToken) {
        const { error } = await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: emailRedirect(),
            ...(captchaToken ? { captchaToken } : {}),
            data: {
              full_name: metadata.fullName.trim(),
              display_name: metadata.fullName.trim(),
              username: metadata.username?.trim().toLowerCase() || undefined,
              phone: metadata.phone || undefined,
              qqorvex_onboarding_pending: true,
              qqorvex_terms_version: metadata.termsVersion,
              qqorvex_terms_acceptance_source: "email_signup",
            },
          },
        });
        return { error: error ? mapAuthError(error, { operation: "signUp" }) : null };
      },
      async signInWithOAuth(provider, options) {
        return signInWithOAuth(client, provider, options);
      },
      async resetPasswordForEmail(email, captchaToken) {
        const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: emailRedirect("/redefinir-senha"),
          ...(captchaToken ? { captchaToken } : {}),
        });
        // Nunca revela se o e-mail existe ou não (previne enumeração de contas) — o Supabase já
        // retorna sucesso nos dois casos; só erros de verdade (rate limit, etc.) chegam aqui.
        return { error: error ? mapAuthError(error) : null };
      },
      async updatePassword(newPassword) {
        const { error } = await client.auth.updateUser({ password: newPassword });
        return { error: error ? mapAuthError(error) : null };
      },
      async resendSignupConfirmation(email, captchaToken) {
        const { error } = await client.auth.resend({
          type: "signup",
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: emailRedirect(), ...(captchaToken ? { captchaToken } : {}) },
        });
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
