import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { clearPendingTermsReceipt, CURRENT_TERMS_VERSION, hasPendingTermsReceipt, useAuth, type TermsAcceptanceSource } from "@qqorvex/auth";
import { Button, Notice } from "@qqorvex/ui";

export function TermsAcceptanceGate({ children }: { children: ReactNode }) {
  const { client, session } = useAuth();
  const user = session?.user;
  const [gateStatus, setGateStatus] = useState<"checking" | "required" | "accepted" | "error">("checking");
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processing = useRef(false);

  const recordAcceptance = useCallback(async (source: TermsAcceptanceSource) => {
    if (!user || processing.current) return;
    processing.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await client.rpc("record_user_terms_acceptance", {
        p_terms_version: CURRENT_TERMS_VERSION,
        p_source: source,
      });
      if (rpcError) throw new Error("Não foi possível registrar sua aceitação. Tente novamente em instantes.");
      clearPendingTermsReceipt();
      setGateStatus("accepted");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível registrar sua aceitação.");
    } finally {
      processing.current = false;
      setBusy(false);
    }
  }, [client, user]);

  useEffect(() => {
    if (!user) return;
    let current = true;
    setGateStatus("checking");
    void (async () => {
      try {
        const { data, error: rpcError } = await client.rpc("requires_current_terms_acceptance");
        if (!current) return;
        if (rpcError) {
          setError("Não foi possível verificar a aceitação dos Termos. Confira sua conexão e tente novamente.");
          setGateStatus("error");
        } else if (data) {
          setGateStatus("required");
          if (hasPendingTermsReceipt(user.created_at)) await recordAcceptance("oauth_registration");
        } else {
          clearPendingTermsReceipt();
          setGateStatus("accepted");
        }
      } catch {
        if (!current) return;
        setError("Não foi possível verificar a aceitação dos Termos. Confira sua conexão e tente novamente.");
        setGateStatus("error");
      }
    })();
    return () => { current = false; };
  }, [client, user?.id, checkAttempt, recordAcceptance]);

  if (gateStatus === "accepted") return <>{children}</>;

  if (gateStatus === "checking") {
    return <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-fg" role="status" aria-live="polite"><p className="text-sm text-fg-3">Verificando os Termos de Uso…</p></main>;
  }

  if (gateStatus === "error") {
    return <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-fg"><section className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-9">
      <h1 className="m-0 font-display text-2xl font-semibold">Não foi possível verificar os Termos</h1>
      <div className="mt-4"><Notice tone="error">{error}</Notice></div>
      <Button type="button" variant="primary" size="lg" fullWidth onClick={() => { setError(null); setCheckAttempt((value) => value + 1); }} className="mt-5">Tentar novamente</Button>
    </section></main>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!checked) return;
    await recordAcceptance("signup_gate");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-fg">
      <form onSubmit={submit} className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-9">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-gold-fg">Antes de continuar</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">Leia e aceite os Termos de Uso</h1>
        <p className="mt-3 text-sm leading-6 text-fg-3">Sua conta foi criada por um fluxo que não coletou a aceitação junto ao formulário. Leia o documento e confirme para liberar o Qqorvex.</p>
        <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-fg-2">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1 size-4 shrink-0 accent-gold" />
          <span>Li e aceito os <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-gold-fg underline underline-offset-2">Termos de Uso</Link> e estou ciente das informações sobre dados pessoais descritas no documento.</span>
        </label>
        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={!checked || busy} className="mt-6">Aceitar e continuar</Button>
        <p className="mt-4 text-center text-xs leading-5 text-fg-4">Versão {CURRENT_TERMS_VERSION}. Você pode consultar o documento completo a qualquer momento.</p>
      </form>
    </main>
  );
}
