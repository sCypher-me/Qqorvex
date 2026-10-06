import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarBlankIcon, DiscordLogoIcon, EnvelopeSimpleIcon, GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { OAUTH_PROVIDERS, useAuth, useIdentities, type OAuthProviderId } from "@qqorvex/auth";
import { useDisconnectGoogleCalendar, useGoogleCalendarConnection } from "@qqorvex/module-agenda";
import { Badge, Button, ButtonLink, ConfirmDialog, Notice, SkeletonList } from "@qqorvex/ui";
import { activeRoleLabels, parseDiscordLinkParam, useConnectDiscord, useDisconnectDiscord, useDiscordConnection } from "./discordRoles";
import { IconTile, SettingsCard, SettingsHeader, SettingsList, SettingsListRow } from "./shared";

const DISCORD_RESULT_NOTICE = {
  connected: { tone: "success", text: "Discord conectado! Seus cargos no servidor do Qqorvex já estão sendo aplicados." },
  cancelled: { tone: "info", text: "Conexão com o Discord cancelada. Dá para conectar quando quiser." },
  error: { tone: "error", text: "Não foi possível conectar o Discord. Tente de novo em alguns minutos." },
} as const;

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

  const discord = useDiscordConnection(client);
  const connectDiscord = useConnectDiscord(client);
  const disconnectDiscord = useDisconnectDiscord(client);
  const [confirmDiscord, setConfirmDiscord] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const discordParam = parseDiscordLinkParam(searchParams.get("discord"));
  const [discordResult] = useState(discordParam === "start" ? null : discordParam);
  const autoStarted = useRef(false);

  // `?discord=` vem do retorno do OAuth ou do Discord (cargos vinculados → "conectar"). Lê uma vez e limpa a URL.
  useEffect(() => {
    if (!discordParam || discord.isLoading) return;
    if (discordParam === "start" && !discord.connection && !autoStarted.current) {
      autoStarted.current = true;
      connectDiscord.mutate();
    }
    const next = new URLSearchParams(searchParams);
    next.delete("discord");
    setSearchParams(next, { replace: true });
  }, [discordParam, discord.isLoading, discord.connection, connectDiscord, searchParams, setSearchParams]);

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
            <SettingsListRow
              leading={<IconTile tone={discord.connection ? "success" : "neutral"}><DiscordLogoIcon /></IconTile>}
              title="Discord · cargos no servidor"
              description={
                discord.connection
                  ? `Conectado como @${discord.connection.username}. ${
                    activeRoleLabels(discord.connection.roles).length
                      ? `Cargos: ${activeRoleLabels(discord.connection.roles).join(", ")}.`
                      : "Seus cargos aparecem aqui quando seu plano ou insígnias mudarem."
                  }`
                  : "Receba automaticamente os cargos de Beta Tester, Plus, Amigo Lifetime e Parceiro no servidor do Qqorvex."
              }
              trailing={
                discord.connection ? (
                  <Button size="xs" variant="ghost" className="text-danger" loading={disconnectDiscord.isPending} onClick={() => setConfirmDiscord(true)}>
                    Desconectar
                  </Button>
                ) : (
                  <Button size="xs" variant="secondary" loading={connectDiscord.isPending} disabled={discord.isLoading} onClick={() => connectDiscord.mutate()}>
                    Conectar
                  </Button>
                )
              }
            />
          </SettingsList>
        )}
        {discordResult && <Notice compact tone={DISCORD_RESULT_NOTICE[discordResult].tone}>{DISCORD_RESULT_NOTICE[discordResult].text}</Notice>}
        {connectDiscord.error && <Notice compact>{connectDiscord.error instanceof Error ? connectDiscord.error.message : "Não foi possível iniciar a conexão com o Discord."}</Notice>}
        {disconnectDiscord.error && <Notice compact>{disconnectDiscord.error instanceof Error ? disconnectDiscord.error.message : "Não foi possível desconectar o Discord."}</Notice>}
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

      <ConfirmDialog
        isOpen={confirmDiscord}
        title="Desconectar o Discord?"
        description="Os cargos de Beta Tester, Plus, Amigo Lifetime e Parceiro saem da sua conta no servidor do Qqorvex. Sua conta e seus dados no app não mudam."
        confirmLabel="Desconectar"
        onConfirm={() => {
          setConfirmDiscord(false);
          disconnectDiscord.mutate();
        }}
        onCancel={() => setConfirmDiscord(false)}
      />
    </div>
  );
}
