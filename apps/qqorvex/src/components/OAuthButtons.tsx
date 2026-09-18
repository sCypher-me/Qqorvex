import { useState, type ReactElement } from "react";
import { Button, Notice, triggerHaptic } from "@qqorvex/ui";
import { useAuth, OAUTH_PROVIDERS, type OAuthProviderId } from "@qqorvex/auth";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.2Z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41 15.4 46 24 46Z" />
      <path fill="#FBBC05" d="M11.8 28.3a13.8 13.8 0 0 1 0-8.6v-5.7H4.5a22 22 0 0 0 0 20l7.3-5.7Z" />
      <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 7 4.5 13.9l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
      <path d="M20.3 5.3A19.8 19.8 0 0 0 15.2 4l-.3.5a13.9 13.9 0 0 1 4.2 1.6 15.4 15.4 0 0 0-14.2 0 13.9 13.9 0 0 1 4.2-1.6L8.8 4a19.8 19.8 0 0 0-5.1 1.3C.7 9.5-.1 13.6.3 17.6a20 20 0 0 0 6 3l1-1.4a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.4 0l.5.4a12.9 12.9 0 0 1-2 1l1 1.4a20 20 0 0 0 6-3c.5-4.6-.7-8.6-3.4-12.3ZM8.5 14.9c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.9.9 1.8 2c0 1.1-.8 2-1.8 2Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.8 9.6.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1.1 1.5 1.1.9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.5-1.4.1-2.9 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.5.2 2.6.1 2.9.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v3c0 .3.2.6.7.5 4-1.3 6.8-5.1 6.8-9.6C22 6.6 17.5 2 12 2Z" />
    </svg>
  );
}

const ICONS: Record<OAuthProviderId, () => ReactElement> = { google: GoogleIcon, discord: DiscordIcon, github: GitHubIcon };

/** "Continuar com Google", nunca "Gmail" — os 3 apontam pro mesmo signInWithOAuth, o Supabase já faz o account linking automático se o e-mail bater com uma conta existente. */
export function OAuthButtons() {
  const { signInWithOAuth } = useAuth();
  const [pending, setPending] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: OAuthProviderId) {
    triggerHaptic("light");
    setError(null);
    setPending(provider);
    const { error } = await signInWithOAuth(provider);
    // Em caso de sucesso o navegador já saiu da página (redirect) — só chega aqui se falhou antes de redirecionar.
    setPending(null);
    if (error) setError(error);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="flex-1 h-px bg-border" />
        ou continue com
        <span className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {OAUTH_PROVIDERS.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <Button
              key={id}
              type="button"
              variant="secondary"
              onClick={() => handleClick(id)}
              disabled={pending !== null}
              title={`Continuar com ${label}`}
              aria-label={`Continuar com ${label}`}
              className="flex items-center justify-center py-3"
            >
              {pending === id ? (
                <span className="w-[7px] h-[7px] rounded-full bg-vex-cyan-bright animate-core-glow" aria-hidden="true" />
              ) : (
                <Icon />
              )}
            </Button>
          );
        })}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
