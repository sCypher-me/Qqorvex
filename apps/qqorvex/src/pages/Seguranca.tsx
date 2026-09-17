import { useState, type FormEvent, type ReactNode } from "react";
import { Badge, Button, ConfirmDialog, EmptyState } from "@qqorvex/ui";
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
  usePin,
  setSecurityPin,
  type TotpEnrollment,
} from "@qqorvex/auth";
import { useNotifications } from "@qqorvex/notifications";
import { GoogleCalendarSection } from "@qqorvex/module-agenda";

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

function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(isoDate)).replace(".", "").replace(" de ", " ");
}

/** Sessão sem atividade há mais de um dia aparece com o ponto cinza (continua válida até ser encerrada). */
const RECENT_ACTIVITY_MS = 24 * 60 * 60 * 1000;

function SecurityCard({ title, pill, children }: { title: string; pill?: ReactNode; children: ReactNode }) {
  return (
    <section className="qv-card p-5 flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <h2 className="font-display text-[17px] font-semibold flex-1">{title}</h2>
        {pill}
      </div>
      {children}
    </section>
  );
}

function CardText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-text-secondary leading-relaxed">{children}</p>;
}

/** "Central de Segurança" v1 lean: 2FA (TOTP) + Passkey + Sessões + PIN do Cofre + notificações push + integrações. */
export function SegurancaPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
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

  const [confirmDeletePasskeyId, setConfirmDeletePasskeyId] = useState<string | null>(null);
  const [confirmRevokeSessionId, setConfirmRevokeSessionId] = useState<string | null>(null);
  const [confirmSignOutOthers, setConfirmSignOutOthers] = useState(false);

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

  const pinFieldClass =
    "qv-field w-[150px] font-mono text-[15px] tracking-[.3em] placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start max-w-[1040px]">
      <SecurityCard
        title="Verificação em duas etapas"
        pill={
          isLoading ? undefined : verifiedTotp ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>
        }
      >
        {isLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : verifiedTotp ? (
          <>
            <CardText>
              App autenticador configurado. A partir de agora, cada login por senha pede o código de 6 dígitos gerado
              no app.
            </CardText>
            <div className="flex gap-2.5">
              <Button variant="destructive" onClick={() => handleRemove(verifiedTotp.id)} disabled={busy}>
                Desativar
              </Button>
            </div>
          </>
        ) : enrollment ? (
          <form onSubmit={handleConfirm} className="flex flex-col gap-3">
            <CardText>
              Escaneie o QR code com um app autenticador (Google Authenticator, Authy, 1Password...) e digite o código de
              6 dígitos para confirmar.
            </CardText>
            <img
              src={enrollment.qrCodeDataUri}
              alt="QR code do 2FA"
              className="w-40 h-40 self-center bg-white p-2 rounded-md"
            />
            <p className="font-mono text-xs text-text-muted break-all">
              Não conseguiu escanear? Digite manualmente: {enrollment.secret}
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
              aria-label="Código de 6 dígitos"
              className="qv-field font-mono tracking-[.2em] placeholder:font-sans placeholder:tracking-normal"
            />
            <div className="flex gap-2.5">
              <Button type="submit" variant="primary" disabled={busy || code.trim().length === 0}>
                Confirmar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEnrollment(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <CardText>
              Adicione uma camada extra de segurança: além da senha, o login vai pedir um código gerado por um app
              autenticador no seu celular.
            </CardText>
            <div className="flex gap-2.5">
              <Button variant="primary" onClick={handleEnable} disabled={busy}>
                Ativar 2FA
              </Button>
            </div>
          </>
        )}

        {error && <p className="text-[13px] text-error">{error}</p>}
      </SecurityCard>

      <SecurityCard title="Passkeys">
        <CardText>
          Entre sem senha usando Windows Hello, o leitor de digital do seu computador ou uma chave de segurança física. É
          uma forma alternativa de entrar, não um passo extra depois da senha.
        </CardText>

        {passkeysLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : passkeys.length > 0 ? (
          <ul className="flex flex-col">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="qv-row-top flex items-center gap-3 py-2.5">
                {renamingId === passkey.id ? (
                  <div className="flex flex-1 min-w-0 gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      aria-label="Nome da passkey"
                      className="qv-field flex-1 min-w-0"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSaveRename(passkey.id)}
                      disabled={passkeyBusy}
                    >
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <button
                      type="button"
                      title="Renomear"
                      onClick={() => {
                        setRenamingId(passkey.id);
                        setRenameValue(passkey.friendlyName ?? "");
                      }}
                      className="text-sm font-medium text-left text-text-primary hover:underline truncate"
                    >
                      {passkey.friendlyName ?? "Passkey sem nome"}
                    </button>
                    <span className="font-mono text-xs text-text-muted">
                      criada em {formatShortDate(passkey.createdAt)} ·{" "}
                      {passkey.lastUsedAt ? `usada ${formatRelativeTime(passkey.lastUsedAt)}` : "nunca usada"}
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="quiet"
                  size="xs"
                  onClick={() => setConfirmDeletePasskeyId(passkey.id)}
                  disabled={passkeyBusy}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Button variant="primary" className="self-start" onClick={handleAddPasskey} disabled={passkeyBusy}>
          Cadastrar passkey
        </Button>

        {passkeyError && <p className="text-[13px] text-error">{passkeyError}</p>}
      </SecurityCard>

      <div className="flex flex-col gap-5">
        <SecurityCard title="Sessões ativas">
          {sessionsLoading ? (
            <EmptyState>Carregando...</EmptyState>
          ) : (
            <ul className="flex flex-col">
              {sessions.map((deviceSession) => {
                const { browser, os } = parseUserAgent(deviceSession.userAgent);
                const isCurrent = deviceSession.id === currentSessionId;
                const lastActivity = deviceSession.refreshedAt ?? deviceSession.createdAt;
                const isRecent = isCurrent || Date.now() - new Date(lastActivity).getTime() < RECENT_ACTIVITY_MS;
                return (
                  <li key={deviceSession.id} className="qv-row-top flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden
                      className={`w-[7px] h-[7px] rounded-full shrink-0 ${isRecent ? "bg-success" : "bg-text-muted"}`}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-medium truncate">
                        {browser} — {os}
                      </span>
                      <span className="font-mono text-xs text-text-muted">
                        {deviceSession.ip ?? "IP desconhecido"} · ativo {formatRelativeTime(lastActivity)}
                      </span>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs text-vex-cyan-bright whitespace-nowrap">esta sessão</span>
                    ) : (
                      <Button
                        type="button"
                        variant="quiet"
                        size="xs"
                        onClick={() => setConfirmRevokeSessionId(deviceSession.id)}
                        disabled={sessionsBusy}
                      >
                        Sair
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Button
            type="button"
            variant="destructive"
            className="self-start"
            onClick={() => setConfirmSignOutOthers(true)}
            disabled={sessionsBusy}
          >
            Encerrar outras sessões
          </Button>
        </SecurityCard>

        <SecurityCard title="Integrações">
          <GoogleCalendarSection
            client={client}
            userId={userId}
            supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
            googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
          />
        </SecurityCard>
      </div>

      <div className="flex flex-col gap-5">
        <SecurityCard title="PIN do cofre" pill={pinLoading ? undefined : hasPin ? <Badge tone="success">Definido</Badge> : <Badge>Sem PIN</Badge>}>
          <CardText>
            O PIN destrava só os documentos marcados no Cofre — não é o login do app. Pelo menos 6 dígitos numéricos.
          </CardText>

          {pinLoading ? (
            <EmptyState>Carregando...</EmptyState>
          ) : (
            <form onSubmit={handleSetPin} className="flex flex-col gap-3">
              <div className="flex gap-2.5 items-center flex-wrap">
                {hasPin && (
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinCurrentValue}
                    onChange={(e) => setPinCurrentValue(e.target.value)}
                    placeholder="PIN atual"
                    aria-label="PIN atual"
                    className={pinFieldClass}
                  />
                )}
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  placeholder={hasPin ? "Novo PIN" : "Criar PIN"}
                  aria-label={hasPin ? "Novo PIN" : "Criar PIN"}
                  className={pinFieldClass}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinConfirmValue}
                  onChange={(e) => setPinConfirmValue(e.target.value)}
                  placeholder="Confirmar PIN"
                  aria-label="Confirmar PIN"
                  className={pinFieldClass}
                />
              </div>
              <Button type="submit" variant="secondary" className="self-start" disabled={pinBusy}>
                {hasPin ? "Alterar PIN" : "Criar PIN"}
              </Button>
              {pinError && <p className="text-[13px] text-error">{pinError}</p>}
              {pinSaved && !pinError && <p className="text-[13px] text-success">PIN salvo.</p>}
            </form>
          )}
        </SecurityCard>

        <SecurityCard
          title="Notificações"
          pill={
            notifications.supported && !notifications.isLoading ? (
              notifications.isSubscribed ? (
                <Badge tone="success">Ativas</Badge>
              ) : (
                <Badge>Desativadas</Badge>
              )
            ) : undefined
          }
        >
          {!notifications.supported ? (
            <CardText>Este navegador não suporta notificações push.</CardText>
          ) : notifications.isLoading ? (
            <EmptyState>Carregando...</EmptyState>
          ) : notifications.isSubscribed ? (
            <>
              <CardText>Notificações ativadas neste dispositivo.</CardText>
              <Button variant="secondary" className="self-start" onClick={notifications.disable}>
                Desativar neste dispositivo
              </Button>
            </>
          ) : (
            <>
              <CardText>
                Receba lembretes de eventos da Agenda (e futuramente de hábitos e orçamento) direto no seu dispositivo,
                mesmo com o Qqorvex fechado.
              </CardText>
              <Button variant="primary" className="self-start" onClick={notifications.enable}>
                Ativar notificações
              </Button>
            </>
          )}

          {notifications.error && <p className="text-[13px] text-error">{notifications.error}</p>}
        </SecurityCard>
      </div>

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
    </div>
  );
}
