import { useState, type ReactNode } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, EmptyState, ProgressBar } from "@qqorvex/ui";
import { useTodayCheckin, useUpsertCheckin } from "../hooks/useVidaPessoal";

const SCALE = [1, 2, 3, 4, 5];

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
      <span className="text-[13px] text-text-secondary">{label}</span>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {SCALE.map((scaleValue) => {
          const selected = value === scaleValue;
          return (
            <button
              key={scaleValue}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(scaleValue)}
              className={`flex-1 rounded-xl py-3.5 font-mono text-[15px] border cursor-pointer transition-colors ${
                selected
                  ? "bg-[rgba(67,185,210,.12)] border-vex-cyan-dark text-vex-cyan-bright"
                  : "bg-vex-obsidian border-border text-text-secondary hover:text-text-primary hover:border-text-muted"
              }`}
            >
              {scaleValue}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScaleSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <div className="flex items-center gap-3.5">
        <ProgressBar value={(value / 5) * 100} className="flex-1" />
        <span className="font-mono text-sm text-text-primary">{value}/5</span>
      </div>
    </div>
  );
}

function CheckinCard({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="qv-card p-[22px] flex flex-col gap-[18px]">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 font-display text-lg font-semibold text-text-primary">Check-in diário</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** Um registro por dia (`unique(user_id, checkin_date)`) — reabrir hoje sempre edita o mesmo check-in. */
export function DailyCheckinForm({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const { checkin, isLoading } = useTodayCheckin(client, today);
  const upsertCheckin = useUpsertCheckin(client, userId, today);

  const [mood, setMood] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <CheckinCard>
        <EmptyState>Carregando...</EmptyState>
      </CheckinCard>
    );
  }

  if (checkin && !editing) {
    return (
      <CheckinCard
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
            Editar
          </Button>
        }
      >
        <ScaleSummary label="Humor" value={checkin.mood} />
        <ScaleSummary label="Qualidade do sono" value={checkin.sleep_quality} />
        <ScaleSummary label="Energia" value={checkin.energy} />
        {checkin.note && <p className="qv-well px-3.5 py-3 text-sm leading-relaxed text-text-primary">{checkin.note}</p>}
      </CheckinCard>
    );
  }

  return (
    <CheckinCard>
      <ScaleSelector label="Como está seu humor hoje?" value={mood} onChange={setMood} />
      <ScaleSelector label="Qualidade do sono" value={sleepQuality} onChange={setSleepQuality} />
      <ScaleSelector label="Como está sua energia hoje?" value={energy} onChange={setEnergy} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Uma linha sobre o dia (opcional)"
        aria-label="Nota do dia"
        className="qv-field"
      />
      <Button
        type="button"
        variant="primary"
        className="self-start"
        onClick={() => {
          upsertCheckin.mutate({ mood, sleepQuality, energy, note: note.trim() || undefined });
          setEditing(false);
        }}
      >
        Salvar check-in
      </Button>
    </CheckinCard>
  );
}
