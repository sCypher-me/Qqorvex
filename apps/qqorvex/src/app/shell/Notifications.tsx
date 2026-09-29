import { useNavigate } from "react-router-dom";
import { BellIcon, BellSlashIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useHojeSummary, type HojePriority } from "@qqorvex/module-hoje";
import { useNotifications } from "@qqorvex/notifications";
import { Badge, Button, Popover, cx } from "@qqorvex/ui";
import { useAccount } from "../account";
import { supabase } from "../supabase";
import { MODULE_ROUTES } from "./navigation";

const ATTENTION: HojePriority[] = ["urgente", "importante", "atencao"];
const PRIORITY_LABEL: Record<HojePriority, { label: string; tone: "danger" | "warning" | "gold" | "neutral" }> = {
  urgente: { label: "Urgente", tone: "danger" },
  importante: { label: "Importante", tone: "warning" },
  atencao: { label: "Atenção", tone: "gold" },
  informativo: { label: "Info", tone: "neutral" },
};

/** Sino com os itens que pedem atenção (vindos do resumo da Hoje) e o controle de push. */
export function NotificationsButton() {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const { summary } = useHojeSummary();
  const push = useNotifications(supabase, userId, import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const items = summary.items.filter((item) => item.priority && ATTENTION.includes(item.priority));

  return (
    <Popover
      label="Notificações"
      placement="bottom-end"
      className="w-[min(380px,calc(100vw-24px))] p-0"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={items.length ? `Notificações: ${items.length} itens pedem atenção` : "Notificações"}
          title="Notificações"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg"
        >
          <BellIcon size={18} />
          {items.length > 0 && (
            <span aria-hidden="true" className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-gold ring-2 ring-canvas" />
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex max-h-[min(520px,70dvh)] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13.5px] font-semibold">Pedem sua atenção</p>
            <span className="text-xs tabular-nums text-fg-3">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <CheckCircleIcon size={28} className="text-success" />
              <p className="text-[13.5px] font-medium">Tudo em dia</p>
              <p className="text-xs text-fg-3">Tarefas atrasadas, prazos próximos e contas a vencer aparecem aqui.</p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {items.map((item) => {
                const route = MODULE_ROUTES[item.source];
                const priority = PRIORITY_LABEL[item.priority ?? "informativo"];
                return (
                  <li key={`${item.source}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        navigate(route?.to ?? "/");
                      }}
                      className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-hover"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-fg-3">
                          {route?.label ?? item.source}
                          {item.time ? ` · ${formatWhen(item.time)}` : ""}
                        </span>
                      </span>
                      <Badge tone={priority.tone}>{priority.label}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex items-center gap-3 border-t border-line px-4 py-3">
            <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", push.isSubscribed ? "bg-success-soft text-success" : "bg-hover text-fg-3")}>
              {push.isSubscribed ? <BellIcon size={16} /> : <BellSlashIcon size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-fg">Lembretes neste dispositivo</p>
              <p className="text-2xs text-fg-3">
                {!push.supported ? "Indisponível neste navegador" : push.isLoading ? "Verificando…" : push.isSubscribed ? "Ativos para agenda, hábitos e contas" : "Desativados"}
              </p>
              {push.error && <p className="mt-1 text-2xs text-danger">{push.error}</p>}
            </div>
            {push.supported && !push.isLoading && (
              <Button size="xs" variant={push.isSubscribed ? "ghost" : "secondary"} onClick={() => void (push.isSubscribed ? push.disable() : push.enable())}>
                {push.isSubscribed ? "Desativar" : "Ativar"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

function formatWhen(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y = 0, m = 1, d = 1] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
