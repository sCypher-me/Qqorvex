import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRingingIcon, CalendarBlankIcon, DeviceMobileIcon, RepeatIcon, RoadHorizonIcon, WalletIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import { listPushSubscriptions, removePushSubscriptionByEndpoint, useNotifications } from "@qqorvex/notifications";
import { Button, Notice, SkeletonList, Switch } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { IconTile, SettingsCard, SettingsHeader, SettingsList, SettingsListRow, relativeTime } from "./shared";

const SUBSCRIPTIONS_KEY = ["push-subscriptions"] as const;

/** Nome amigável do serviço de push a partir do endpoint (sem expor o endpoint inteiro). */
function pushServiceLabel(endpoint: string): string {
  try {
    const host = new URL(endpoint).host;
    if (host.includes("fcm.googleapis") || host.includes("android.googleapis")) return "Chrome, Edge ou Android";
    if (host.includes("mozilla")) return "Firefox";
    if (host.includes("apple")) return "Safari ou iPhone";
    if (host.includes("windows") || host.includes("notify.windows")) return "Windows";
    return host;
  } catch {
    return "Navegador";
  }
}

const SOURCES = [
  { icon: <CalendarBlankIcon />, title: "Agenda", description: "Lembretes de eventos no horário que você definir em cada evento." },
  { icon: <RepeatIcon />, title: "Hábitos", description: "Um aviso no horário preferido quando o hábito do dia ainda não foi registrado." },
  { icon: <WalletIcon />, title: "Orçamento", description: "Quando os gastos de uma categoria passam do limite do mês." },
];

function readPreferences(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  const saved = metadata?.qqorvex_preferences;
  return saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
}

export function NotificationSettings() {
  const { userId } = useAccount();
  const { session } = useAuth();
  const [planAlerts, setPlanAlerts] = useState(() => readPreferences(session?.user.user_metadata).plan_alerts !== false);
  const [planAlertsError, setPlanAlertsError] = useState(false);

  async function togglePlanAlerts(next: boolean) {
    setPlanAlerts(next);
    setPlanAlertsError(false);
    const current = readPreferences(session?.user.user_metadata);
    const { error } = await supabase.auth.updateUser({ data: { qqorvex_preferences: { ...current, plan_alerts: next } } });
    if (error) {
      setPlanAlerts(!next);
      setPlanAlertsError(true);
    }
  }
  const queryClient = useQueryClient();
  const push = useNotifications(supabase, userId, import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const subscriptions = useQuery({ queryKey: [...SUBSCRIPTIONS_KEY, userId], queryFn: () => listPushSubscriptions(supabase) });
  const refreshList = () => void queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
  const devices = subscriptions.data ?? [];

  async function toggle(next: boolean) {
    if (next) await push.enable();
    else await push.disable();
    refreshList();
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Notificações" description="Avisos importantes chegam mesmo com o Qqorvex fechado. Cada dispositivo é ativado separadamente." />

      <SettingsCard
        title="Notificações neste dispositivo"
        description={
          !push.supported
            ? "Este navegador não oferece notificações push. No iPhone, adicione o Qqorvex à tela de início primeiro."
            : push.isLoading
              ? "Verificando…"
              : push.isSubscribed
                ? "Ativas. Você recebe os avisos abaixo aqui."
                : "Desativadas. Ative para receber lembretes aqui."
        }
        aside={push.supported && !push.isLoading ? <Switch checked={push.isSubscribed} onChange={(next) => void toggle(next)} label="Notificações neste dispositivo" /> : undefined}
      >
        {push.error && (
          <Notice compact tone="warning">
            {push.error}
          </Notice>
        )}
      </SettingsCard>

      <SettingsCard title="O que avisamos" description="Os horários e limites são definidos em cada área.">
        <SettingsList>
          {SOURCES.map((source) => (
            <SettingsListRow key={source.title} leading={<IconTile>{source.icon}</IconTile>} title={source.title} description={source.description} />
          ))}
          <SettingsListRow
            leading={<IconTile><RoadHorizonIcon /></IconTile>}
            title="Plano do dia"
            description="Só quando há um conflito real na agenda ou uma tarefa de hoje que não cabe mais no seu horário disponível. Um aviso por problema, nunca fora do seu horário."
            trailing={<Switch checked={planAlerts} onChange={(next) => void togglePlanAlerts(next)} label="Avisos do plano do dia" />}
          />
        </SettingsList>
        {planAlertsError && <Notice compact>Não foi possível salvar essa preferência agora. Tente de novo.</Notice>}
      </SettingsCard>

      <SettingsCard title="Dispositivos com notificações" description="Remova os que você não usa mais." aside={<Button size="sm" variant="ghost" onClick={refreshList}>Atualizar</Button>}>
        {subscriptions.isLoading ? (
          <SkeletonList rows={2} leading />
        ) : subscriptions.error ? (
          <Notice compact>Não foi possível listar os dispositivos.</Notice>
        ) : devices.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-fg-3">
            <BellRingingIcon size={16} /> Nenhum dispositivo recebe notificações ainda.
          </p>
        ) : (
          <SettingsList>
            {devices.map((device) => (
              <SettingsListRow
                key={device.id}
                leading={<IconTile><DeviceMobileIcon /></IconTile>}
                title={pushServiceLabel(device.endpoint)}
                description={`Ativado ${relativeTime(device.created_at)}`}
                trailing={
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={async () => {
                      await removePushSubscriptionByEndpoint(supabase, device.endpoint).catch(() => undefined);
                      refreshList();
                    }}
                  >
                    Remover
                  </Button>
                }
              />
            ))}
          </SettingsList>
        )}
      </SettingsCard>
    </div>
  );
}
