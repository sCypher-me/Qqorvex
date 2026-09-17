import { Link, useNavigate } from "react-router-dom";
import { Button, CardHeader, EmptyState, ProgressBar } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import { useHojeSummary } from "@qqorvex/module-hoje";
import type { HojeItem, HojePriority } from "@qqorvex/module-hoje";
import { useEnsureDailyNote } from "@qqorvex/module-segundo-cerebro";
import { useGamificationStats, GamificationWidget } from "@qqorvex/module-gamificacao";
import { endOfDay, startOfDay, useEventsInRange, type CalendarEvent } from "@qqorvex/module-agenda";
import { useHabits, useHabitLogs, type Habit } from "@qqorvex/module-metas-habitos";
import { computeProgressPercent, LIBRARY_ITEM_TYPE_LABELS, useLibraryItems } from "@qqorvex/module-biblioteca";
import { supabase } from "../app/supabase";

/** Mapeamento de apresentação (prioridade do Hoje → pílula) — não é um conceito do domínio Hoje, só de como esta página escolhe exibir. */
const PRIORITY_PILL: Record<HojePriority, string> = {
  informativo: "qv-pill-info",
  atencao: "qv-pill-warning",
  importante: "qv-pill-warning",
  urgente: "qv-pill-danger",
};

const PRIORITY_LABEL: Record<HojePriority, string> = {
  informativo: "Informativo",
  atencao: "Atenção",
  importante: "Importante",
  urgente: "Urgente",
};

/** `HojeItem.source` → rótulo legível do módulo de origem (valores dos `hoje-provider.ts`). */
const SOURCE_LABEL: Record<string, string> = {
  tarefas: "Tarefas",
  agenda: "Agenda",
  "metas-habitos": "Metas",
  estudos: "Estudos",
  "segundo-cerebro": "Cérebro",
  biblioteca: "Biblioteca",
  documentos: "Documentos",
  financas: "Finanças",
  "vida-pessoal": "Vida Pessoal",
};

/** Cor do filete dos eventos — mesma paleta da tela Agenda. */
const EVENT_ACCENT: Record<string, string> = {
  compromisso: "var(--color-vex-cyan)",
  reuniao: "var(--color-vex-gold-bright)",
  pessoal: "var(--color-category-green)",
  prazo: "var(--color-category-lavender)",
};

const HABIT_COLORS = [
  "var(--color-vex-cyan)",
  "var(--color-category-green)",
  "var(--color-category-blue)",
  "var(--color-category-lavender)",
  "var(--color-category-teal)",
  "var(--color-category-coral)",
];
const HABIT_WINDOW_DAYS = 30;
const MAX_HABITS = 6;

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** `item.time` pode ser um horário ("15:00", Agenda) ou uma data ("2026-09-16", prazos). */
function itemMeta(time: string | undefined): { label: string; value?: string } | null {
  if (!time) return null;
  if (/^\d{2}:\d{2}/.test(time)) return { label: "hoje", value: time.slice(0, 5) };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(time);
  if (!match) return { label: time };
  const today = localIsoDate(new Date());
  if (time === today) return { label: "prazo hoje" };
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return { label: time < today ? "venceu em" : "prazo", value: shortDate(date) };
}

export function HojePage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { summary, isLoading } = useHojeSummary();
  const navigate = useNavigate();
  const ensureDailyNote = useEnsureDailyNote(supabase, userId);
  const { progress, title: gamificationTitle } = useGamificationStats(supabase, userId);

  const now = new Date();
  const { events: todayEvents, isLoading: eventsLoading } = useEventsInRange(supabase, startOfDay(now), endOfDay(now));
  const { habits } = useHabits(supabase);
  const { items: libraryItems } = useLibraryItems(supabase);

  const activeHabits = habits.filter((habit) => habit.status === "ativo").slice(0, MAX_HABITS);
  // Mesmo critério do provider da Biblioteca: o item em andamento atualizado mais recentemente.
  const inProgressItem = libraryItems.find((item) => item.status === "em_andamento") ?? null;
  const sortedEvents = [...todayEvents].sort((a, b) => {
    if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1;
    return a.start_at.localeCompare(b.start_at);
  });
  const moduleCount = new Set(summary.items.map((item) => item.source)).size;

  async function handleOpenDailyNote() {
    const page = await ensureDailyNote.mutateAsync(new Date());
    navigate(`/segundo-cerebro/${page.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <GamificationWidget progress={progress} title={gamificationTitle} />

      {inProgressItem && (
        <ContinueCard
          title={inProgressItem.title}
          subtitle={inProgressItem.subtitle}
          coverUrl={inProgressItem.cover_url}
          typeLabel={LIBRARY_ITEM_TYPE_LABELS[inProgressItem.item_type]}
          progressCurrent={inProgressItem.progress_current}
          progressTotal={inProgressItem.progress_total}
          progressUnit={inProgressItem.progress_unit}
          progressPercent={computeProgressPercent(inProgressItem)}
          onOpen={() => navigate("/biblioteca")}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <div className="qv-card">
            <CardHeader
              divider
              title="Seu dia"
              meta={
                isLoading
                  ? undefined
                  : `${summary.items.length} ${summary.items.length === 1 ? "item" : "itens"} · ${moduleCount} ${
                      moduleCount === 1 ? "módulo" : "módulos"
                    }`
              }
              actions={
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={handleOpenDailyNote}
                  disabled={ensureDailyNote.isPending}
                >
                  Nota do Dia
                </Button>
              }
            />
            {isLoading ? (
              <EmptyState className="px-5 py-4">Carregando...</EmptyState>
            ) : summary.items.length === 0 ? (
              <EmptyState className="px-5 py-4">
                Nada por aqui ainda — crie uma tarefa para hoje ou com prazo vencido e ela aparece aqui automaticamente.
              </EmptyState>
            ) : (
              <ul className="flex flex-col">
                {summary.items.map((item) => (
                  <HojeRow key={`${item.source}-${item.id}`} item={item} />
                ))}
              </ul>
            )}
          </div>

          <div className="qv-card-vex p-5 flex gap-4">
            <img
              src="/brand/vex-avatar-512.png"
              alt="Vex"
              className="w-11 h-11 rounded-full object-cover shrink-0 shadow-[0_0_20px_rgba(67,185,210,.35)]"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-2.5">
              <span className="text-sm font-semibold text-vex-cyan-bright">Vex</span>
              <p className="text-sm leading-relaxed text-text-primary">
                Quer ajuda para organizar o dia? A Vex conversa com o contexto das suas telas.
              </p>
              <div>
                <Link to="/vex" className="qv-btn qv-btn-vex qv-btn-sm">
                  Falar com a Vex
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <div className="qv-card p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold">Agenda de hoje</span>
              <span className="flex-1" />
              <span className="font-mono text-xs text-text-muted">{shortDate(now)}</span>
            </div>
            {eventsLoading ? (
              <EmptyState>Carregando...</EmptyState>
            ) : sortedEvents.length === 0 ? (
              <EmptyState>
                Nada agendado para hoje.{" "}
                <Link to="/agenda" className="text-vex-cyan-bright hover:underline">
                  Abrir Agenda
                </Link>
              </EmptyState>
            ) : (
              sortedEvents.map((event) => <TodayEventRow key={event.id} event={event} />)
            )}
          </div>

          {activeHabits.length > 0 && (
            <div className="qv-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-semibold">Hábitos</span>
                <span className="flex-1" />
                <span className="font-mono text-xs text-text-muted">últimos {HABIT_WINDOW_DAYS} dias</span>
              </div>
              {activeHabits.map((habit, index) => (
                <HabitProgressRow key={habit.id} habit={habit} color={HABIT_COLORS[index % HABIT_COLORS.length]!} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HojeRow({ item }: { item: HojeItem }) {
  const meta = itemMeta(item.time);
  return (
    <li className="qv-row flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[.02] transition-colors">
      <span className="w-4 h-4 shrink-0 rounded-[5px] border-[1.75px] border-border" aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-sm font-medium text-text-primary">{item.title}</span>
        {meta && (
          <span className="text-xs text-text-muted">
            {meta.label}
            {meta.value && <span className="font-mono"> {meta.value}</span>}
          </span>
        )}
      </div>
      <span className="qv-pill qv-pill-module hidden sm:inline-flex">{SOURCE_LABEL[item.source] ?? item.source}</span>
      {item.priority && <span className={`qv-pill ${PRIORITY_PILL[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>}
    </li>
  );
}

function TodayEventRow({ event }: { event: CalendarEvent }) {
  const durationMin = Math.round((new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 60_000);
  const duration = event.is_all_day
    ? null
    : durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2, "0") : ""}`
      : `${durationMin} min`;
  return (
    <div className="flex gap-3 items-start">
      <span className="font-mono text-xs text-text-secondary w-[42px] shrink-0 pt-0.5">
        {event.is_all_day ? "Dia" : formatTime(event.start_at)}
      </span>
      <span
        className="w-0.5 self-stretch rounded-sm shrink-0"
        style={{ background: EVENT_ACCENT[event.category] ?? "var(--color-category-bluegray)" }}
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary truncate">{event.title}</span>
        {(duration || event.location) && (
          <span className="text-xs text-text-muted truncate">
            {duration && <span className="font-mono">{duration}</span>}
            {duration && event.location && " · "}
            {event.location}
          </span>
        )}
      </div>
    </div>
  );
}

function HabitProgressRow({ habit, color }: { habit: Habit; color: string }) {
  const { logs } = useHabitLogs(supabase, habit.id);
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (HABIT_WINDOW_DAYS - 1));
  const windowStartIso = localIsoDate(windowStart);
  const doneDays = new Set(
    logs.filter((log) => log.state === "concluido" && log.log_date >= windowStartIso).map((log) => log.log_date),
  ).size;
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{habit.name}</span>
        <span className="font-mono text-xs text-text-secondary">
          {doneDays}/{HABIT_WINDOW_DAYS}
        </span>
      </div>
      <ProgressBar value={(doneDays / HABIT_WINDOW_DAYS) * 100} color={color} height={5} />
    </div>
  );
}

function ContinueCard({
  title,
  subtitle,
  coverUrl,
  typeLabel,
  progressCurrent,
  progressTotal,
  progressUnit,
  progressPercent,
  onOpen,
}: {
  title: string;
  subtitle: string | null;
  coverUrl: string | null;
  typeLabel: string;
  progressCurrent: number | null;
  progressTotal: number | null;
  progressUnit: string | null;
  progressPercent: number | null;
  onOpen: () => void;
}) {
  const progressText =
    progressCurrent !== null && progressTotal
      ? `${progressCurrent} de ${progressTotal}${progressUnit ? ` ${progressUnit}` : ""}`
      : null;
  return (
    <div className="qv-card px-[18px] py-4 flex items-center gap-[18px] flex-wrap">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="w-14 h-20 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="w-14 h-20 shrink-0 rounded-lg border border-border bg-[linear-gradient(150deg,#1E232B,#0f1216)]" />
      )}
      <div className="flex-[1_1_220px] min-w-0 flex flex-col gap-[5px]">
        <span className="qv-eyebrow">Continuar de onde você parou · Biblioteca</span>
        <span className="text-base font-semibold truncate">
          {title}
          {subtitle ? ` — ${subtitle}` : ""}
        </span>
        <span className="text-[13px] text-text-secondary">
          {typeLabel} · em andamento
          {progressText && (
            <>
              {" · "}
              <span className="font-mono">{progressText}</span>
            </>
          )}
        </span>
      </div>
      {progressPercent !== null && (
        <div className="flex-[0_1_200px] min-w-[140px] flex flex-col gap-1.5">
          <ProgressBar value={progressPercent} />
          <span className="font-mono text-xs text-text-secondary">{progressPercent}%</span>
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={onOpen}>
        Abrir na Biblioteca
      </Button>
    </div>
  );
}
