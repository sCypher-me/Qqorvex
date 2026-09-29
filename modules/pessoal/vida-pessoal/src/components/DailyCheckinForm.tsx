import { useState, type ReactNode } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ProgressBar, SkeletonCards } from "@qqorvex/ui";
import { useCheckinHistory, useTodayCheckin, useUpsertCheckin } from "../hooks/useVidaPessoal";
import { localDateKey } from "../service";
import type { DailyCheckin } from "../types";

const SCALE = [1, 2, 3, 4, 5];
const SCALE_HINT = ["Muito baixo", "Baixo", "Regular", "Bom", "Muito bom"];
const SCALE_EMOJI = ["😞", "🙁", "😐", "🙂", "😄"];

function ScaleSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] text-fg-2">{label}</span>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {SCALE.map((scaleValue) => {
          const selected = value === scaleValue;
          return (
            <button
              key={scaleValue}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label}: ${scaleValue} de 5, ${SCALE_HINT[scaleValue - 1]}`}
              title={SCALE_HINT[scaleValue - 1]}
              onClick={() => onChange(scaleValue)}
              className={`flex-1 rounded-xl py-3.5 text-[24px] leading-none border cursor-pointer transition-colors ${
                selected
                  ? "bg-gold-soft border-gold-line text-gold-fg"
                  : "bg-canvas border-line text-fg-2 hover:text-fg hover:border-line-strong"
              }`}
            >
              <span aria-hidden="true">{SCALE_EMOJI[scaleValue - 1]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-fg-3"><span>{SCALE_HINT[0]}</span><span>{SCALE_HINT[4]}</span></div>
    </div>
  );
}

function ScaleSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] text-fg-2">{label}</span>
      <div className="flex items-center gap-3.5">
        <ProgressBar value={(value / 5) * 100} className="flex-1" />
        <span className="font-mono text-sm text-fg">{value}/5</span>
      </div>
    </div>
  );
}

function CheckinCard({ actions, children, showTitle = true }: { actions?: ReactNode; children: ReactNode; showTitle?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-[22px] flex flex-col gap-[18px]">
      {(showTitle || actions) && <div className="flex items-center gap-3">
        {showTitle && <h2 className="flex-1 font-display text-lg font-semibold text-fg">Check-in diário</h2>}
        {actions}
      </div>}
      {children}
    </div>
  );
}

function formatHistoryDate(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .format(new Date(`${isoDate}T00:00:00`))
    .replace(".", "");
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-fg-3">
        <span className="truncate">{label}</span>
        <span className="font-mono text-fg-2">{value}/5</span>
      </div>
      <ProgressBar value={(value / 5) * 100} height={4} />
    </div>
  );
}

function CheckinHistory({ checkins, today, isLoading, error, onRetry }: {
  checkins: DailyCheckin[];
  today: string;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const previousCheckins = checkins.filter((checkin) => checkin.checkin_date !== today);
  const visibleCheckins = showAll ? previousCheckins : previousCheckins.slice(0, 5);
  const average = previousCheckins.length
    ? ((previousCheckins.reduce((sum, checkin) => sum + checkin.mood + checkin.sleep_quality + checkin.energy, 0) / (previousCheckins.length * 3)).toFixed(1))
    : null;

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 gap-4 p-[22px]" aria-labelledby="checkin-history-title">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-gold-fg">Olhe para trás</p>
          <h2 id="checkin-history-title" className="mt-1 font-display text-lg font-semibold text-fg">Histórico de check-ins</h2>
          <p className="mt-1 text-xs text-fg-3">Uma visão curta dos últimos dias para perceber padrões, não para se cobrar.</p>
        </div>
        {average && <span className="font-mono text-xs text-fg-2">média de {previousCheckins.length} registros · {average}/5</span>}
      </div>
      {isLoading ? (
        <SkeletonCards count={3} className="h-14 w-full rounded-xl" />
      ) : error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-error/5 px-3.5 py-3" role="alert">
          <p className="flex-1 text-sm text-fg-2">Não foi possível carregar o histórico agora.</p>
          <Button type="button" variant="quiet" size="sm" onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : visibleCheckins.length === 0 ? (
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3.5 py-3 text-sm leading-relaxed text-fg-2">Seus registros anteriores aparecerão aqui depois do próximo check-in.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleCheckins.map((checkin) => (
            <article key={checkin.id} className="rounded-xl border border-line bg-vex-obsidian/55 p-3.5">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-[.08em] text-gold-fg">{formatHistoryDate(checkin.checkin_date)}</span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                {checkin.note && <span className="max-w-[45%] truncate text-xs text-fg-3" title={checkin.note}>nota registrada</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <HistoryMetric label="Humor" value={checkin.mood} />
                <HistoryMetric label="Sono" value={checkin.sleep_quality} />
                <HistoryMetric label="Energia" value={checkin.energy} />
              </div>
              {checkin.note && <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-fg-2">{checkin.note}</p>}
            </article>
          ))}
        </div>
      )}
      {previousCheckins.length > 5 && (
        <Button type="button" variant="quiet" size="sm" className="self-start" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Mostrar menos" : `Ver todos os ${previousCheckins.length} registros`}
        </Button>
      )}
    </section>
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

  const [mood, setMood] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  let currentCheckin: ReactNode;
  if (isLoading) {
    currentCheckin = (
      <CheckinCard showTitle={showTitle}>
        <SkeletonCards count={3} className="h-16 w-full rounded-xl" />
      </CheckinCard>
    );
  } else if (checkin && !editing) {
    currentCheckin = (
      <CheckinCard showTitle={showTitle}
        actions={
          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => {
              setMood(checkin.mood);
              setSleepQuality(checkin.sleep_quality);
              setEnergy(checkin.energy);
              setNote(checkin.note ?? "");
              setEditing(true);
            }}
          >
            Editar hoje
          </Button>
        }
      >
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex items-center gap-3 px-3.5 py-3">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
          <span className="text-sm text-fg">Check-in de hoje registrado</span>
          <span className="ml-auto font-mono text-xs text-fg-3">{today.split("-").reverse().join("/")}</span>
        </div>
        <ScaleSummary label="Humor" value={checkin.mood} />
        <ScaleSummary label="Qualidade do sono" value={checkin.sleep_quality} />
        <ScaleSummary label="Energia" value={checkin.energy} />
        {checkin.note && <p className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3.5 py-3 text-sm leading-relaxed text-fg">{checkin.note}</p>}
      </CheckinCard>
    );
  } else {
    currentCheckin = (
      <CheckinCard showTitle={showTitle}>
        {checkinError && <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-error/5 px-3.5 py-3" role="alert">
          <p className="flex-1 text-sm text-fg-2">Não foi possível confirmar se você já registrou o check-in de hoje.</p>
          <Button type="button" variant="quiet" size="sm" onClick={() => void retryCheckin()}>Recarregar</Button>
        </div>}
        <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3.5 py-3 text-sm leading-relaxed text-fg-2">Leva menos de um minuto. Use as notas para registrar contexto, não para criar mais uma tarefa.</div>
        <ScaleSelector label="Como está seu humor hoje?" value={mood} onChange={setMood} />
        <ScaleSelector label="Qualidade do sono" value={sleepQuality} onChange={setSleepQuality} />
        <ScaleSelector label="Como está sua energia hoje?" value={energy} onChange={setEnergy} />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          maxLength={500}
          placeholder="Uma linha sobre o dia (opcional, até 500 caracteres)"
          aria-label="Nota do dia"
          className="q-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            className="self-start"
            disabled={upsertCheckin.isPending}
            onClick={async () => {
              try {
                await upsertCheckin.mutateAsync({ mood, sleepQuality, energy, note: note.trim() || undefined });
                setEditing(false);
                onSaved?.();
              } catch {
                // O aviso abaixo mantém o formulário aberto para permitir tentar novamente.
              }
            }}
          >
            {upsertCheckin.isPending ? "Salvando…" : checkin ? "Salvar alterações" : "Salvar check-in"}
          </Button>
          {editing && checkin && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar edição</Button>}
          <span className="ml-auto text-[11px] text-fg-3">{note.length}/500</span>
        </div>
        {upsertCheckin.isError && <p className="text-sm text-danger" role="alert">Não foi possível salvar. Seus dados continuam aqui; tente novamente.</p>}
      </CheckinCard>
    );
  }

  return <div className="flex min-w-0 flex-col gap-4">{currentCheckin}{includeHistory && <CheckinHistory checkins={checkins} today={today} isLoading={historyLoading} error={historyError} onRetry={() => void retryHistory()} />}</div>;
}
