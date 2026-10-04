import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { requestEmailLogin, verifyEmailLogin, useAuth } from "@qqorvex/auth";
import { Button, Input, Notice, TurnstileCaptcha } from "@qqorvex/ui";
import { AuthLayout } from "./AuthLayout";

export function EmailLoginPage() {
  const { client, session, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
  if (!isLoading && session) return <Navigate to="/" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!sent && siteKey && !captcha) { setError("Conclua a verificação de segurança."); return; }
    setBusy(true);
    try {
      const result = sent ? await verifyEmailLogin(client, email, token) : await requestEmailLogin(client, email, captcha ?? undefined);
      if (result.error) setError(result.error); else if (!sent) setSent(true);
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); setCaptcha(null); setReset(value => value + 1); }
  }
  return <AuthLayout><form onSubmit={submit} className="flex flex-col gap-5">
    <h1 className="font-display text-2xl font-semibold text-fg">Entrar pelo e-mail</h1>
    <p className="text-sm text-fg-3">Use o link ou o código recebido para acessar sua conta cadastrada.</p>
    <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={sent || busy} />
    {sent ? <><Notice>Se o endereço estiver cadastrado, você receberá um e-mail. Abra o link ou digite o código abaixo.</Notice><Input label="Código recebido" value={token} onChange={event => setToken(event.target.value)} autoComplete="one-time-code" inputMode="numeric" required /></> : <TurnstileCaptcha siteKey={siteKey} resetSignal={reset} onToken={setCaptcha} />}
    {error && <Notice>{error}</Notice>}
    <Button type="submit" loading={busy} disabled={busy}>{sent ? "Verificar código" : "Enviar acesso por e-mail"}</Button>
    {sent && <Button type="button" variant="secondary" disabled={busy} onClick={() => { setSent(false); setToken(""); setError(null); }}>Trocar e-mail ou solicitar novo acesso</Button>}
    <Link to="/login" className="text-sm text-gold-fg">Voltar para entrar com senha</Link>
  </form></AuthLayout>;
}
