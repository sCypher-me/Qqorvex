import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { CURRENT_TERMS_VERSION, isPasswordValid, useAuth } from "@qqorvex/auth";
import { Button, Notice } from "@qqorvex/ui";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";

export function AcceptInvitePage() {
  const { client, session, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  if (isLoading) return null;
  if (done) return <Navigate to="/" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!acceptedTerms) { setError("Leia e aceite os Termos de Uso para concluir o cadastro."); return; }
    if (!isPasswordValid(password) || password !== confirmation) { setError("Confira os requisitos da senha e repita a mesma senha nos dois campos."); return; }
    setBusy(true);
    try {
      const { error: consentError } = await client.rpc("record_user_terms_acceptance", { p_terms_version: CURRENT_TERMS_VERSION, p_source: "invite_acceptance" });
      if (consentError) throw new Error("Não foi possível registrar a aceitação dos Termos. Tente novamente.");
      const result = await updatePassword(password);
      if (result.error) setError(result.error); else setDone(true);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível concluir seu cadastro. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AuthLayout>{session ? <form onSubmit={submit} className="flex flex-col gap-5">
    <h1 className="font-display text-2xl font-semibold text-fg">Bem-vindo ao Qqorvex</h1>
    <p className="text-sm text-fg-3">Defina uma senha para acessar sua conta.</p>
    <PasswordField label="Senha" value={password} onChange={setPassword} autoComplete="new-password" showChecklist />
    <PasswordField label="Confirmar senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
    <label className="flex items-start gap-3 text-sm leading-6 text-fg-3"><input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 size-4 shrink-0 accent-gold" /><span>Li e aceito os <Link to="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-gold-fg underline underline-offset-2">Termos de Uso</Link> e estou ciente das informações sobre dados pessoais descritas no documento.</span></label>
    {error && <Notice>{error}</Notice>}<Button type="submit" loading={busy} disabled={busy || !acceptedTerms}>Concluir cadastro</Button>
  </form> : <div className="flex flex-col gap-4"><Notice>Este convite é inválido ou expirou. Peça um novo convite ao administrador.</Notice><Link to="/login" className="text-gold-fg">Voltar para entrar</Link></div>}</AuthLayout>;
}
