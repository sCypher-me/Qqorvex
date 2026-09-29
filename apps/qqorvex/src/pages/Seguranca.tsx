import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, ConfirmDialog, Input, Notice, SectionTitle, Skeleton, SkeletonList } from "@qqorvex/ui";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useGoogleCalendarConnection, useDisconnectGoogleCalendar } from "@qqorvex/module-agenda";
import {
  useAuth,
  useMfaFactors,
  enrollTotp,
  verifyTotpEnrollment,
  unenrollFactor,
  usePasskeys,
  registerPasskey,
  renamePasskey,
  deletePasskey,
  useSessions,
  revokeSession,
  parseUserAgent,
  useSecurityLoginHistory,
  usePin,
  setSecurityPin,
  useIdentities,
  OAUTH_PROVIDERS,
  type TotpEnrollment,
  type OAuthProviderId,
} from "@qqorvex/auth";

/** "ativo há X" a partir de refreshed_at/created_at — só pra exibição, sem lib nova. */
function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const loginDateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(isoDate)).replace(".", "").replace(" de ", " ");
}

/** Sessão sem atividade há mais de um dia aparece com o ponto cinza (continua válida até ser encerrada). */
const RECENT_ACTIVITY_MS = 24 * 60 * 60 * 1000;
type SecuritySection = "access" | "devices" | "recovery" | "privacy" | "vault";

function SecurityCard({ id, title, pill, children }: { id?: string; title: string; pill?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 flex min-w-0 flex-col gap-4 p-5 sm:p-6 scroll-mt-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <h2 className="min-w-0 flex-1 font-display text-lg font-semibold text-fg">{title}</h2>
        {pill}
      </div>
      {children}
    </section>
  );
}

function CardText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-fg-2 leading-relaxed">{children}</p>;
}

/** E-mail/senha + os 3 provedores OAuth apontam pra uma única identidade (o Supabase já faz o
 * account linking automático por e-mail verificado) — aqui só gerencia quais estão conectados.
 * "Conectar" precisa do "Allow manual linking" habilitado no painel do Supabase. */
function ConnectedAccountsCard({ client, emailConfirmed }: { client: SupabaseClient<Database>; emailConfirmed: boolean }) {
  const { identities, isLoading, connect, disconnect } = useIdentities(client);
  const [error, setError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  async function handleConnect(provider: OAuthProviderId) {
    setError(null);
    setBusyProvider(provider);
    const { error } = await connect(provider);
    setBusyProvider(null);
    if (error) setError(error);
  }

  async function handleDisconnect(providerId: OAuthProviderId) {
    const identity = identities.find((i) => i.provider === providerId);
    if (!identity) return;
    setError(null);
    setBusyProvider(providerId);
    const { error } = await disconnect(identity);
    setBusyProvider(null);
    if (error) setError(error);
  }

  return (
    <SecurityCard title="Contas usadas para entrar">
      <CardText>Google, GitHub e Discord aqui são identidades de login. Acesso a serviços e dados externos aparece separadamente em Permissões de aplicativos.</CardText>
      {isLoading ? (
        <SkeletonList rows={2} />
      ) : (
        <ul className="flex flex-col">
          <li className="border-t border-line-soft flex flex-wrap items-center gap-2.5 py-3">
            <span className="min-w-[5rem] flex-1 text-sm">E-mail</span>
            <Badge tone={emailConfirmed ? "success" : "outline"}>{emailConfirmed ? "Verificado" : "Não verificado"}</Badge>
          </li>
          {OAUTH_PROVIDERS.map(({ id, label }) => {
            const connected = identities.some((i) => i.provider === id);
            return (
              <li key={id} className="border-t border-line-soft flex flex-wrap items-center gap-2.5 py-3">
                <span className="min-w-[5rem] flex-1 text-sm">{label}</span>
                {connected ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge tone="success">Conectado</Badge>
                    <Button variant="ghost" size="xs" onClick={() => handleDisconnect(id)} disabled={busyProvider === id}>
                      {busyProvider === id ? "Desconectando…" : "Desconectar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="quiet" size="xs" onClick={() => handleConnect(id)} disabled={busyProvider === id}>
                    {busyProvider === id ? "Conectando…" : "Conectar"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </SecurityCard>
  );
}

function ThirdPartyPermissionsCard({ client }: { client: SupabaseClient<Database> }) {
  const { connection, isLoading, error } = useGoogleCalendarConnection(client);
  const disconnect = useDisconnectGoogleCalendar(client);

  return (
    <SecurityCard title="Permissões de aplicativos terceiros">
      <CardText>Revogue aqui as integrações que acessam serviços externos. Remover uma permissão impede novas sincronizações; eventos já copiados para o Google permanecem na sua conta Google.</CardText>
      {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : error ? null : connection ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-fg">Google Calendar</p>
              <p className="mt-1 text-xs text-fg-2">Conectado para sincronizar a agenda do Qqorvex.</p>
            </div>
            <Badge tone="success">Conectado</Badge>
          </div>
          <p className="text-xs leading-relaxed text-fg-3">O consentimento atual permite ler e editar calendários Google. O app cria um calendário dedicado, mas o escopo autorizado pelo Google é amplo.</p>
          <Button type="button" variant="destructive" size="sm" className="self-start" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            {disconnect.isPending ? "Revogando acesso…" : "Revogar acesso ao Google"}
          </Button>
          {disconnect.error && <Notice tone="error">{disconnect.error instanceof Error ? disconnect.error.message : "Não foi possível revogar a conexão."}</Notice>}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm leading-relaxed text-fg-3">Nenhum serviço externo tem uma integração de dados ativa no momento. Contas de login são gerenciadas no card ao lado.</p>
      )}
      {error && <Notice tone="error">Não foi possível verificar as permissões externas.</Notice>}
    </SecurityCard>
  );
}

/** Central de Segurança: autenticação, métodos de acesso, sessões e proteção do Cofre. */
export function SecuritySettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const { client, session } = useAuth();
  const [activeSection, setActiveSection] = useState<SecuritySection>("access");
  const { factors, isLoading, refresh } = useMfaFactors(client);
  const { passkeys, isLoading: passkeysLoading, refresh: refreshPasskeys } = usePasskeys(client);
  const { sessions, currentSessionId, isLoading: sessionsLoading, refresh: refreshSessions } = useSessions(client);
  const { events: loginEvents, isLoading: loginHistoryLoading, error: loginHistoryError, refresh: refreshLoginHistory } = useSecurityLoginHistory(client);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { hasPin, isLoading: pinLoading, refresh: refreshPin } = usePin(client);
  const [pinCurrentValue, setPinCurrentValue] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirmValue, setPinConfirmValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [confirmDeletePasskeyId, setConfirmDeletePasskeyId] = useState<string | null>(null);
  const [confirmRevokeSessionId, setConfirmRevokeSessionId] = useState<string | null>(null);
  const [confirmSignOutOthers, setConfirmSignOutOthers] = useState(false);
  const [confirmSignOutEverywhere, setConfirmSignOutEverywhere] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);

  const verifiedTotpFactors = factors.filter((factor) => factor.status === "verified");
  const verifiedTotp = verifiedTotpFactors[0];
  const strongSignInMethods = [verifiedTotpFactors.length > 0, passkeys.length > 0].filter(Boolean).length;

  async function handleEnable() {
    setError(null);
    setBusy(true);
    const { enrollment: result, error: enrollError } = await enrollTotp(client);
    setBusy(false);
    if (enrollError) setError(enrollError);
    else setEnrollment(result);
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setError(null);
    setBusy(true);
    const { error: verifyError } = await verifyTotpEnrollment(client, enrollment.factorId, code);
    setBusy(false);
    if (verifyError) {
      setError(verifyError);
      return;
    }
    setEnrollment(null);
    setCode("");
    refresh();
  }

  async function handleRemove(factorId: string) {
    setBusy(true);
    const result = await unenrollFactor(client, factorId);
    setBusy(false);
    if (result.error) setError(result.error);
    else refresh();
  }

  async function handleAddPasskey() {
    setPasskeyError(null);
    setPasskeyBusy(true);
    const { error: registerError } = await registerPasskey(client);
    setPasskeyBusy(false);
    if (registerError) {
      setPasskeyError(registerError);
      return;
    }
    refreshPasskeys();
  }

  async function handleSaveRename(passkeyId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setPasskeyError(null);
    setPasskeyBusy(true);
    const result = await renamePasskey(client, passkeyId, trimmed);
    setPasskeyBusy(false);
    if (result.error) {
      setPasskeyError(result.error);
      return;
    }
    setRenamingId(null);
    refreshPasskeys();
  }

  async function handleDeletePasskey(passkeyId: string) {
    setPasskeyError(null);
    setPasskeyBusy(true);
    const result = await deletePasskey(client, passkeyId);
    setPasskeyBusy(false);
    if (result.error) {
      setPasskeyError(result.error);
      return;
    }
    refreshPasskeys();
  }

  async function handleRevokeSession(sessionId: string) {
    setSessionError(null);
    setSessionsBusy(true);
    const result = await revokeSession(client, sessionId);
    setSessionsBusy(false);
    if (result.error) setSessionError(result.error);
    else refreshSessions();
  }

  async function handleSignOutOthers() {
    setSessionError(null);
    setSessionsBusy(true);
    const { error: signOutError } = await client.auth.signOut({ scope: "others" });
    setSessionsBusy(false);
    if (signOutError) setSessionError(signOutError.message);
    else refreshSessions();
  }

  async function handleSignOutEverywhere() {
    setSessionError(null);
    setSessionsBusy(true);
    const { error: signOutError } = await client.auth.signOut({ scope: "global" });
    setSessionsBusy(false);
    if (signOutError) {
      setSessionError(signOutError.message);
      return;
    }
    // O evento SIGNED_OUT do AuthProvider encerra a sessão atual e encaminha para o login.
  }

  async function handleChangeEmail(event: FormEvent) {
    event.preventDefault();
    setAccountError(null);
    setAccountMessage(null);
    const email = newEmail.trim();
    if (!email || email.toLowerCase() === session?.user.email?.toLowerCase()) {
      setAccountError("Informe um endereço diferente do e-mail atual.");
      return;
    }

    setAccountBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ email });
      if (updateError) {
        setAccountError(updateError.message);
        return;
      }
      setNewEmail("");
      setAccountMessage("Solicitação enviada. Confirme a alteração pelo link enviado ao seu e-mail para concluir a troca.");
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "Não foi possível solicitar a troca de e-mail.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setAccountError(null);
    setAccountMessage(null);
    if (newPassword.length < 8) {
      setAccountError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAccountError("As senhas digitadas não coincidem.");
      return;
    }

    setAccountBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password: newPassword });
      if (updateError) {
        setAccountError(updateError.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      const { error: revokeError } = await client.auth.signOut({ scope: "others" });
      refreshSessions();
      setAccountMessage(revokeError
        ? "Senha atualizada. Não foi possível encerrar as outras sessões automaticamente; revise os dispositivos conectados."
        : "Senha atualizada e as outras sessões foram encerradas.");
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "Não foi possível atualizar a senha.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function handleSetPin(event: FormEvent) {
    event.preventDefault();
    setPinError(null);
    setPinSaved(false);
    if (pinValue.trim() !== pinConfirmValue.trim()) {
      setPinError("Os PINs digitados são diferentes.");
      return;
    }
    setPinBusy(true);
    const { error: setPinError_ } = await setSecurityPin(client, pinValue.trim(), hasPin ? pinCurrentValue.trim() : undefined);
    setPinBusy(false);
    if (setPinError_) {
      setPinError(setPinError_);
      return;
    }
    setPinValue("");
    setPinConfirmValue("");
    setPinCurrentValue("");
    setPinSaved(true);
    refreshPin();
  }

  const pinFieldClass =
    "q-input w-[150px] font-mono text-[15px] tracking-[.3em] placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal";
  const accessStatus = isLoading || passkeysLoading
    ? "Verificando acesso"
    : strongSignInMethods === 2
      ? "Acesso reforçado"
      : strongSignInMethods === 1
        ? "Boa proteção"
        : "Reforce sua proteção";
  return (
    <div className={`${embedded ? "flex w-full flex-col gap-5" : " editorial-module-page flex w-full max-w-none flex-col gap-5 pb-8"}`}>
      {embedded && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Acesso e proteção</p>
          <h2 className="font-display text-xl font-semibold text-fg text-balance">Segurança da conta</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-fg-2 text-pretty">Escolha uma área para revisar. Suas credenciais, dispositivos e opções de recuperação ficam organizados em etapas.</p>
        </div>
      )}
      {!embedded && <section className="editorial-module-hero" aria-labelledby="security-page-title">
        <div className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Conta / Segurança</p>
          <h1 id="security-page-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-fg text-balance sm:text-4xl">Proteja seu acesso.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-2 text-pretty">Gerencie como você entra, revise os dispositivos conectados e proteja os documentos do Cofre — cada coisa no seu lugar.</p>
          </div>
      </section>}

      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" aria-label="Resumo de segurança">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Estado do acesso</p>
          <p className="mt-1 font-display text-lg font-semibold text-fg text-balance">{accessStatus}</p>
          <p className="mt-1 text-sm text-fg-2 text-pretty">{isLoading || passkeysLoading ? "Conferindo seus métodos de entrada…" : `${strongSignInMethods} de 2 proteções recomendadas configuradas.`}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2" aria-label="Métodos configurados">
          <Badge tone={isLoading ? "neutral" : verifiedTotp ? "success" : "neutral"}>2FA · {isLoading ? "…" : verifiedTotp ? "Ativa" : "Inativa"}</Badge>
          <Badge tone={passkeysLoading ? "neutral" : passkeys.length ? "success" : "neutral"}>Passkeys · <span className="tabular-nums">{passkeysLoading ? "…" : passkeys.length}</span></Badge>
          <Badge tone={sessionsLoading ? "neutral" : "info"}>Sessões · <span className="tabular-nums">{sessionsLoading ? "…" : sessions.length}</span></Badge>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Áreas de segurança">
        {([
          ["access", "Credenciais"],
          ["devices", "Dispositivos"],
          ["recovery", "Recuperação"],
          ["privacy", "Contas e apps"],
          ["vault", "Cofre"],
        ] as const).map(([id, label]) => (
          <Button key={id} type="button" size="sm" variant={activeSection === id ? "secondary" : "quiet"} className="w-full justify-center" aria-pressed={activeSection === id} onClick={() => setActiveSection(id)}>{label}</Button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
          <section id="security-access" hidden={activeSection !== "access"} className="scroll-mt-6" aria-label="Credenciais e acesso">
            <SectionTitle meta="e-mail, senha, autenticação e entrada sem senha">Credenciais e acesso</SectionTitle>
            <div className="mt-3 grid min-w-0 items-start gap-4 lg:grid-cols-2">
              <div className="min-w-0 lg:col-span-2">
                <SecurityCard title="E-mail e senha">
                <div className="grid min-w-0 gap-5 md:grid-cols-2">
                  <form onSubmit={(event) => void handleChangeEmail(event)} className="flex min-w-0 flex-col gap-3">
                    <div>
                      <p className="text-xs text-fg-3">E-mail atual</p>
                      <p className="mt-1 break-all text-sm font-medium text-fg">{session?.user.email ?? "Não disponível"}</p>
                    </div>
                    <Input label="Novo e-mail" type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="voce@exemplo.com" required />
                    <Button type="submit" variant="secondary" className="self-start" disabled={accountBusy || !newEmail.trim()}>{accountBusy ? "Enviando…" : "Solicitar troca de e-mail"}</Button>
                  </form>
                  <form onSubmit={(event) => void handleChangePassword(event)} className="flex min-w-0 flex-col gap-3 border-t border-line pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                    <p className="text-xs leading-relaxed text-fg-3">A senha precisa ter pelo menos 8 caracteres.</p>
                    <Input label="Nova senha" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                    <Input label="Confirmar nova senha" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                    <Button type="submit" variant="secondary" className="self-start" disabled={accountBusy || !newPassword || !confirmPassword}>{accountBusy ? "Salvando…" : "Atualizar senha"}</Button>
                  </form>
                </div>
                {accountError && <Notice tone="error">{accountError}</Notice>}
                {accountMessage && !accountError && <Notice tone="success">{accountMessage}</Notice>}
                </SecurityCard>
              </div>

              <SecurityCard id="security-authenticator" title="Verificação em duas etapas" pill={isLoading ? undefined : verifiedTotp ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>}>
                {isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : enrollment ? (
                  <form onSubmit={handleConfirm} className="flex min-w-0 flex-col gap-3">
                    <CardText>{verifiedTotpFactors.length > 0 ? "Este será um segundo app autenticador. Cadastre-o em outro dispositivo para ter uma alternativa se perder acesso ao primeiro." : "Escaneie o QR code com um app autenticador e digite o código de 6 dígitos para confirmar."}</CardText>
                    <img src={enrollment.qrCodeDataUri} alt="QR code do 2FA" className="h-40 w-40 self-center rounded-md bg-white p-2" />
                    <p className="break-all rounded-lg border border-line bg-canvas p-3 font-mono text-xs text-fg-3">Não conseguiu escanear? Chave manual: {enrollment.secret}</p>
                    <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" aria-label="Código de 6 dígitos" className="q-input w-full font-mono tracking-[.2em] placeholder:font-sans placeholder:tracking-normal" />
                    <div className="flex flex-wrap gap-2.5">
                      <Button type="submit" variant="primary" disabled={busy || code.trim().length !== 6}>{busy ? "Verificando…" : "Confirmar 2FA"}</Button>
                      <Button type="button" variant="ghost" onClick={() => { setEnrollment(null); setCode(""); }}>Cancelar</Button>
                    </div>
                  </form>
                ) : verifiedTotp ? (
                  <>
                    <CardText>O Supabase ainda não oferece códigos de backup. Para recuperação gratuita, cadastre outro app autenticador em um dispositivo separado e guarde-o em local seguro.</CardText>
                    <ul className="flex min-w-0 flex-col">
                      {factors.map((factor, index) => (
                        <li key={factor.id} className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-2.5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{factor.friendlyName || `App autenticador ${index + 1}`}</p>
                            <p className="mt-0.5 text-xs text-fg-3">{factor.status === "verified" ? "Ativo" : "Cadastro pendente"}</p>
                          </div>
                          <Button variant="quiet" size="xs" onClick={() => void handleRemove(factor.id)} disabled={busy}>{busy ? "Atualizando…" : "Remover"}</Button>
                        </li>
                      ))}
                    </ul>
                    <Button variant="secondary" className="self-start" onClick={() => void handleEnable()} disabled={busy || factors.length >= 10}>{busy ? "Preparando…" : "Adicionar app de reserva"}</Button>
                  </>
                ) : (
                  <>
                    <CardText>Adicione uma confirmação pelo celular além da senha usando um app autenticador.</CardText>
                    <Button variant="primary" className="self-start" onClick={() => void handleEnable()} disabled={busy}>{busy ? "Preparando…" : "Configurar 2FA"}</Button>
                  </>
                )}
                {error && <Notice tone="error">{error}</Notice>}
              </SecurityCard>

              <SecurityCard id="security-passkeys" title="Passkeys" pill={passkeysLoading ? undefined : <Badge tone={passkeys.length ? "success" : "neutral"}>{passkeys.length ? `${passkeys.length} cadastrada${passkeys.length === 1 ? "" : "s"}` : "Opcional"}</Badge>}>
                <CardText>Entre sem senha com biometria, Windows Hello ou uma chave de segurança. A passkey substitui a senha no login; não é um segundo fator.</CardText>
                {passkeysLoading ? <SkeletonList rows={2} subtitle={false} className="py-2.5" /> : passkeys.length > 0 ? (
                  <ul className="flex min-w-0 flex-col">
                    {passkeys.map((passkey) => (
                      <li key={passkey.id} className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-2.5 py-3">
                        {renamingId === passkey.id ? (
                          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                            <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Nome da passkey" className="q-input min-w-[120px] flex-1" autoFocus />
                            <Button type="button" variant="secondary" size="sm" onClick={() => void handleSaveRename(passkey.id)} disabled={passkeyBusy || !renameValue.trim()}>{passkeyBusy ? "Salvando…" : "Salvar"}</Button>
                            <Button type="button" variant="quiet" size="sm" onClick={() => setRenamingId(null)} disabled={passkeyBusy}>Cancelar</Button>
                          </div>
                        ) : (
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <button type="button" title="Renomear passkey" onClick={() => { setRenamingId(passkey.id); setRenameValue(passkey.friendlyName ?? ""); }} className="truncate text-left text-sm font-medium text-fg hover:underline">{passkey.friendlyName ?? "Passkey sem nome"}</button>
                            <span className="font-mono text-[11px] leading-relaxed text-fg-3">Criada {formatShortDate(passkey.createdAt)} · {passkey.lastUsedAt ? `usada ${formatRelativeTime(passkey.lastUsedAt)}` : "ainda não usada"}</span>
                          </div>
                        )}
                        {renamingId !== passkey.id && <Button type="button" variant="quiet" size="xs" onClick={() => setConfirmDeletePasskeyId(passkey.id)} disabled={passkeyBusy}>Remover</Button>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-xs leading-relaxed text-fg-3">Nenhuma passkey cadastrada. Você pode continuar entrando com sua senha.</p>
                )}
                <Button variant="primary" className="self-start" onClick={() => void handleAddPasskey()} disabled={passkeyBusy}>{passkeyBusy ? "Aguardando dispositivo…" : "Cadastrar passkey"}</Button>
                {passkeyError && <Notice tone="error">{passkeyError}</Notice>}
              </SecurityCard>
            </div>
          </section>

          <section id="security-recovery" hidden={activeSection !== "recovery"} className="scroll-mt-6" aria-label="Recuperação de conta">
            <SectionTitle meta="prepare uma alternativa antes de precisar dela">Recuperação da conta</SectionTitle>
            <div className="mt-3">
              <SecurityCard title="Métodos disponíveis">
                <CardText>Combine métodos diferentes para não perder o acesso. Estes são os recursos que estão realmente disponíveis nesta conta:</CardText>
                <ul className="flex min-w-0 flex-col">
                  <li className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-2.5 py-3">
                    <span className="min-w-0 flex-1 text-sm">E-mail principal</span>
                    <Badge tone={session?.user.email_confirmed_at ? "success" : "warning"}>{session?.user.email_confirmed_at ? "Verificado" : "Verifique o e-mail"}</Badge>
                  </li>
                  <li className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-2.5 py-3">
                    <span className="min-w-0 flex-1 text-sm">Apps autenticadores</span>
                    <Badge tone={verifiedTotpFactors.length > 1 ? "success" : "neutral"}>{verifiedTotpFactors.length} cadastrado{verifiedTotpFactors.length === 1 ? "" : "s"}</Badge>
                  </li>
                  <li className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-2.5 py-3">
                    <span className="min-w-0 flex-1 text-sm">Passkeys</span>
                    <Badge tone={passkeys.length ? "success" : "neutral"}>{passkeys.length} cadastrada{passkeys.length === 1 ? "" : "s"}</Badge>
                  </li>
                </ul>
                <div className="rounded-xl border border-warning/25 bg-warning-bg/30 p-3.5">
                  <p className="text-xs font-medium text-fg">Telefone e códigos de backup</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-2">Não há envio de SMS/WhatsApp configurado. O Supabase também não oferece códigos de backup para TOTP; para uma alternativa gratuita, cadastre um segundo app autenticador em outro dispositivo.</p>
                </div>
                <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setActiveSection("access")}>Abrir métodos de acesso</Button>
              </SecurityCard>
            </div>
          </section>

          <section id="security-sessions" hidden={activeSection !== "devices"} className="scroll-mt-6" aria-label="Sessões e dispositivos">
            <SectionTitle meta="revise e encerre acessos">Dispositivos conectados</SectionTitle>
            <div className="mt-3">
              <SecurityCard title="Sessões ativas" pill={sessionsLoading ? undefined : <Badge tone="info">{sessions.length} {sessions.length === 1 ? "dispositivo" : "dispositivos"}</Badge>}>
                {sessionsLoading ? <SkeletonList rows={3} /> : sessions.length > 0 ? (
                  <ul className="flex min-w-0 flex-col">
                    {sessions.map((deviceSession) => {
                      const { browser, os } = parseUserAgent(deviceSession.userAgent);
                      const isCurrent = deviceSession.id === currentSessionId;
                      const lastActivity = deviceSession.refreshedAt ?? deviceSession.createdAt;
                      const isRecent = isCurrent || Date.now() - new Date(lastActivity).getTime() < RECENT_ACTIVITY_MS;
                      return (
                        <li key={deviceSession.id} className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-3 py-3">
                          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${isRecent ? "bg-success" : "bg-text-muted"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-fg">{browser} <span className="text-fg-3">·</span> {os}</span>
                              {isCurrent && <Badge tone="info">Este dispositivo</Badge>}
                            </div>
                            <span className="mt-0.5 block break-words font-mono text-[11px] leading-relaxed text-fg-3">{deviceSession.ip ?? "IP desconhecido"} · ativo {formatRelativeTime(lastActivity)}</span>
                          </div>
                          {!isCurrent && <Button type="button" variant="quiet" size="xs" onClick={() => setConfirmRevokeSessionId(deviceSession.id)} disabled={sessionsBusy}>{sessionsBusy ? "Encerrando…" : "Encerrar"}</Button>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-fg-3">Não foi possível listar sessões ativas agora.</p>
                )}
                {sessionError && <Notice tone="error">{sessionError}</Notice>}
                <Button type="button" variant="destructive" className="self-start" onClick={() => setConfirmSignOutOthers(true)} disabled={sessionsBusy || sessionsLoading || sessions.length <= 1}>{sessionsBusy ? "Encerrando sessões…" : "Encerrar outras sessões"}</Button>
                <Button type="button" variant="ghost" className="self-start text-danger hover:text-danger" onClick={() => setConfirmSignOutEverywhere(true)} disabled={sessionsBusy || sessionsLoading || sessions.length === 0}>Desconectar de tudo</Button>
              </SecurityCard>
            </div>
          </section>

          <section id="security-history" hidden={activeSection !== "devices"} className="scroll-mt-6" aria-label="Histórico de login">
            <SectionTitle meta="eventos dos últimos 90 dias">Histórico de login</SectionTitle>
            <div className="mt-3">
              <SecurityCard title="Acessos recentes" pill={<Badge tone="neutral">90 dias</Badge>}>
                <CardText>Veja quando sua conta foi acessada e de qual dispositivo. O IP é exibido sem consulta a serviços externos de localização.</CardText>
                {loginHistoryLoading ? <SkeletonList rows={3} /> : loginEvents.length > 0 ? (
                  <ul className="flex min-w-0 flex-col">
                    {loginEvents.map((event) => {
                      const { browser, os } = parseUserAgent(event.userAgent);
                      return (
                        <li key={event.id} className="border-t border-line-soft flex min-w-0 flex-wrap items-center gap-3 py-3">
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-fg">{browser} <span className="text-fg-3">·</span> {os}</span>
                              <Badge tone="info">{event.action === "user_signedup" ? "Conta criada" : "Login"}</Badge>
                            </div>
                            <span className="mt-0.5 block text-xs text-fg-2">{loginDateTime.format(new Date(event.occurredAt))}</span>
                            <span className="mt-0.5 block break-all font-mono text-[11px] text-fg-3">IP: {event.ipAddress ?? "não registrado"}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : loginHistoryError ? null : (
                  <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm leading-relaxed text-fg-3">Ainda não há eventos disponíveis. Para começar a registrar acessos, habilite o armazenamento de Audit Logs no banco em Supabase → Authentication → Audit Logs. O histórico começa a partir da ativação.</p>
                )}
                {loginHistoryError && <Notice tone="error">Não foi possível carregar o histórico: {loginHistoryError}</Notice>}
                <Button type="button" variant="quiet" size="sm" className="self-start" onClick={() => void refreshLoginHistory()} disabled={loginHistoryLoading}>{loginHistoryLoading ? "Atualizando…" : "Atualizar histórico"}</Button>
              </SecurityCard>
            </div>
          </section>
          <section id="security-linked-accounts" hidden={activeSection !== "privacy"} className="scroll-mt-6" aria-label="Contas e permissões">
            <SectionTitle meta="revise identidades de login e serviços conectados">Contas e aplicativos</SectionTitle>
            <div className="mt-3 grid min-w-0 items-start gap-4 xl:grid-cols-2">
              <ThirdPartyPermissionsCard client={client} />
              <ConnectedAccountsCard client={client} emailConfirmed={session?.user.email_confirmed_at != null} />
            </div>
          </section>

          <section id="security-vault" hidden={activeSection !== "vault"} className="scroll-mt-6" aria-label="Proteção do Cofre">
            <SectionTitle meta="documentos protegidos">Cofre</SectionTitle>
            <div className="mt-3">
              <SecurityCard title="PIN de acesso" pill={pinLoading ? undefined : hasPin ? <Badge tone="success">Definido</Badge> : <Badge>Sem PIN</Badge>}>
                <CardText>Este PIN protege somente os documentos marcados no Cofre. Ele não altera a senha nem o login da sua conta.</CardText>
                {pinLoading ? <Skeleton className="h-11 w-full rounded-xl" /> : (
                  <form onSubmit={handleSetPin} className="flex min-w-0 flex-col gap-3.5">
                    <p className="text-xs text-fg-3">Use pelo menos 6 dígitos numéricos.</p>
                    <div className="flex min-w-0 flex-wrap gap-2.5">
                      {hasPin && <input type="password" inputMode="numeric" autoComplete="current-password" value={pinCurrentValue} onChange={(event) => setPinCurrentValue(event.target.value.replace(/\D/g, ""))} placeholder="PIN atual" aria-label="PIN atual" className={`${pinFieldClass} max-w-full`} />}
                      <input type="password" inputMode="numeric" autoComplete="new-password" value={pinValue} onChange={(event) => setPinValue(event.target.value.replace(/\D/g, ""))} placeholder={hasPin ? "Novo PIN" : "Criar PIN"} aria-label={hasPin ? "Novo PIN" : "Criar PIN"} className={`${pinFieldClass} max-w-full`} />
                      <input type="password" inputMode="numeric" autoComplete="new-password" value={pinConfirmValue} onChange={(event) => setPinConfirmValue(event.target.value.replace(/\D/g, ""))} placeholder="Confirmar PIN" aria-label="Confirmar PIN" className={`${pinFieldClass} max-w-full`} />
                    </div>
                    <Button type="submit" variant="secondary" className="self-start" disabled={pinBusy || pinValue.length < 6 || !pinConfirmValue}>{pinBusy ? "Salvando PIN…" : hasPin ? "Atualizar PIN" : "Criar PIN"}</Button>
                    {pinError && <Notice tone="error">{pinError}</Notice>}
                    {pinSaved && !pinError && <Notice tone="success">PIN salvo com segurança.</Notice>}
                  </form>
                )}
              </SecurityCard>
            </div>
          </section>
      </div>

      <ConfirmDialog
        isOpen={confirmDeletePasskeyId !== null}
        title="Excluir esta passkey?"
        description="Você não vai mais poder entrar com ela. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmDeletePasskeyId) handleDeletePasskey(confirmDeletePasskeyId);
          setConfirmDeletePasskeyId(null);
        }}
        onCancel={() => setConfirmDeletePasskeyId(null)}
      />
      <ConfirmDialog
        isOpen={confirmRevokeSessionId !== null}
        title="Encerrar sessão neste dispositivo?"
        description="O dispositivo vai precisar entrar novamente."
        confirmLabel="Sair"
        onConfirm={() => {
          if (confirmRevokeSessionId) handleRevokeSession(confirmRevokeSessionId);
          setConfirmRevokeSessionId(null);
        }}
        onCancel={() => setConfirmRevokeSessionId(null)}
      />
      <ConfirmDialog
        isOpen={confirmSignOutOthers}
        title="Sair de todos os outros dispositivos?"
        description="Todas as outras sessões ativas serão encerradas."
        confirmLabel="Sair de todos"
        onConfirm={() => {
          setConfirmSignOutOthers(false);
          handleSignOutOthers();
        }}
        onCancel={() => setConfirmSignOutOthers(false)}
      />
      <ConfirmDialog
        isOpen={confirmSignOutEverywhere}
        title="Desconectar de todos os dispositivos?"
        description="Todas as sessões serão encerradas, inclusive esta. Tokens de acesso já emitidos podem continuar válidos até expirarem; você será levado à tela de login."
        confirmLabel="Desconectar de tudo"
        onConfirm={() => {
          setConfirmSignOutEverywhere(false);
          void handleSignOutEverywhere();
        }}
        onCancel={() => setConfirmSignOutEverywhere(false)}
      />
    </div>
  );
}

/** Mantém compatibilidade para qualquer consumidor legado da página completa. */
export function SegurancaPage() {
  return <SecuritySettingsPanel />;
}
