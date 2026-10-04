import { useState, type FormEvent } from "react";
import { CheckCircleIcon, CircleDashedIcon, DesktopIcon, DeviceMobileIcon, FingerprintIcon, KeyIcon, LockKeyIcon, ShieldCheckIcon, SignOutIcon } from "@phosphor-icons/react";
import {
  changePassword, emailRedirect, isPasswordValid, mapAuthError, requestReauthentication,
  deletePasskey,
  enrollTotp,
  parseUserAgent,
  registerPasskey,
  renamePasskey,
  revokeSession,
  setSecurityPin,
  unenrollFactor,
  useAuth,
  useMfaFactors,
  usePasskeys,
  usePin,
  useSecurityLoginHistory,
  useSessions,
  verifyTotpEnrollment,
  isBRPhoneValid, normalizeBRPhone, requestAuthPhoneChange, verifyAuthPhoneChange,
  type TotpEnrollment,
} from "@qqorvex/auth";
import { Badge, Button, ConfirmDialog, Input, Modal, Notice, ProgressRing, SkeletonBlock, SkeletonList, cx, useToast } from "@qqorvex/ui";
import { PasswordField } from "../components/PasswordField";
import { IconTile, SettingsCard, SettingsHeader, SettingsList, SettingsListRow, relativeTime } from "./shared";

const RECENT_ACTIVITY_MS = 24 * 60 * 60 * 1000;
const loginDateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function isMobileOs(os: string): boolean {
  return /android|ios|iphone|ipad/i.test(os);
}

/** Central de segurança: e-mail e senha, 2FA, passkeys, sessões, histórico e PIN do Cofre. */
export function SecuritySettings() {
  const { client, session } = useAuth();
  const { toast } = useToast();
  const { factors, isLoading: factorsLoading, refresh: refreshFactors } = useMfaFactors(client);
  const { passkeys, isLoading: passkeysLoading, refresh: refreshPasskeys } = usePasskeys(client);
  const { sessions, currentSessionId, isLoading: sessionsLoading, refresh: refreshSessions } = useSessions(client);
  const { events: loginEvents, isLoading: historyLoading, error: historyError, refresh: refreshHistory } = useSecurityLoginHistory(client);
  const { hasPin, isLoading: pinLoading, refresh: refreshPin } = usePin(client);

  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [nonceBusy, setNonceBusy] = useState(false);
  async function sendNonce() {
    setNonceBusy(true);
    try { const result = await requestReauthentication(client); setPasswordError(result.error); if (!result.error) setNeedsNonce(true); }
    catch { setPasswordError("Não foi possível enviar o código. Tente novamente."); }
    finally { setNonceBusy(false); }
  }
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [authPhone, setAuthPhone] = useState("");
  const [phoneToken, setPhoneToken] = useState("");
  const [phoneRequested, setPhoneRequested] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [removeFactorId, setRemoveFactorId] = useState<string | null>(null);

  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null);

  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);

  const [pinCurrent, setPinCurrent] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const verifiedFactors = factors.filter((factor) => factor.status === "verified");
  const emailVerified = Boolean(session?.user.email_confirmed_at);
  const checks = [
    { key: "email", label: "E-mail verificado", done: emailVerified, href: "#seguranca-email" },
    { key: "2fa", label: "Verificação em duas etapas", done: verifiedFactors.length > 0, href: "#seguranca-2fa" },
    { key: "passkey", label: "Passkey cadastrada", done: passkeys.length > 0, href: "#seguranca-passkeys" },
    { key: "pin", label: "PIN do Cofre", done: hasPin, href: "#seguranca-cofre" },
  ];
  const loadingStatus = factorsLoading || passkeysLoading || pinLoading;
  const score = checks.filter((check) => check.done).length;

  async function handleChangeEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    const email = newEmail.trim();
    if (!email || email.toLowerCase() === session?.user.email?.toLowerCase()) {
      setEmailError("Informe um endereço diferente do e-mail atual.");
      return;
    }
    setEmailBusy(true);
    try {
      const { error } = await client.auth.updateUser({ email: email.toLowerCase() }, { emailRedirectTo: emailRedirect("/configuracoes/seguranca") });
      if (error) {
        setEmailError(mapAuthError(error));
        return;
      }
      setNewEmail("");
      toast({ title: "Confirme no seu e-mail", description: "Verifique o endereço atual e o novo: o Supabase pode pedir confirmação nos dois.", tone: "success" });
    } catch (caught) {
      setEmailError(caught instanceof Error ? caught.message : "Não foi possível solicitar a troca de e-mail.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleAuthPhone(event: FormEvent) {
    event.preventDefault(); setPhoneError(null);
    const normalizedPhone = normalizeBRPhone(authPhone);
    if (!normalizedPhone || !isBRPhoneValid(authPhone)) { setPhoneError("Informe um número de celular válido com DDD."); return; }
    if (phoneRequested && phoneToken.trim()) {
      setPhoneBusy(true);
      try {
        const result = await verifyAuthPhoneChange(client, normalizedPhone, phoneToken);
        if (result.error) { setPhoneError(result.error); return; }
        setPhoneRequested(false); setPhoneModalOpen(false); setPhoneToken(""); setAuthPhone("");
        toast({ title: "Telefone de acesso atualizado", description: "A alteração foi confirmada por SMS.", tone: "success" });
      } catch { setPhoneError("Não foi possível confirmar o código. Tente novamente."); }
      finally { setPhoneBusy(false); }
      return;
    }
    if (normalizedPhone === session?.user.phone) { setPhoneError("Esse já é o telefone de acesso atual."); return; }
    setPhoneBusy(true);
    try {
      const result = await requestAuthPhoneChange(client, normalizedPhone);
      if (result.error) { setPhoneError(result.error); return; }
      setPhoneRequested(true);
      setPhoneModalOpen(true);
    } catch { setPhoneError("Não foi possível enviar o código por SMS. Tente novamente."); }
    finally { setPhoneBusy(false); }
  }

  function closePhoneModal() {
    if (phoneBusy) return;
    setPhoneModalOpen(false);
    setPhoneRequested(false);
    setPhoneToken("");
    setPhoneError(null);
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (!isPasswordValid(newPassword)) {
      setPasswordError("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas digitadas não coincidem.");
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await changePassword(client, newPassword, nonce);
      if (result.requiresReauthentication) {
        setNeedsNonce(true);
        await sendNonce();
        return;
      }
      if (result.error) {
        setPasswordError(result.error);
        return;
      }
      setNonce(""); setNeedsNonce(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModalOpen(false);
      const { error: revokeError } = await client.auth.signOut({ scope: "others" });
      refreshSessions();
      toast({
        title: "Senha atualizada",
        description: revokeError ? "Revise os dispositivos conectados: não foi possível encerrar as outras sessões." : "As outras sessões foram encerradas.",
        tone: revokeError ? "info" : "success",
      });
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : "Não foi possível atualizar a senha.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function startEnrollment() {
    setMfaError(null);
    setMfaModalOpen(true);
    setMfaBusy(true);
    const { enrollment: result, error } = await enrollTotp(client);
    setMfaBusy(false);
    if (error) setMfaError(error);
    else setEnrollment(result);
  }

  async function confirmEnrollment(event: FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setMfaError(null);
    setMfaBusy(true);
    const { error } = await verifyTotpEnrollment(client, enrollment.factorId, code);
    setMfaBusy(false);
    if (error) {
      setMfaError(error);
      return;
    }
    setEnrollment(null);
    setCode("");
    setMfaModalOpen(false);
    refreshFactors();
    toast({ title: "Verificação em duas etapas ativada", tone: "success" });
  }

  async function closeEnrollmentModal() {
    if (mfaBusy) return;
    const pendingFactorId = enrollment?.factorId;
    setMfaModalOpen(false);
    setEnrollment(null);
    setCode("");
    setMfaError(null);
    if (!pendingFactorId) return;

    setMfaBusy(true);
    const { error } = await unenrollFactor(client, pendingFactorId);
    setMfaBusy(false);
    if (error) {
      setMfaError("A configuração pendente não foi removida. Tente novamente antes de cadastrar outro app.");
    } else {
      refreshFactors();
    }
  }

  async function removeFactor(factorId: string) {
    setMfaBusy(true);
    const { error } = await unenrollFactor(client, factorId);
    setMfaBusy(false);
    if (error) setMfaError(error);
    else refreshFactors();
  }

  async function addPasskey() {
    setPasskeyError(null);
    setPasskeyBusy(true);
    const { error } = await registerPasskey(client);
    setPasskeyBusy(false);
    if (error) {
      setPasskeyError(error);
      return;
    }
    refreshPasskeys();
    toast({ title: "Passkey cadastrada", tone: "success" });
  }

  async function saveRename(passkeyId: string) {
    const name = renameValue.trim();
    if (!name) return;
    setPasskeyBusy(true);
    const { error } = await renamePasskey(client, passkeyId, name);
    setPasskeyBusy(false);
    if (error) {
      setPasskeyError(error);
      return;
    }
    setRenamingId(null);
    refreshPasskeys();
  }

  async function removePasskey(passkeyId: string) {
    setPasskeyBusy(true);
    const { error } = await deletePasskey(client, passkeyId);
    setPasskeyBusy(false);
    if (error) setPasskeyError(error);
    else refreshPasskeys();
  }

  async function revoke(sessionId: string) {
    setSessionError(null);
    setSessionsBusy(true);
    const { error } = await revokeSession(client, sessionId);
    setSessionsBusy(false);
    if (error) setSessionError(error);
    else refreshSessions();
  }

  async function signOut(scope: "others" | "global") {
    setSessionError(null);
    setSessionsBusy(true);
    const { error } = await client.auth.signOut({ scope });
    setSessionsBusy(false);
    if (error) setSessionError(error.message);
    else if (scope === "others") refreshSessions();
    // "global" encerra esta sessão também; o AuthProvider leva ao login.
  }

  async function savePin(event: FormEvent) {
    event.preventDefault();
    setPinError(null);
    if (pinValue !== pinConfirm) {
      setPinError("Os PINs digitados são diferentes.");
      return;
    }
    setPinBusy(true);
    const { error } = await setSecurityPin(client, pinValue, hasPin ? pinCurrent : undefined);
    setPinBusy(false);
    if (error) {
      setPinError(error);
      return;
    }
    setPinValue("");
    setPinConfirm("");
    setPinCurrent("");
    refreshPin();
    toast({ title: hasPin ? "PIN atualizado" : "PIN criado", tone: "success" });
    setPinModalOpen(false);
  }

  function closePasswordModal() {
    if (passwordBusy || nonceBusy) return;
    setPasswordModalOpen(false);
    setNewPassword(""); setConfirmPassword(""); setNonce("");
    setNeedsNonce(false); setPasswordError(null);
  }

  const pinInput = "q-input w-full font-mono tracking-[.3em] placeholder:font-sans placeholder:tracking-normal sm:w-36";

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Segurança" description="Como você entra, onde sua conta está aberta e a proteção dos documentos do Cofre." />

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5" aria-label="Resumo de segurança">
        <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
          <ProgressRing value={loadingStatus ? 0 : (score / checks.length) * 100} size={64} thickness={6} tone={score >= 3 ? "success" : "gold"} label="Proteção da conta">
            <ShieldCheckIcon size={22} className={score >= 3 ? "text-success" : "text-gold-fg"} />
          </ProgressRing>
          <div>
            <p className="text-[15px] font-semibold text-fg">{loadingStatus ? "Verificando…" : score >= 3 ? "Conta bem protegida" : score === 2 ? "Boa proteção" : "Reforce sua proteção"}</p>
            <p className="text-xs text-fg-3">{loadingStatus ? "" : `${score} de ${checks.length} proteções ativas`}</p>
          </div>
        </div>
        <ul className="grid flex-1 gap-1.5 sm:grid-cols-2">
          {checks.map((check) => (
            <li key={check.key}>
              <a href={check.href} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-hover">
                {check.done ? <CheckCircleIcon size={16} weight="fill" className="shrink-0 text-success" /> : <CircleDashedIcon size={16} className="shrink-0 text-fg-4" />}
                <span className={check.done ? "text-fg-2" : "text-fg"}>{check.label}</span>
                {!check.done && !loadingStatus && <span className="ml-auto text-xs text-gold-fg">Ativar</span>}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-3">Acesso à conta</h3>
        <SettingsCard id="seguranca-email" title="E-mail de acesso" description="Usado para entrar e recuperar a conta." aside={<Badge tone={emailVerified ? "success" : "warning"}>{emailVerified ? "Verificado" : "Não verificado"}</Badge>}>
          <p className="break-all text-[13.5px] font-medium text-fg">{session?.user.email ?? "—"}</p>
          <form onSubmit={(event) => void handleChangeEmail(event)} className="flex flex-col gap-2 sm:flex-row">
            <Input type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Novo e-mail" aria-label="Novo e-mail" wrapperClassName="flex-1" />
            <Button type="submit" variant="secondary" loading={emailBusy} disabled={!newEmail.trim()}>
              Trocar e-mail
            </Button>
          </form>
          {emailError && <Notice compact>{emailError}</Notice>}
        </SettingsCard>

        <SettingsCard title="Telefone de acesso" description={session?.user.phone ? `Número confirmado: ${session.user.phone}` : "Adicione um celular confirmado para usar nos recursos de acesso e recuperação."}>
          <form onSubmit={(event) => void handleAuthPhone(event)} className="flex flex-col gap-3">
            <Input label="Celular com DDD" type="tel" autoComplete="tel" inputMode="tel" value={authPhone} onChange={(event) => setAuthPhone(event.target.value)} placeholder="(11) 99999-9999" required disabled={phoneRequested || phoneBusy} />
            {phoneError && !phoneModalOpen && <Notice compact>{phoneError}</Notice>}
            <Button type="submit" variant="secondary" loading={phoneBusy} disabled={!authPhone.trim() || phoneRequested}>
              {session?.user.phone ? "Trocar telefone" : "Adicionar telefone"}
            </Button>
          </form>
        </SettingsCard>

        <SettingsCard title="Senha" description="Ao trocar, as outras sessões são encerradas por segurança.">
          <p className="text-[13px] text-fg-3">Use uma senha forte e única. A troca pede confirmação adicional quando necessário.</p>
          <Button variant="secondary" className="self-start" onClick={() => { setPasswordError(null); setPasswordModalOpen(true); }}>Trocar senha</Button>
        </SettingsCard>

        <SettingsCard
          id="seguranca-cofre"
          title="PIN do Cofre"
          description="Protege só os documentos marcados no Cofre. Não muda sua senha."
          aside={pinLoading ? undefined : <Badge tone={hasPin ? "success" : "neutral"}>{hasPin ? "Definido" : "Sem PIN"}</Badge>}
        >
          {pinLoading ? (
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[13px] text-fg-3">{hasPin ? "O PIN está ativo para os documentos protegidos." : "Adicione um PIN de pelo menos 6 números para proteger documentos do Cofre."}</p>
              <Button variant="secondary" leadingIcon={<LockKeyIcon size={15} />} onClick={() => { setPinError(null); setPinModalOpen(true); }}>{hasPin ? "Alterar PIN" : "Criar PIN"}</Button>
            </div>
          )}
        </SettingsCard>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-3">Proteções e atividade</h3>

        <SettingsCard
          id="seguranca-2fa"
          title="Verificação em duas etapas"
          description="Além da senha, um código de 6 dígitos do seu app autenticador."
          aside={factorsLoading ? undefined : <Badge tone={verifiedFactors.length ? "success" : "neutral"}>{verifiedFactors.length ? "Ativa" : "Inativa"}</Badge>}
        >
          {factorsLoading ? (
            <SkeletonBlock className="h-20 w-full rounded-lg" />
          ) : verifiedFactors.length > 0 ? (
            <>
              <SettingsList>
                {factors.map((factor, index) => (
                  <SettingsListRow
                    key={factor.id}
                    leading={<IconTile tone="success"><DeviceMobileIcon /></IconTile>}
                    title={factor.friendlyName || `App autenticador ${index + 1}`}
                    description={factor.status === "verified" ? "Ativo" : "Cadastro pendente"}
                    trailing={<Button size="xs" variant="ghost" disabled={mfaBusy} onClick={() => setRemoveFactorId(factor.id)}>Remover</Button>}
                  />
                ))}
              </SettingsList>
              <p className="text-xs leading-relaxed text-fg-3">Dica: cadastre um segundo app em outro aparelho. Ele serve de reserva se você perder o celular.</p>
              <Button variant="secondary" size="sm" className="self-start" loading={mfaBusy} disabled={factors.length >= 10} onClick={() => void startEnrollment()}>
                Adicionar app de reserva
              </Button>
            </>
          ) : (
            <Button className="self-start" leadingIcon={<KeyIcon size={16} />} loading={mfaBusy} onClick={() => void startEnrollment()}>
              Ativar verificação
            </Button>
          )}
          {!mfaModalOpen && mfaError && <Notice compact>{mfaError}</Notice>}
        </SettingsCard>

        <SettingsCard
          id="seguranca-passkeys"
          title="Passkeys"
          description="Entre sem senha com biometria, Windows Hello ou chave de segurança."
          aside={passkeysLoading ? undefined : <Badge tone={passkeys.length ? "success" : "neutral"}>{passkeys.length ? `${passkeys.length} ${passkeys.length === 1 ? "ativa" : "ativas"}` : "Nenhuma"}</Badge>}
        >
          {passkeysLoading ? (
            <SkeletonList rows={1} leading />
          ) : passkeys.length > 0 ? (
            <SettingsList>
              {passkeys.map((passkey) => (
                <SettingsListRow
                  key={passkey.id}
                  leading={<IconTile><FingerprintIcon /></IconTile>}
                  title={
                    renamingId === passkey.id ? (
                      <span className="flex gap-2">
                        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Nome da passkey" data-size="sm" className="q-input min-w-0 flex-1" autoFocus />
                        <Button size="sm" variant="secondary" loading={passkeyBusy} disabled={!renameValue.trim()} onClick={() => void saveRename(passkey.id)}>Salvar</Button>
                      </span>
                    ) : (
                      passkey.friendlyName ?? "Passkey sem nome"
                    )
                  }
                  description={`Criada em ${shortDate.format(new Date(passkey.createdAt))} · ${passkey.lastUsedAt ? `usada ${relativeTime(passkey.lastUsedAt)}` : "ainda não usada"}`}
                  trailing={
                    renamingId === passkey.id ? (
                      <Button size="xs" variant="ghost" onClick={() => setRenamingId(null)}>Cancelar</Button>
                    ) : (
                      <>
                        <Button size="xs" variant="ghost" onClick={() => { setRenamingId(passkey.id); setRenameValue(passkey.friendlyName ?? ""); }}>Renomear</Button>
                        <Button size="xs" variant="ghost" disabled={passkeyBusy} onClick={() => setDeletePasskeyId(passkey.id)}>Remover</Button>
                      </>
                    )
                  }
                />
              ))}
            </SettingsList>
          ) : null}
          <Button variant={passkeys.length ? "secondary" : "primary"} size={passkeys.length ? "sm" : "md"} className="self-start" leadingIcon={<FingerprintIcon size={16} />} loading={passkeyBusy} onClick={() => void addPasskey()}>
            {passkeyBusy ? "Aguardando o dispositivo…" : "Cadastrar passkey"}
          </Button>
          {passkeyError && <Notice compact>{passkeyError}</Notice>}
        </SettingsCard>

        <SettingsCard title="Acessos recentes" description="Entradas na sua conta nos últimos 90 dias." aside={<Button size="xs" variant="ghost" loading={historyLoading} onClick={() => void refreshHistory()}>Atualizar</Button>}>
          {historyLoading ? (
            <SkeletonList rows={3} />
          ) : historyError ? (
            <Notice compact>Não foi possível carregar o histórico.</Notice>
          ) : loginEvents.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-fg-3">Os próximos acessos aparecem aqui.</p>
          ) : (
            <SettingsList>
              {loginEvents.slice(0, 8).map((event) => {
                const { browser, os } = parseUserAgent(event.userAgent);
                return (
                  <SettingsListRow
                    key={event.id}
                    title={`${browser} · ${os}`}
                    description={`${loginDateTime.format(new Date(event.occurredAt))} · IP ${event.ipAddress ?? "não registrado"}`}
                    trailing={<Badge tone="neutral">{event.action === "user_signedup" ? "Conta criada" : "Login"}</Badge>}
                  />
                );
              })}
            </SettingsList>
          )}
        </SettingsCard>
        </div>
      </div>

      <SettingsCard
        title="Onde sua conta está aberta"
        description="Encerre acessos que você não reconhece."
        aside={sessionsLoading ? undefined : <span className="text-xs tabular-nums text-fg-3">{sessions.length} {sessions.length === 1 ? "sessão" : "sessões"}</span>}
        footer={
          <>
            <Button variant="ghost" size="sm" className="text-danger" leadingIcon={<SignOutIcon size={14} />} disabled={sessionsBusy || sessions.length === 0} onClick={() => setConfirmEverywhere(true)}>
              Sair de todos, inclusive este
            </Button>
            <Button variant="secondary" size="sm" disabled={sessionsBusy || sessions.length <= 1} onClick={() => setConfirmOthers(true)}>
              Encerrar as outras sessões
            </Button>
          </>
        }
      >
        {sessionsLoading ? (
          <SkeletonList rows={2} leading />
        ) : sessions.length === 0 ? (
          <p className="text-[13px] text-fg-3">Nenhuma sessão encontrada. Atualize a página para tentar de novo.</p>
        ) : (
          <SettingsList>
            {sessions.map((item) => {
              const { browser, os } = parseUserAgent(item.userAgent);
              const current = item.id === currentSessionId;
              const lastActivity = item.refreshedAt ?? item.createdAt;
              const recent = current || Date.now() - new Date(lastActivity).getTime() < RECENT_ACTIVITY_MS;
              return (
                <SettingsListRow
                  key={item.id}
                  leading={<IconTile tone={current ? "gold" : "neutral"}>{isMobileOs(os) ? <DeviceMobileIcon /> : <DesktopIcon />}</IconTile>}
                  title={
                    <span className="flex items-center gap-2">
                      {browser} · {os}
                      {current && <Badge tone="gold">Este dispositivo</Badge>}
                    </span>
                  }
                  description={
                    <span className="flex items-center gap-1.5">
                      <span className={cx("h-1.5 w-1.5 rounded-full", recent ? "bg-success" : "bg-fg-4")} aria-hidden="true" />
                      {current ? "Ativo agora" : `Ativo ${relativeTime(lastActivity)}`} · IP {item.ip ?? "desconhecido"}
                    </span>
                  }
                  trailing={!current ? <Button size="xs" variant="ghost" disabled={sessionsBusy} onClick={() => setRevokeId(item.id)}>Encerrar</Button> : undefined}
                />
              );
            })}
          </SettingsList>
        )}
        {sessionError && <Notice compact>{sessionError}</Notice>}
      </SettingsCard>

      <Modal
        isOpen={phoneModalOpen}
        onClose={closePhoneModal}
        title="Confirme seu telefone"
        description={`Enviamos um código por SMS para ${normalizeBRPhone(authPhone) ?? authPhone}.`}
        size="sm"
        icon={<DeviceMobileIcon size={18} />}
      >
        <form onSubmit={(event) => void handleAuthPhone(event)} className="flex flex-col gap-4">
          <Input
            label="Código recebido por SMS"
            autoComplete="one-time-code"
            inputMode="numeric"
            value={phoneToken}
            onChange={(event) => setPhoneToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            required
            autoFocus
          />
          {phoneError && <Notice compact>{phoneError}</Notice>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={phoneBusy} onClick={closePhoneModal}>Cancelar</Button>
            <Button type="submit" loading={phoneBusy} disabled={phoneToken.length < 6}>Confirmar telefone</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={passwordModalOpen} onClose={closePasswordModal} title="Atualizar senha" description="Depois da troca, as outras sessões serão encerradas por segurança." size="sm" icon={<LockKeyIcon size={18} />}>
        <form onSubmit={(event) => void handleChangePassword(event)} className="flex flex-col gap-3">
          <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" showChecklist />
          <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          {needsNonce && <Input label="Código de verificação recebido por e-mail" value={nonce} onChange={(event) => setNonce(event.target.value)} autoComplete="one-time-code" inputMode="numeric" required />}
          {passwordError && <Notice compact>{passwordError}</Notice>}
          <div className="flex flex-wrap justify-end gap-2">
            {needsNonce && <Button type="button" variant="secondary" loading={nonceBusy} disabled={passwordBusy} onClick={() => void sendNonce()}>Enviar novo código</Button>}
            <Button type="button" variant="ghost" disabled={passwordBusy || nonceBusy} onClick={closePasswordModal}>Cancelar</Button>
            <Button type="submit" loading={passwordBusy} disabled={!newPassword || !confirmPassword || (needsNonce && nonce.length < 6)}>Atualizar senha</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={pinModalOpen} onClose={() => { if (pinBusy) return; setPinModalOpen(false); setPinCurrent(""); setPinValue(""); setPinConfirm(""); setPinError(null); }} title={hasPin ? "Alterar PIN do Cofre" : "Criar PIN do Cofre"} description="Esse PIN protege somente os documentos marcados no Cofre." size="sm" icon={<LockKeyIcon size={18} />}>
        <form onSubmit={(event) => void savePin(event)} className="flex flex-col gap-3">
          {hasPin && <input type="password" inputMode="numeric" autoComplete="current-password" value={pinCurrent} onChange={(event) => setPinCurrent(event.target.value.replace(/\D/g, ""))} placeholder="PIN atual" aria-label="PIN atual" className={pinInput} autoFocus />}
          <input type="password" inputMode="numeric" autoComplete="new-password" value={pinValue} onChange={(event) => setPinValue(event.target.value.replace(/\D/g, ""))} placeholder={hasPin ? "Novo PIN" : "Criar PIN"} aria-label={hasPin ? "Novo PIN" : "Criar PIN"} className={pinInput} autoFocus={!hasPin} />
          <input type="password" inputMode="numeric" autoComplete="new-password" value={pinConfirm} onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, ""))} placeholder="Confirmar" aria-label="Confirmar PIN" className={pinInput} />
          <p className="text-xs text-fg-3">Pelo menos 6 números.</p>
          {pinError && <Notice compact>{pinError}</Notice>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={pinBusy} onClick={() => { setPinModalOpen(false); setPinCurrent(""); setPinValue(""); setPinConfirm(""); setPinError(null); }}>Cancelar</Button><Button type="submit" leadingIcon={<LockKeyIcon size={15} />} loading={pinBusy} disabled={pinValue.length < 6 || !pinConfirm || (hasPin && !pinCurrent)}>{hasPin ? "Atualizar PIN" : "Criar PIN"}</Button></div>
        </form>
      </Modal>

      <Modal
        isOpen={mfaModalOpen}
        onClose={() => void closeEnrollmentModal()}
        title={verifiedFactors.length ? "Adicionar app autenticador" : "Ativar verificação em duas etapas"}
        description="Escaneie o QR code no seu app autenticador e confirme com o código de 6 dígitos."
        size="md"
        icon={<KeyIcon size={18} />}
      >
        {enrollment ? (
          <form onSubmit={(event) => void confirmEnrollment(event)} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <img src={enrollment.qrCodeDataUri} alt="QR code para o app autenticador" className="h-36 w-36 shrink-0 rounded-lg bg-white p-2" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-relaxed text-fg-2">Use Google Authenticator, 1Password, Authy ou outro app compatível.</p>
                <p className="mt-3 text-xs text-fg-3">Sem câmera? Digite esta chave manualmente:</p>
                <p className="mt-1 break-all rounded-md border border-line-soft bg-canvas/40 px-2.5 py-2 font-mono text-xs text-fg-2">{enrollment.secret}</p>
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-2">
              Código do app autenticador
              <input data-autofocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" aria-label="Código de 6 dígitos" className="q-input w-full font-mono tracking-[.3em] sm:w-44" />
            </label>
            {mfaError && <Notice compact>{mfaError}</Notice>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={mfaBusy} onClick={() => void closeEnrollmentModal()}>Cancelar</Button>
              <Button type="submit" loading={mfaBusy} disabled={code.length !== 6}>Confirmar ativação</Button>
            </div>
          </form>
        ) : mfaBusy ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="text-[13px] text-fg-2">Preparando a configuração do autenticador…</p>
            <SkeletonBlock className="h-36 w-full rounded-lg" />
          </div>
        ) : mfaError ? (
          <div className="flex flex-col items-start gap-3">
            <Notice compact>{mfaError}</Notice>
            <Button variant="secondary" onClick={() => void startEnrollment()}>Tentar novamente</Button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={removeFactorId !== null}
        title="Remover este app autenticador?"
        description="Se for o único, a verificação em duas etapas será desativada."
        confirmLabel="Remover"
        onConfirm={() => {
          if (removeFactorId) void removeFactor(removeFactorId);
          setRemoveFactorId(null);
        }}
        onCancel={() => setRemoveFactorId(null)}
      />
      <ConfirmDialog
        isOpen={deletePasskeyId !== null}
        title="Remover esta passkey?"
        description="Você não poderá mais entrar com ela."
        confirmLabel="Remover"
        onConfirm={() => {
          if (deletePasskeyId) void removePasskey(deletePasskeyId);
          setDeletePasskeyId(null);
        }}
        onCancel={() => setDeletePasskeyId(null)}
      />
      <ConfirmDialog
        isOpen={revokeId !== null}
        title="Encerrar esta sessão?"
        description="O dispositivo precisará entrar novamente."
        confirmLabel="Encerrar"
        onConfirm={() => {
          if (revokeId) void revoke(revokeId);
          setRevokeId(null);
        }}
        onCancel={() => setRevokeId(null)}
      />
      <ConfirmDialog
        isOpen={confirmOthers}
        title="Encerrar todas as outras sessões?"
        description="Todos os outros dispositivos precisarão entrar novamente."
        confirmLabel="Encerrar outras"
        onConfirm={() => {
          setConfirmOthers(false);
          void signOut("others");
        }}
        onCancel={() => setConfirmOthers(false)}
      />
      <ConfirmDialog
        isOpen={confirmEverywhere}
        title="Sair de todos os dispositivos?"
        description="Todas as sessões serão encerradas, inclusive esta. Você voltará para a tela de entrada."
        confirmLabel="Sair de todos"
        onConfirm={() => {
          setConfirmEverywhere(false);
          void signOut("global");
        }}
        onCancel={() => setConfirmEverywhere(false)}
      />
    </div>
  );
}
