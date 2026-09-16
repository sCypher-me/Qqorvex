import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useTodayCheckin, useUpsertCheckin } from "../hooks/useVidaPessoal";

const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];

function ScaleSelector({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="flex gap-1">
      {labels.map((label, index) => {
        const scaleValue = index + 1;
        return (
          <button
            key={scaleValue}
            type="button"
            onClick={() => onChange(scaleValue)}
            className={`text-lg w-9 h-9 rounded-md border flex items-center justify-center ${
              value === scaleValue ? "border-primary bg-surface-1" : "border-border hover:bg-surface-1"
            }`}
          >
            {label}
          </button>
        );
      })}
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

  if (isLoading) return <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>;

  if (checkin && !editing) {
    return (
      <div className="bg-surface-2 border border-border rounded-md p-4 flex items-center justify-between gap-3">
        <p className="font-sans text-sm text-text-primary">
          Check-in de hoje: {MOOD_EMOJI[checkin.mood - 1]} humor · sono {checkin.sleep_quality}/5 · energia{" "}
          {checkin.energy}/5
        </p>
        <button
          type="button"
          onClick={() => {
            setMood(checkin.mood);
            setSleepQuality(checkin.sleep_quality);
            setEnergy(checkin.energy);
            setNote(checkin.note ?? "");
            setEditing(true);
          }}
          className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4 flex flex-col gap-3">
      <div>
        <p className="font-sans text-xs text-text-secondary-warm mb-1">Humor</p>
        <ScaleSelector value={mood} onChange={setMood} labels={MOOD_EMOJI} />
      </div>
      <div>
        <p className="font-sans text-xs text-text-secondary-warm mb-1">Qualidade do sono</p>
        <ScaleSelector value={sleepQuality} onChange={setSleepQuality} labels={["1", "2", "3", "4", "5"]} />
      </div>
      <div>
        <p className="font-sans text-xs text-text-secondary-warm mb-1">Energia</p>
        <ScaleSelector value={energy} onChange={setEnergy} labels={["1", "2", "3", "4", "5"]} />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary text-sm outline-none focus:border-brand-cyan"
      />
      <Button
        variant="primary"
        onClick={() => {
          upsertCheckin.mutate({ mood, sleepQuality, energy, note: note.trim() || undefined });
          setEditing(false);
        }}
      >
        Salvar check-in
      </Button>
    </div>
  );
}
