import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { isPasswordValid, useAuth } from "@qqorvex/auth";
import { Button, Notice } from "@qqorvex/ui";
import { AuthLayout } from "./AuthLayout";
import { PasswordField } from "../components/PasswordField";

export function AcceptInvitePage() {
  const { session, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (isLoading) return null;
  if (done) return <Navigate to="/" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!isPasswordValid(password) || password !== confirmation) { setError("Confira os requisitos da senha e repita a mesma senha nos dois campos."); return; }
    setBusy(true);
    try { const result = await updatePassword(password); if (result.error) setError(result.error); else setDone(true); }
    catch { setError("Não foi possível definir sua senha. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AuthLayout>{session ? <form onSubmit={submit} className="flex flex-col gap-5">
    <h1 className="font-display text-2xl font-semibold text-fg">Bem-vindo ao Qqorvex</h1>
    <p className="text-sm text-fg-3">Defina uma senha para acessar sua conta.</p>
    <PasswordField label="Senha" value={password} onChange={setPassword} autoComplete="new-password" showChecklist />
    <PasswordField label="Confirmar senha" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
    {error && <Notice>{error}</Notice>}<Button type="submit" loading={busy} disabled={busy}>Concluir cadastro</Button>
  </form> : <div className="flex flex-col gap-4"><Notice>Este convite é inválido ou expirou. Peça um novo convite ao administrador.</Notice><Link to="/login" className="text-gold-fg">Voltar para entrar</Link></div>}</AuthLayout>;
}
