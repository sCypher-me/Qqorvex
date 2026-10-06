import { useEffect, type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { AuthProvider } from "@qqorvex/auth";
import { registerHojeProvider } from "@qqorvex/module-hoje";
import { parseBillingCheckoutReturn } from "../billing/deepLink";
import { parseInvitationDeepLink } from "./invitationDeepLink";
import { parseOAuthCallback } from "./oauthDeepLink";
import { supabase } from "./supabase";

function ModuleRegistrations() {
  useEffect(() => {
    let cancelled = false;
    let unregisterFns: Array<() => void> = [];

    void Promise.all([
      import("@qqorvex/module-tarefas/hoje-provider"),
      import("@qqorvex/module-agenda/hoje-provider"),
      import("@qqorvex/module-metas-habitos/hoje-provider"),
      import("@qqorvex/module-estudos/hoje-provider"),
      import("@qqorvex/module-segundo-cerebro/hoje-provider"),
      import("@qqorvex/module-biblioteca/hoje-provider"),
      import("@qqorvex/module-documentos/hoje-provider"),
      import("@qqorvex/module-financas/hoje-provider"),
      import("@qqorvex/module-vida-pessoal/hoje-provider"),
    ])
      .then(
        ([tarefas, agenda, metasHabitos, estudos, segundoCerebro, biblioteca, documentos, financas, vidaPessoal]) => {
          if (cancelled) return;

          unregisterFns = [
            registerHojeProvider(tarefas.createTasksHojeProvider(supabase)),
            registerHojeProvider(agenda.createAgendaHojeProvider(supabase)),
            registerHojeProvider(metasHabitos.createGoalsHabitsHojeProvider(supabase)),
            registerHojeProvider(estudos.createEstudosHojeProvider(supabase)),
            registerHojeProvider(segundoCerebro.createSegundoCerebroHojeProvider(supabase)),
            registerHojeProvider(biblioteca.createBibliotecaHojeProvider(supabase)),
            registerHojeProvider(documentos.createDocumentosHojeProvider(supabase)),
            registerHojeProvider(financas.createFinancasHojeProvider(supabase)),
            registerHojeProvider(vidaPessoal.createVidaPessoalHojeProvider(supabase)),
          ];
        },
      )
      .catch((error: unknown) => {
        console.error("Não foi possível carregar os resumos de Hoje.", error);
      });

    return () => {
      cancelled = true;
      unregisterFns.forEach((unregister) => unregister());
    };
  }, []);

  return null;
}

function BillingDeepLinkRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.VITE_BILLING_CHANNEL !== "direct_apk" || !isTauri()) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    const handleUrls = (urls: string[]) => {
      const outcome = urls.map(parseBillingCheckoutReturn).find((value) => value !== null);
      if (active && outcome) navigate(`/assinatura?checkout=${outcome}`);
    };

    void (async () => {
      try {
        const stopListening = await onOpenUrl(handleUrls);
        if (!active) {
          stopListening();
          return;
        }
        unlisten = stopListening;
        const initialUrls = await getCurrent();
        if (initialUrls) handleUrls(initialUrls);
      } catch (error) {
        console.error("Não foi possível receber o retorno da cobrança no app.", error);
      }
    })();

    return () => {
      active = false;
      unlisten?.();
    };
  }, [navigate]);

  return null;
}

function OAuthDeepLinkRouter() {
  useEffect(() => {
    if (!isTauri()) return;

    let active = true;
    let unlisten: (() => void) | undefined;
    const exchangedCodes = new Set<string>();
    const handleUrls = (urls: string[]) => {
      for (const url of urls) {
        const payload = parseOAuthCallback(url);
        if (!payload) continue;
        const credential = payload.type === "code" ? payload.code : payload.accessToken;
        if (exchangedCodes.has(credential)) continue;
        exchangedCodes.add(credential);
        const completeSignIn = payload.type === "code"
          ? supabase.auth.exchangeCodeForSession(payload.code)
          : supabase.auth.setSession({
              access_token: payload.accessToken,
              refresh_token: payload.refreshToken,
            });
        void completeSignIn.then(({ error }) => {
          if (error && active) {
            console.error("Não foi possível concluir o retorno OAuth no app.", error.message);
          }
        });
      }
    };

    void (async () => {
      try {
        const stopListening = await onOpenUrl(handleUrls);
        if (!active) {
          stopListening();
          return;
        }
        unlisten = stopListening;
        const initialUrls = await getCurrent();
        if (initialUrls) handleUrls(initialUrls);
      } catch (error) {
        console.error("Não foi possível receber o retorno OAuth no app.", error);
      }
    })();

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return null;
}

function InvitationDeepLinkRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTauri()) return;

    let active = true;
    let unlisten: (() => void) | undefined;
    const handled = new Set<string>();
    const handleUrls = (urls: string[]) => {
      for (const value of urls) {
        const payload = parseInvitationDeepLink(value);
        if (!payload || handled.has(value)) continue;
        handled.add(value);

        if (payload.type === "page") {
          navigate("/aceitar-convite", { replace: true });
          continue;
        }

        const result = payload.type === "code"
          ? supabase.auth.exchangeCodeForSession(payload.code)
          : payload.type === "token_hash"
            ? supabase.auth.verifyOtp({ token_hash: payload.tokenHash, type: "invite" })
            : supabase.auth.setSession({ access_token: payload.accessToken, refresh_token: payload.refreshToken });

        void result.then(({ error }) => {
          if (!active) return;
          if (error) console.error("Não foi possível validar o convite no app.", error.message);
          navigate("/aceitar-convite", { replace: true });
        }).catch(() => {
          if (active) navigate("/aceitar-convite", { replace: true });
        });
      }
    };

    void (async () => {
      try {
        const stopListening = await onOpenUrl(handleUrls);
        if (!active) {
          stopListening();
          return;
        }
        unlisten = stopListening;
        const initialUrls = await getCurrent();
        if (initialUrls) handleUrls(initialUrls);
      } catch (error) {
        console.error("Não foi possível receber o convite no app.", error);
      }
    })();

    return () => {
      active = false;
      unlisten?.();
    };
  }, [navigate]);

  return null;
}

export function AppRuntime({ children }: PropsWithChildren) {
  return (
    <AuthProvider client={supabase}>
      <ModuleRegistrations />
      <BillingDeepLinkRouter />
      <OAuthDeepLinkRouter />
      <InvitationDeepLinkRouter />
      {children}
    </AuthProvider>
  );
}
