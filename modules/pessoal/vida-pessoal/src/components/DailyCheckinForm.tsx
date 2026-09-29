import { useState, type ReactNode } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, BatteryHighIcon, CheckCircleIcon, MoonStarsIcon, NoteIcon, PencilSimpleIcon, SmileyIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { BarChart, Button, ChartLegend, Notice, SkeletonBlock, Textarea, cx } from "@qqorvex/ui";
import { useCheckinHistory, useTodayCheckin, useUpsertCheckin } from "../hooks/useVidaPessoal";
import { localDateKey } from "../service";
import type { DailyCheckin } from "../types";

const SCALE = [1, 2, 3, 4, 5] as const;
const METRICS = [
  { key: "mood", label: "Humor", question: "Como está seu humor?", icon: <SmileyIcon />, hints: ["Muito baixo", "Baixo", "Neutro", "Bom", "Ótimo"] },
  { key: "sleep_quality", label: "Sono", question: "Como você dormiu?", icon: <MoonStarsIcon />, hints: ["Muito mal", "Mal", "Razoável", "Bem", "Muito bem"] },
  { key: "energy", label: "Energia", question: "Quanta energia você tem?", icon: <BatteryHighIcon />, hints: ["Esgotada", "Baixa", "Média", "Boa", "Alta"] },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];
type Values = Record<MetricKey, number>;

function ScaleSelector({ metric, value, onChange }: { metric: (typeof METRICS)[number]; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-medium text-fg">{metric.question}</span>
        <span className="text-xs font-medium text-gold-fg">{metric.hints[value - 1]}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={metric.label}>
        {SCALE.map((step) => {
          const selected = value === step;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${metric.label}: ${step} de 5, ${metric.hints[step - 1]}`}
              onClick={() => onChange(step)}
              className={cx(
                "h-10 rounded-lg border text-[14px] font-semibold tabular-nums transition-colors",
                selected ? "border-gold bg-gold text-on-gold" : step < value ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line bg-field text-fg-3 hover:border-line-strong hover:text-fg",
              )}
            >
              {step}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({ metric, value }: { metric: (typeof METRICS)[number]; value: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs text-fg-3 [&_svg]:size-3.5">
        {metric.icon}
        {metric.label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-[22px] font-semibold leading-none tabular-nums text-fg">{value}</span>
        <span className="truncate text-xs text-fg-3">{metric.hints[value - 1]}</span>
      </span>
      <span className="grid grid-cols-5 gap-0.5" aria-hidden="true">
        {SCALE.map((step) => (
          <span key={step} className={cx("h-1 rounded-full", step <= value ? "bg-gold" : "bg-line")} />
        ))}
      </span>
    </div>
  );
}

function CheckinCard({ title, subtitle, actions, children, bare = false }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; bare?: boolean }) {
  return (
    <section className={cx("flex min-w-0 flex-col gap-4", !bare && "rounded-xl border border-line bg-surface p-4 sm:p-5")}>
      {(title || actions) && (
        <header className="flex items-center gap-3">
          {title && (
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-fg-3">{subtitle}</p>}
            </div>
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

function shiftKey(key: string, days: number): string {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

function average(checkins: DailyCheckin[], key: MetricKey): number | null {
  return checkins.length ? checkins.reduce((sum, checkin) => sum + checkin[key], 0) / checkins.length : null;
}

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function CheckinTrends({ checkins, today, isLoading, error, onRetry }: { checkins: DailyCheckin[]; today: string; isLoading: boolean; error: unknown; onRetry: () => void }) {
  const byDate = new Map(checkins.map((checkin) => [checkin.checkin_date, checkin]));
  const days = Array.from({ length: 14 }, (_, index) => shiftKey(today, index - 13));
  const lastWeek = days.slice(7).map((key) => byDate.get(key)).filter((item): item is DailyCheckin => Boolean(item));
  const previousWeek = days.slice(0, 7).map((key) => byDate.get(key)).filter((item): item is DailyCheckin => Boolean(item));
  const notes = checkins.filter((checkin) => checkin.note).slice(0, 4);
  const series = METRICS.map((metric) => ({ key: metric.key, label: metric.label }));
  const data = days.map((key) => {
    const checkin = byDate.get(key);
    const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return {
      label: String(d),
      fullLabel: `${WEEKDAY[date.getDay()]}, ${d}/${m}${checkin ? "" : " · sem registro"}`,
      values: { mood: checkin?.mood ?? 0, sleep_quality: checkin?.sleep_quality ?? 0, energy: checkin?.energy ?? 0 },
    };
  });

  return (
    <CheckinCard title="Últimos 14 dias" subtitle={`Médias dos últimos 7 dias · ${lastWeek.length} de 7 dias registrados`}>
      {isLoading ? (
        <SkeletonBlock className="h-48 w-full" />
      ) : error ? (
        <Notice compact actions={<Button size="sm" variant="secondary" onClick={onRetry}>Tentar de novo</Button>}>Não foi possível carregar o histórico.</Notice>
      ) : checkins.length === 0 ? (
        <p className="text-[13px] text-fg-3">Depois de alguns check-ins, aparecem aqui suas médias e padrões — sem cobrança, só para perceber.</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            {METRICS.map((metric) => {
              const current = average(lastWeek, metric.key);
              const previous = average(previousWeek, metric.key);
              const delta = current !== null && previous !== null ? current - previous : null;
              return (
                <div key={metric.key} className="min-w-0 rounded-lg border border-line-soft px-3 py-2">
                  <dt className="truncate text-xs text-fg-3">{metric.label}</dt>
                  <dd className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-[17px] font-semibold tabular-nums text-fg">{current === null ? "—" : current.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
                    {delta !== null && Math.abs(delta) >= 0.1 && (
                      <span className={cx("inline-flex items-center text-[11px] tabular-nums", delta > 0 ? "text-success" : "text-warning")} title="Comparado aos 7 dias anteriores">
                        {delta > 0 ? <ArrowUpRightIcon size={11} weight="bold" /> : <ArrowDownRightIcon size={11} weight="bold" />}
                        {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          <div className="flex flex-col gap-2">
            <ChartLegend series={series} />
            <BarChart data={data} series={series} height={170} integer label="Humor, sono e energia nos últimos 14 dias (escala de 1 a 5)" highlightIndex={13} />
          </div>
          {notes.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
              <h3 className="text-xs font-semibold text-fg-2">Notas recentes</h3>
              <ul className="flex flex-col gap-1.5">
                {notes.map((checkin) => {
                  const [, m = 1, d = 1] = checkin.checkin_date.split("-").map(Number);
                  return (
                    <li key={checkin.id} className="flex gap-2.5 text-[13px] leading-relaxed">
                      <span className="w-10 shrink-0 text-xs tabular-nums text-fg-4">{d}/{m}</span>
                      <span className="min-w-0 text-fg-2">{checkin.note}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </CheckinCard>
  );
}

/** Um registro por dia (`unique(user_id, checkin_date)`) — reabrir hoje sempre edita o mesmo check-in. */
export function DailyCheckinForm({
  client,
  userId,
  includeHistory = true,
  showTitle = true,
  onSaved,
}: {
  client: SupabaseClient<Database>;
  userId: string;
  includeHistory?: boolean;
  showTitle?: boolean;
  onSaved?: () => void;
}) {
  const today = localDateKey(new Date());
  const { checkin, isLoading, error: checkinError, refetch: retryCheckin } = useTodayCheckin(client, userId, today);
  const { checkins, isLoading: historyLoading, error: historyError, refetch: retryHistory } = useCheckinHistory(client, userId, 30, includeHistory);
  const upsertCheckin = useUpsertCheckin(client, userId, today);

  const [values, setValues] = useState<Values>({ mood: 3, sleep_quality: 3, energy: 3 });
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const title = showTitle ? "Check-in de hoje" : undefined;

  let current: ReactNode;
  if (isLoading) {
    current = (
      <CheckinCard title={title} bare={!showTitle}>
        <SkeletonBlock className="h-40 w-full" />
      </CheckinCard>
    );
  } else if (checkin && !editing) {
    current = (
      <CheckinCard
        title={title}
        bare={!showTitle}
        actions={
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<PencilSimpleIcon size={14} />}
            onClick={() => {
              setValues({ mood: checkin.mood, sleep_quality: checkin.sleep_quality, energy: checkin.energy });
              setNote(checkin.note ?? "");
              setEditing(true);
            }}
          >
            Editar
          </Button>
        }
      >
        <p className="flex items-center gap-2 text-[13px] text-fg-2">
          <CheckCircleIcon size={16} weight="fill" className="text-success" />
          Registrado hoje. Obrigado por parar um minuto.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {METRICS.map((metric) => (
            <MetricTile key={metric.key} metric={metric} value={checkin[metric.key]} />
          ))}
        </div>
        {checkin.note && (
          <p className="flex gap-2 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5 text-[13px] leading-relaxed text-fg-2">
            <NoteIcon size={15} className="mt-0.5 shrink-0 text-fg-3" />
            {checkin.note}
          </p>
        )}
      </CheckinCard>
    );
  } else {
    current = (
      <CheckinCard title={title} subtitle="Leva menos de um minuto" bare={!showTitle}>
        {checkinError && (
          <Notice compact actions={<Button size="sm" variant="secondary" onClick={() => void retryCheckin()}>Recarregar</Button>}>
            Não foi possível confirmar se você já registrou hoje.
          </Notice>
        )}
        {METRICS.map((metric) => (
          <ScaleSelector key={metric.key} metric={metric} value={values[metric.key]} onChange={(value) => setValues((prev) => ({ ...prev, [metric.key]: value }))} />
        ))}
        <Textarea
          label="Uma linha sobre o dia"
          labelAside={<span className="tabular-nums">{note.length}/500</span>}
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          maxLength={500}
          rows={2}
          placeholder="Opcional — contexto que ajuda a entender o dia depois"
        />
        {upsertCheckin.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar. Seus dados continuam aqui; tente novamente.</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editing && checkin && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          )}
          <Button
            loading={upsertCheckin.isPending}
            onClick={async () => {
              try {
                await upsertCheckin.mutateAsync({ mood: values.mood, sleepQuality: values.sleep_quality, energy: values.energy, note: note.trim() || undefined });
                setEditing(false);
                onSaved?.();
              } catch {
                // O aviso acima mantém o formulário aberto para tentar novamente.
              }
            }}
          >
            {checkin ? "Salvar alterações" : "Registrar check-in"}
          </Button>
        </div>
      </CheckinCard>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {current}
      {includeHistory && <CheckinTrends checkins={checkins} today={today} isLoading={historyLoading} error={historyError} onRetry={() => void retryHistory()} />}
    </div>
  );
}
