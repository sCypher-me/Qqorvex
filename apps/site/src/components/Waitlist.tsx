import { CheckCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button, Input, TurnstileCaptcha } from "@qqorvex/ui";
import { useState, type FormEvent } from "react";
import { SUPABASE_URL, TURNSTILE_SITE_KEY } from "../config";
import { joinWaitlist } from "../waitlist";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("sending");
    const result = await joinWaitlist({ email, turnstileToken: token ?? "", website }, { supabaseUrl: SUPABASE_URL });
    if (result.ok) {
      setStatus("done");
      return;
    }
    setStatus("idle");
    setError(result.error);
    // Cada token do Turnstile vale uma vez: depois de uma recusa, pede uma nova verificação.
    setToken(null);
    setResetSignal((value) => value + 1);
  }

  return (
    <section id="lista" className="border-t border-line-soft">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 text-center sm:p-10">
          {status === "done" ? (
            <div className="animate-fade-up" role="status">
              <CheckCircleIcon size={44} weight="duotone" className="mx-auto text-success" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-fg">Você está na lista!</h2>
              <p className="mt-2 text-fg-2">Quando o beta abrir, mandamos o seu convite para {email.trim().toLowerCase()}.</p>
            </div>
          ) : (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold-fg">
                <EnvelopeSimpleIcon size={24} weight="duotone" />
              </span>
              <h2 className="mt-4 font-display text-[28px] font-semibold tracking-[-0.02em] text-fg">Entre na lista do beta</h2>
              <p className="mt-2 text-fg-2">As vagas do beta são liberadas aos poucos. Deixe seu e-mail e você recebe o convite assim que chegar a sua vez.</p>

              {TURNSTILE_SITE_KEY ? (
                <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4 text-left" noValidate>
                  <Input
                    label="Seu e-mail"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="voce@exemplo.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    error={error ?? undefined}
                  />
                  {/* Campo-armadilha: invisível para pessoas, preenchido por robôs. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label>
                      Site
                      <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} name="website" />
                    </label>
                  </div>
                  <TurnstileCaptcha siteKey={TURNSTILE_SITE_KEY} resetSignal={resetSignal} onToken={setToken} />
                  <Button type="submit" size="lg" fullWidth loading={status === "sending"} disabled={!token || status === "sending"}>
                    Quero meu convite
                  </Button>
                  <p className="text-center text-xs text-fg-4">Usamos seu e-mail só para o convite do beta. Nada de spam.</p>
                </form>
              ) : (
                <p className="mt-7 rounded-xl bg-raised px-4 py-3 text-sm text-fg-3">A lista de espera abre em breve. Volte daqui a pouco!</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
