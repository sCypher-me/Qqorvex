import { useEffect, useRef, useState } from "react";

const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme: "auto";
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileWidgetApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileWidgetApi> | null = null;

function loadTurnstile(): Promise<TurnstileWidgetApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<TurnstileWidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("A API do Turnstile não foi disponibilizada."));
    };
    script.onerror = () => reject(new Error("Não foi possível carregar o Turnstile."));
    document.head.append(script);
  }).catch((error: unknown) => {
    turnstileScriptPromise = null;
    document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)?.remove();
    throw error;
  });

  return turnstileScriptPromise;
}

export function TurnstileCaptcha({
  siteKey,
  resetSignal,
  onToken,
}: {
  siteKey: string;
  resetSignal: number;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "verified" | "expired" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    widgetIdRef.current = null;
    setState("loading");

    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "flexible",
          callback: (token) => {
            setState("verified");
            onToken(token);
          },
          "expired-callback": () => {
            setState("expired");
            onToken(null);
          },
          "error-callback": () => {
            setState("error");
            onToken(null);
          },
        });
        // O callback pode disparar dentro do render (ex.: chave de teste); não volta de "verified" para "ready".
        setState((current) => (current === "loading" ? "ready" : current));
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        onToken(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken, retry, siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setState("ready");
    }
  }, [resetSignal]);

  const status = {
    loading: "Carregando verificação de segurança…",
    ready: "Conclua a verificação para continuar.",
    verified: "Verificação concluída.",
    expired: "A verificação expirou. Faça-a novamente.",
    error: "Não foi possível carregar a verificação. Confira sua conexão e tente novamente.",
  }[state];

  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5" aria-label="Verificação de segurança">
      <div ref={containerRef} className="min-h-[66px] w-full max-w-full overflow-hidden" />
      <span className="text-xs text-fg-3" role="status" aria-live="polite">{status}</span>
      {state === "error" && (
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="text-xs text-gold-fg underline underline-offset-2"
        >
          Tentar carregar novamente
        </button>
      )}
    </div>
  );
}
