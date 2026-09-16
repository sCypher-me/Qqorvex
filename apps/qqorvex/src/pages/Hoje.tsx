import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Badge, type BadgeTone } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { useHojeSummary } from "@qqorvex/module-hoje";
import type { HojePriority } from "@qqorvex/module-hoje";
import { useEnsureDailyNote } from "@qqorvex/module-segundo-cerebro";
import { useGamificationStats, GamificationWidget } from "@qqorvex/module-gamificacao";
import { supabase } from "../app/supabase";

/** Mapeamento de apresentação (prioridade do Hoje → tom do Badge) — não é um conceito do domínio Hoje, só de como esta página escolhe exibir. */
const PRIORITY_TONE: Record<HojePriority, BadgeTone> = {
  informativo: "info",
  atencao: "warning",
  importante: "warning",
  urgente: "error",
};

const PRIORITY_LABEL: Record<HojePriority, string> = {
  informativo: "Informativo",
  atencao: "Atenção",
  importante: "Importante",
  urgente: "Urgente",
};

export function HojePage() {
  const { session, signOut } = useAuth();
  const { summary, isLoading } = useHojeSummary();
  const navigate = useNavigate();
  const ensureDailyNote = useEnsureDailyNote(supabase, session!.user.id);
  const { progress, title: gamificationTitle } = useGamificationStats(supabase, session!.user.id);

  async function handleOpenDailyNote() {
    const page = await ensureDailyNote.mutateAsync(new Date());
    navigate(`/segundo-cerebro/${page.id}`);
  }

  return (
    <main className="min-h-screen bg-background px-8 py-8 flex flex-col gap-6">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Hoje</h1>
          <p className="font-sans text-sm text-text-secondary-warm">{session?.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="chip" onClick={handleOpenDailyNote} disabled={ensureDailyNote.isPending}>
            Nota do Dia
          </Button>
          <Link to="/vex">
            <Button variant="primary">Falar com a Vex</Button>
          </Link>
          <Button variant="chip" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <GamificationWidget progress={progress} title={gamificationTitle} />
      </div>

      <Card className="w-full max-w-2xl">
        {isLoading ? (
          <p className="font-sans text-text-secondary-warm">Carregando...</p>
        ) : summary.items.length === 0 ? (
          <p className="font-sans text-text-secondary-warm">
            Nada por aqui ainda — crie uma tarefa para hoje ou com prazo vencido e ela aparece
            aqui automaticamente.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="font-sans text-text-primary text-sm">{item.title}</span>
                {item.priority && <Badge tone={PRIORITY_TONE[item.priority]}>{PRIORITY_LABEL[item.priority]}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
