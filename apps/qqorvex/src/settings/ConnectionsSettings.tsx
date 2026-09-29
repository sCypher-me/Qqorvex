import { useState, type ReactNode } from "react";
import { CalendarBlankIcon, DiscordLogoIcon, EnvelopeSimpleIcon, GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { OAUTH_PROVIDERS, useAuth, useIdentities, type OAuthProviderId } from "@qqorvex/auth";
import { useDisconnectGoogleCalendar, useGoogleCalendarConnection } from "@qqorvex/module-agenda";
import { Badge, Button, ButtonLink, ConfirmDialog, Notice, SkeletonList } from "@qqorvex/ui";
import { IconTile, SettingsCard, SettingsHeader, SettingsList, SettingsListRow } from "./shared";

const PROVIDER_ICON: Record<string, ReactNode> = {
  google: <GoogleLogoIcon />,
  github: <GithubLogoIcon />,
  discord: <DiscordLogoIcon />,
};

/** Identidades de login (e-mail + OAuth) e integrações que acessam serviços externos. */
export function ConnectionsSettings() {
  const { client, session } = useAuth();
  const { identities, isLoading, connect, disconnect } = useIdentities(client);
  const calendar = useGoogleCalendarConnection(client);
  const disconnectCalendar = useDisconnectGoogleCalendar(client);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCalendar, setConfirmCalendar] = useState(false);
  const emailConfirmed = Boolean(session?.user.email_confirmed_at);
  const connectedCount = identities.length;

  async function handleConnect(provider: OAuthProviderId) {
    setError(null);
    setBusyProvider(provider);
    const { error: connectError } = await connect(provider);
    setBusyProvider(null);
    if (connectError) setError(connectError);
  }

  async function handleDisconnect(provider: OAuthProviderId) {
    const identity = identities.find((item) => item.provider === provider);
    if (!identity) return;
    setError(null);
    setBusyProvider(provider);
    const { error: disconnectError } = await disconnect(identity);
    setBusyProvider(null);
    if (disconnectError) setError(disconnectError);
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Conexões" description="Contas que você usa para entrar e serviços externos com acesso aos seus dados." />

      <SettingsCard title="Formas de entrar" description="Todas apontam para a mesma conta. Mantenha pelo menos uma além do e-mail para não ficar sem acesso.">
        {isLoading ? (
          <SkeletonList rows={3} leading />
        ) : (
          <SettingsList>
            <SettingsListRow
              leading={<IconTile><EnvelopeSimpleIcon /></IconTile>}
              title="E-mail e senha"
              description={session?.user.email}
              trailing={<Badge tone={emailConfirmed ? "success" : "warning"}>{emailConfirmed ? "Verificado" : "Não verificado"}</Badge>}
            />
            {OAUTH_PROVIDERS.map(({ id, label }) => {
              const connected = identities.some((identity) => identity.provider === id);
              const busy = busyProvider === id;
              return (
                <SettingsListRow
                  key={id}
                  leading={<IconTile tone={connected ? "success" : "neutral"}>{PROVIDER_ICON[id] ?? <EnvelopeSimpleIcon />}</IconTile>}
                  title={label}
                  description={connected ? "Conectado" : "Não conectado"}
                  trailing={
                    connected ? (
                      <Button size="xs" variant="ghost" loading={busy} disabled={connectedCount <= 1} onClick={() => void handleDisconnect(id)} title={connectedCount <= 1 ? "É sua única forma de entrar" : undefined}>
                        Desconectar
                      </Button>
                    ) : (
                      <Button size="xs" variant="secondary" loading={busy} onClick={() => void handleConnect(id)}>
                        Conectar
                      </Button>
                    )
                  }
                />
              );
            })}
          </SettingsList>
        )}
        {error && <Notice compact>{error}</Notice>}
      </SettingsCard>

      <SettingsCard title="Integrações" description="Serviços que sincronizam dados com o Qqorvex. Revogar interrompe novas sincronizações.">
        {calendar.isLoading ? (
          <SkeletonList rows={1} leading />
        ) : (
          <SettingsList>
            <SettingsListRow
              leading={<IconTile tone={calendar.connection ? "success" : "neutral"}><CalendarBlankIcon /></IconTile>}
              title="Google Agenda"
              description={calendar.connection ? "Sincronizando sua Agenda com um calendário dedicado no Google." : "Veja seus eventos do Qqorvex também no Google Agenda."}
              trailing={
                calendar.connection ? (
                  <Button size="xs" variant="ghost" className="text-danger" loading={disconnectCalendar.isPending} onClick={() => setConfirmCalendar(true)}>
                    Revogar acesso
                  </Button>
                ) : (
                  <ButtonLink to="/planejar/agenda" size="xs" variant="secondary">
                    Conectar na Agenda
                  </ButtonLink>
                )
              }
            />
          </SettingsList>
        )}
        {calendar.error && <Notice compact>Não foi possível verificar as integrações.</Notice>}
        {disconnectCalendar.error && <Notice compact>{disconnectCalendar.error instanceof Error ? disconnectCalendar.error.message : "Não foi possível revogar a conexão."}</Notice>}
      </SettingsCard>

      <ConfirmDialog
        isOpen={confirmCalendar}
        title="Revogar acesso ao Google Agenda?"
        description="Novos eventos deixam de ser sincronizados. Os que já foram copiados continuam na sua conta Google."
        confirmLabel="Revogar"
        onConfirm={() => {
          setConfirmCalendar(false);
          disconnectCalendar.mutate();
        }}
        onCancel={() => setConfirmCalendar(false)}
      />
    </div>
  );
}
