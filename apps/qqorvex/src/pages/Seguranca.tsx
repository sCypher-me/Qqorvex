import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, ConfirmDialog } from "@qqorvex/ui";
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
  useProfile,
  useSessions,
  revokeSession,
  parseUserAgent,
  usePin,
  setSecurityPin,
  type TotpEnrollment,
} from "@qqorvex/auth";
import { useNotifications } from "@qqorvex/notifications";
import { GoogleCalendarSection } from "@qqorvex/module-agenda";
import { useGamificationStats, useUnlockedBadges, GamificationWidget, BadgesPanel } from "@qqorvex/module-gamificacao";

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

/** "Central de Segurança" v1 lean: Perfil + 2FA (TOTP) + Passkey + Dispositivos + notificações push. */
export function SegurancaPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const { profile, isLoading: profileLoading, save: saveProfile } = useProfile(client, userId);
  const { progress: gamificationProgress, title: gamificationTitle, isLoading: gamificationStatsLoading } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading } = useUnlockedBadges(client, userId);
  const gamificationLoading = gamificationStatsLoading || badgesLoading;
  const { factors, isLoading, refresh } = useMfaFactors(client);
  const { passkeys, isLoading: passkeysLoading, refresh: refreshPasskeys } = usePasskeys(client);
  const { sessions, currentSessionId, isLoading: sessionsLoading, refresh: refreshSessions } = useSessions(client);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const { hasPin, isLoading: pinLoading, refresh: refreshPin } = usePin(client);
  const [pinCurrentValue, setPinCurrentValue] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinConfirmValue, setPinConfirmValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaved, setPinSaved] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const notifications = useNotifications(client, userId, import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [confirmDeletePasskeyId, setConfirmDeletePasskeyId] = useState<string | null>(null);
  const [confirmRevokeSessionId, setConfirmRevokeSessionId] = useState<string | null>(null);
  const [confirmSignOutOthers, setConfirmSignOutOthers] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setProfileBusy(true);
    const { error: saveError } = await saveProfile({
      displayName: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
    });
    setProfileBusy(false);
    if (saveError) {
      setProfileError(saveError);
      return;
    }
    setProfileSaved(true);
  }

  const verifiedTotp = factors.find((f) => f.status === "verified");

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
    await unenrollFactor(client, factorId);
    setBusy(false);
    refresh();
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
    setPasskeyBusy(true);
    await renamePasskey(client, passkeyId, trimmed);
    setPasskeyBusy(false);
    setRenamingId(null);
    refreshPasskeys();
  }

  async function handleDeletePasskey(passkeyId: string) {
    setPasskeyBusy(true);
    await deletePasskey(client, passkeyId);
    setPasskeyBusy(false);
    refreshPasskeys();
  }

  async function handleRevokeSession(sessionId: string) {
    setSessionsBusy(true);
    await revokeSession(client, sessionId);
    setSessionsBusy(false);
    refreshSessions();
  }

  async function handleSignOutOthers() {
    setSessionsBusy(true);
    await client.auth.signOut({ scope: "others" });
    setSessionsBusy(false);
    refreshSessions();
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

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-2xl font-bold text-text-primary">Segurança</h1>
      </div>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Perfil</h2>

        {profileLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-xs text-text-secondary-warm">Nome de exibição</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-xs text-text-secondary-warm">Nome de usuário (3–20, letras minúsculas/números/_)</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-xs text-text-secondary-warm">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
              />
            </label>
            <Button type="submit" variant="primary" disabled={profileBusy}>
              {profileBusy ? "Salvando..." : "Salvar perfil"}
            </Button>
            {profileError && <p className="font-sans text-sm text-error">{profileError}</p>}
            {profileSaved && !profileError && <p className="font-sans text-sm text-success">Perfil atualizado.</p>}
          </form>
        )}
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Gamificação</h2>
        {gamificationLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : (
          <>
            <GamificationWidget progress={gamificationProgress} title={gamificationTitle} />
            <BadgesPanel badges={badges} />
          </>
        )}
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Verificação em duas etapas (app autenticador)</h2>

        {isLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : verifiedTotp ? (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-sm text-success">2FA ativado. A partir de agora, o login pede um código do app autenticador.</p>
            <Button variant="secondary" onClick={() => handleRemove(verifiedTotp.id)} disabled={busy}>
              Desativar 2FA
            </Button>
          </div>
        ) : enrollment ? (
          <form onSubmit={handleConfirm} className="flex flex-col gap-3">
            <p className="font-sans text-sm text-text-secondary-warm">
              Escaneie o QR code com um app autenticador (Google Authenticator, Authy, 1Password...) e digite o
              código de 6 dígitos para confirmar.
            </p>
            <img src={enrollment.qrCodeDataUri} alt="QR code do 2FA" className="w-40 h-40 self-center bg-white p-2 rounded-md" />
            <p className="font-mono text-xs text-text-secondary-warm break-all">
              Não conseguiu escanear? Digite manualmente: {enrollment.secret}
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy || code.trim().length === 0}>
                Confirmar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-sm text-text-secondary-warm">
              Adicione uma camada extra de segurança: além da senha, o login vai pedir um código gerado por um app
              autenticador no seu celular.
            </p>
            <Button variant="primary" onClick={handleEnable} disabled={busy}>
              Ativar 2FA
            </Button>
          </div>
        )}

        {error && <p className="font-sans text-sm text-error">{error}</p>}
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Passkeys</h2>
        <p className="font-sans text-sm text-text-secondary-warm">
          Entre sem senha usando Windows Hello, o leitor de digital do seu computador ou uma chave de segurança
          física. É uma forma alternativa de entrar, não um passo extra depois da senha.
        </p>

        {passkeysLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : passkeys.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between gap-2 text-sm">
                {renamingId === passkey.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-text-primary text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(passkey.id)}
                      disabled={passkeyBusy}
                      className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(passkey.id);
                      setRenameValue(passkey.friendlyName ?? "");
                    }}
                    className="text-text-primary text-left hover:underline"
                  >
                    {passkey.friendlyName ?? "Passkey sem nome"}
                  </button>
                )}
                <Button type="button" variant="chip" onClick={() => setConfirmDeletePasskeyId(passkey.id)} disabled={passkeyBusy}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Button variant="secondary" onClick={handleAddPasskey} disabled={passkeyBusy}>
          Adicionar passkey
        </Button>

        {passkeyError && <p className="font-sans text-sm text-error">{passkeyError}</p>}
        <ConfirmDialog
          isOpen={confirmDeletePasskeyId !== null}
          title="Remover esta passkey?"
          description="Você não vai mais poder entrar com ela. Essa ação não pode ser desfeita."
          onConfirm={() => {
            if (confirmDeletePasskeyId) handleDeletePasskey(confirmDeletePasskeyId);
            setConfirmDeletePasskeyId(null);
          }}
          onCancel={() => setConfirmDeletePasskeyId(null)}
        />
      </Card>

      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text-primary">Dispositivos</h2>
          <Button type="button" variant="chip" onClick={() => setConfirmSignOutOthers(true)} disabled={sessionsBusy}>
            Sair de todos os outros
          </Button>
        </div>

        {sessionsLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((deviceSession) => {
              const { browser, os } = parseUserAgent(deviceSession.userAgent);
              const isCurrent = deviceSession.id === currentSessionId;
              return (
                <li key={deviceSession.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-sans text-text-primary">
                      {browser} no {os} {isCurrent && <span className="text-brand-cyan">(Este dispositivo)</span>}
                    </p>
                    <p className="font-sans text-xs text-text-secondary-warm">
                      {deviceSession.ip ?? "IP desconhecido"} — ativo{" "}
                      {formatRelativeTime(deviceSession.refreshedAt ?? deviceSession.createdAt)}
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button type="button" variant="chip" onClick={() => setConfirmRevokeSessionId(deviceSession.id)} disabled={sessionsBusy}>
                      Sair
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
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
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">PIN do Cofre</h2>
        <p className="font-sans text-sm text-text-secondary-warm">
          O PIN destrava só os documentos marcados no Cofre — não é o login do app. Pelo menos 6 dígitos numéricos.
        </p>

        {pinLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : (
          <form onSubmit={handleSetPin} className="flex flex-col gap-3">
            {hasPin && (
              <input
                type="password"
                inputMode="numeric"
                value={pinCurrentValue}
                onChange={(e) => setPinCurrentValue(e.target.value)}
                placeholder="PIN atual"
                className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
              />
            )}
            <input
              type="password"
              inputMode="numeric"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder={hasPin ? "Novo PIN" : "Criar PIN"}
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
            />
            <input
              type="password"
              inputMode="numeric"
              value={pinConfirmValue}
              onChange={(e) => setPinConfirmValue(e.target.value)}
              placeholder="Confirmar PIN"
              className="rounded-md border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
            />
            <Button type="submit" variant="primary" disabled={pinBusy}>
              {hasPin ? "Trocar PIN" : "Criar PIN"}
            </Button>
            {pinError && <p className="font-sans text-sm text-error">{pinError}</p>}
            {pinSaved && !pinError && <p className="font-sans text-sm text-success">PIN salvo.</p>}
          </form>
        )}
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Notificações</h2>

        {!notifications.supported ? (
          <p className="font-sans text-sm text-text-secondary-warm">Este navegador não suporta notificações push.</p>
        ) : notifications.isLoading ? (
          <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
        ) : notifications.isSubscribed ? (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-sm text-success">Notificações ativadas neste dispositivo.</p>
            <Button variant="secondary" onClick={notifications.disable}>
              Desativar neste dispositivo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-sm text-text-secondary-warm">
              Receba lembretes de eventos da Agenda (e futuramente de hábitos e orçamento) direto no seu
              dispositivo, mesmo com o Qqorvex fechado.
            </p>
            <Button variant="primary" onClick={notifications.enable}>
              Ativar notificações
            </Button>
          </div>
        )}

        {notifications.error && <p className="font-sans text-sm text-error">{notifications.error}</p>}
      </Card>

      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-semibold text-text-primary">Integrações</h2>
        <GoogleCalendarSection
          client={client}
          userId={userId}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
        />
      </Card>
    </main>
  );
}
