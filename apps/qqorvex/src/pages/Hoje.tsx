import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, CrystalCore, ProgressBar, SkeletonList } from "@qqorvex/ui";
import { useAuth, useProfile } from "@qqorvex/auth";
import { useHojeSummary } from "@qqorvex/module-hoje";
import type { HojeItem, HojePriority } from "@qqorvex/module-hoje";
import { useEnsureDailyNote } from "@qqorvex/module-segundo-cerebro";
import { formatXp, LevelProgressText, TitleBadge, useGamificationStats, useUnlockedBadges } from "@qqorvex/module-gamificacao";
import { endOfDay, startOfDay, useEventsInRange, type CalendarEvent } from "@qqorvex/module-agenda";
import { useHabits, useHabitLogs, useLogHabit, type Habit } from "@qqorvex/module-metas-habitos";
import { computeProgressPercent, LIBRARY_ITEM_TYPE_LABELS, useLibraryItems, type LibraryItem } from "@qqorvex/module-biblioteca";
import { computeBalances, useTransactions } from "@qqorvex/module-financas";
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

const PRIORITY_ORDER: Record<HojePriority, number> = {
  urgente: 0,
  importante: 1,
  atencao: 2,
  informativo: 3,
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

const SOURCE_PATH: Record<string, string> = {
  tarefas: "/tarefas",
  agenda: "/agenda",
  "metas-habitos": "/metas-habitos",
  estudos: "/estudos",
  "segundo-cerebro": "/segundo-cerebro",
  biblioteca: "/biblioteca",
  documentos: "/documentos",
  financas: "/financas",
  "vida-pessoal": "/vida-pessoal",
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
const MAX_TODAY_PREVIEWS = 3;

const QUICK_ACTIONS: ReadonlyArray<readonly [label: string, path: string]> = [
  ["Tarefa", "/tarefas"],
  ["Evento", "/agenda"],
  ["Hábito", "/metas-habitos"],
  ["Estudo", "/estudos"],
];

const CURRENCY_FORMAT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const LIBRARY_STATUS_LABEL: Record<LibraryItem["status"], string> = {
  quero_consumir: "Na sua lista",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
  abandonado: "Encerrado",
};

function useLiveNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function LibraryCover({ item, className = "" }: { item: LibraryItem; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface-3 ${className}`}>
      {item.cover_url ? (
        <img src={item.cover_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-3 via-surface-3 to-surface-1 p-2 text-center">
          <span className="font-display text-xs font-semibold leading-tight text-text-secondary">{LIBRARY_ITEM_TYPE_LABELS[item.item_type]}</span>
        </div>
      )}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/[0.04]" />
    </div>
  );
}

function libraryProgressDetail(item: LibraryItem): string | null {
  if (item.progress_mode !== "numerico" || item.progress_current === null) return null;
  const unit = item.progress_unit?.trim();
  const current = item.progress_current.toLocaleString("pt-BR");
  const total = item.progress_total?.toLocaleString("pt-BR");
  return `${unit ? `${unit} ` : ""}${current}${total ? ` de ${total}` : ""}`;
}

function LibraryFeature({ item }: { item: LibraryItem }) {
  const progress = computeProgressPercent(item);
  const detail = libraryProgressDetail(item);
  const isInProgress = item.status === "em_andamento" && progress !== null;

  return (
    <div className="relative isolate min-w-0 overflow-hidden rounded-[22px] border border-border/85 bg-surface-2 shadow-[0_24px_60px_-46px_rgba(0,0,0,0.95)]">
      {item.cover_url ? (
        <img src={item.cover_url} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[linear-gradient(125deg,var(--color-surface-2),var(--color-surface-1)_72%,color-mix(in_srgb,var(--color-vex-cyan)_7%,var(--color-surface-1)))]">
          <span className="absolute -right-[10%] -top-[40%] h-[170%] w-[48%] rotate-[12deg] rounded-[45%] border border-white/[0.035]" />
          <span className="absolute bottom-8 right-[9%] font-display text-[clamp(3rem,9vw,8rem)] font-semibold uppercase tracking-[0.16em] text-white/[0.025]">{LIBRARY_ITEM_TYPE_LABELS[item.item_type]}</span>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-surface-2)_0%,color-mix(in_srgb,var(--color-surface-2)_95%,transparent)_42%,color-mix(in_srgb,var(--color-surface-2)_58%,transparent)_78%,color-mix(in_srgb,var(--color-surface-2)_18%,transparent)_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_44%,color-mix(in_srgb,var(--color-surface-1)_88%,transparent)_100%)]" />

      <div className="relative flex min-h-[360px] min-w-0 flex-col justify-between gap-8 p-5 sm:min-h-[380px] sm:p-7 lg:min-h-[400px] lg:p-8">
        <div className="min-w-0 max-w-[620px]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-text-secondary sm:text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-vex-gold-bright"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-vex-gold-bright" />Continuar de onde parou</span>
            <span aria-hidden="true" className="text-text-muted">·</span>
            <span>{LIBRARY_ITEM_TYPE_LABELS[item.item_type]}</span>
          </div>
          <h4 className="mt-4 max-w-[18ch] break-words font-display text-[clamp(1.8rem,4vw,3.35rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-text-primary">{item.title}</h4>
          {item.subtitle && <p className="mt-3 max-w-[48ch] line-clamp-2 text-sm leading-relaxed text-text-secondary sm:text-base">{item.subtitle}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-text-secondary sm:text-xs">
            <span>{LIBRARY_STATUS_LABEL[item.status]}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-vex-gold-bright/70" />
            <span>Atualizado em {shortDate(new Date(item.updated_at))}</span>
          </div>
          <Link to="/biblioteca" className="mt-6 inline-flex min-h-9 items-center gap-2 rounded-full bg-vex-gold-bright px-4 py-2 text-xs font-semibold text-surface-1 transition-colors hover:bg-vex-gold-bright/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vex-gold-bright">
            Ver na biblioteca
            <span aria-hidden="true" className="inline-flex h-2.5 w-2.5 rounded-full bg-surface-1/75 ring-2 ring-surface-1/10" />
          </Link>
        </div>

        {isInProgress && (
          <div className="w-full max-w-[430px]">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-text-secondary sm:text-xs">
              {detail && <span>{detail}</span>}
              <span className="ml-auto font-mono text-vex-gold-bright">{progress}% concluído</span>
            </div>
            <ProgressBar value={progress} tone="gold" height={4} />
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryShelfItem({ item, isSelected, onSelect }: { item: LibraryItem; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${item.title}${isSelected ? ", selecionado" : ", mostrar detalhes"}`}
      className={`group relative flex h-[82px] w-[58px] shrink-0 items-center justify-center rounded-lg p-1 text-center transition-[transform,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vex-gold-bright sm:h-[94px] sm:w-[66px] ${isSelected ? "-translate-y-1 text-text-primary" : "text-text-muted opacity-65 hover:-translate-y-0.5 hover:opacity-100"}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-2 bottom-0 h-px transition-colors ${isSelected ? "bg-vex-gold-bright" : "bg-transparent"}`} />
      <LibraryCover item={item} className={`aspect-[3/4] w-11 rounded-md shadow-sm transition duration-200 sm:w-12 ${isSelected ? "ring-1 ring-vex-gold-bright/90" : "ring-1 ring-white/[0.07]"}`} />
    </button>
  );
}

function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "·";
}

function compactName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ") || "Você";
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
  const { profile, isLoading: profileLoading } = useProfile(supabase, userId);
  const { progress, title: gamificationTitle } = useGamificationStats(supabase, userId);
  const { badges } = useUnlockedBadges(supabase, userId, profile?.role === "dono");
  const { transactions, isLoading: financesLoading, error: financesError } = useTransactions(supabase);
  const balances = computeBalances(transactions);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryItem["item_type"] | "todos">("todos");

  const now = useLiveNow();
  const minutesToday = now.getHours() * 60 + now.getMinutes();
  const dayProgress = Math.round((minutesToday / (24 * 60)) * 100);
  const currentTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const currentPeriod = now.getHours() < 12 ? "Manhã" : now.getHours() < 18 ? "Tarde" : "Noite";
  const { events: todayEvents, isLoading: eventsLoading } = useEventsInRange(supabase, startOfDay(now), endOfDay(now));
  const { habits } = useHabits(supabase);
  const { items: libraryItems, isLoading: libraryLoading } = useLibraryItems(supabase);

  const activeHabits = habits.filter((habit) => habit.status === "ativo").slice(0, MAX_HABITS);
  const sortedEvents = [...todayEvents].sort((a, b) => {
    if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1;
    return a.start_at.localeCompare(b.start_at);
  });
  const recentItems = libraryItems;
  // A list is already ordered by updated_at; retain selection while the item remains available.
  const libraryTypes = Array.from(new Set(recentItems.map((item) => item.item_type)));
  const visibleLibraryItems = libraryFilter === "todos" ? recentItems : recentItems.filter((item) => item.item_type === libraryFilter);
  const featuredItem = visibleLibraryItems.find((item) => item.id === selectedItemId) ?? visibleLibraryItems[0] ?? null;
  const rawName = profile?.display_name || profile?.full_name || profile?.username || session!.user.email?.split("@")[0] || "Você";
  const shownName = compactName(rawName).toLocaleUpperCase("pt-BR");
  const highlightedBadgeKeys = profile?.role === "dono"
    ? ["dono", ...(profile.selected_badge_keys ?? []).filter((key) => key !== "dono").slice(0, 2)]
    : profile?.selected_badge_keys ?? [];
  const selectedBadges = badges
    .filter((badge) => badge.isUnlockedForUser && highlightedBadgeKeys.includes(badge.key))
    .slice(0, 3);
  const selectedTitle = profile?.selected_title || gamificationTitle || "Iniciante";
  const prioritizedItems = [...summary.items].sort((a, b) => {
    const priorityA = a.priority ? PRIORITY_ORDER[a.priority] : 4;
    const priorityB = b.priority ? PRIORITY_ORDER[b.priority] : 4;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
  const focusItem = prioritizedItems.find((item) => item.priority === "urgente" || item.priority === "importante");
  const suggestedItem = focusItem ?? prioritizedItems[0];
  const focusPath = suggestedItem ? SOURCE_PATH[suggestedItem.source] ?? "/" : "/tarefas";
  const vexTip = focusItem
    ? `“${focusItem.title}” merece atenção primeiro — ela já aparece como ${PRIORITY_LABEL[focusItem.priority!]!.toLowerCase()} no seu dia.`
    : suggestedItem
      ? `“${suggestedItem.title}” é o próximo passo sugerido para movimentar seu dia.`
    : sortedEvents.length > 0
      ? `Você tem ${sortedEvents.length} ${sortedEvents.length === 1 ? "compromisso" : "compromissos"} hoje. Reserve um respiro entre eles.`
      : summary.items.length > 0
        ? "Escolha um item para ser seu foco de agora. Um passo pequeno já movimenta o dia."
        : "Seu dia está mais leve por aqui. Que tal escolher uma intenção para começar?";

  async function handleOpenDailyNote() {
    const page = await ensureDailyNote.mutateAsync(new Date());
    navigate(`/segundo-cerebro/${page.id}`);
  }

  return (
    <div className="qv-page grid min-w-0 grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-[minmax(230px,270px)_minmax(0,1fr)] lg:items-start">
      <aside
        className="relative min-w-0 overflow-hidden border-b border-border px-1 py-5 sm:px-3 lg:rounded-[26px] lg:border lg:border-border/90 lg:bg-surface-1/90 lg:px-5 lg:py-5 lg:shadow-[0_18px_45px_-36px_rgba(0,0,0,.95)]"
        style={{
          backgroundImage: "linear-gradient(145deg, color-mix(in srgb, var(--color-vex-cyan) 6%, transparent), transparent 32%), linear-gradient(320deg, color-mix(in srgb, var(--color-vex-gold-bright) 4%, transparent), transparent 38%)",
        }}
      >
          <div className="relative rounded-2xl border border-border/75 bg-surface-2/55 p-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-vex-cyan-dark/80 bg-surface-3">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-text-primary">
                    {initials(shownName)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <span className="qv-eyebrow text-text-muted">Seu perfil</span>
                <h2 className="mt-1 truncate font-display text-[17px] font-semibold uppercase leading-none tracking-[0.01em] text-text-primary">{profileLoading ? "CARREGANDO" : shownName}</h2>
                <span className="mt-1 block truncate text-xs text-text-muted">{profile?.username ? `@${profile.username}` : "@usuario"}</span>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
              <TitleBadge title={selectedTitle} size="sm" className="min-w-0 max-w-[180px]" />
              {selectedBadges.length > 0 && (
                <div className="flex shrink-0 -space-x-1.5" aria-label="Badges em destaque">
                  {selectedBadges.map((badge) => (
                    <span key={badge.key} title={badge.label} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-3">
                      <img src={badge.imageSrc} alt={badge.label} className="h-6 w-6 object-contain" />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Link to="/perfil" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-vex-cyan-bright transition-colors hover:text-text-primary hover:underline">
              Ver perfil
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {progress && (
            <div className="mt-4 rounded-2xl border border-border/75 bg-surface-2/45 p-3.5">
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <span className="qv-eyebrow text-text-muted">Sua jornada</span>
                  <span className="mt-1 block font-display text-base font-semibold text-text-primary">Nível {progress.level}</span>
                </div>
                <span className="shrink-0 font-mono text-xs text-vex-gold-bright">{formatXp(progress.xp)} XP</span>
              </div>
              <ProgressBar value={progress.progressPercent} tone="gold" height={4} />
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-text-muted">
                <span className="min-w-0 truncate"><LevelProgressText progress={progress} /></span>
                <span className="shrink-0 font-mono text-text-secondary">{progress.progressPercent}%</span>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-border/75 bg-surface-2/45 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="qv-eyebrow text-vex-gold-bright">Compasso do dia</span>
              <span className="font-mono text-sm font-semibold text-text-primary">{currentTime}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.1em] text-text-muted">Agora é</span>
                <span className="mt-1 block font-display text-lg font-semibold text-text-primary">{currentPeriod}</span>
              </div>
              <span className="font-mono text-xs text-vex-gold-bright">{dayProgress}% do dia</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full min-w-[4px] rounded-full bg-gradient-to-r from-vex-cyan to-vex-gold-bright"
                style={{ width: `${Math.max(2, dayProgress)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] normal-case tracking-[0.1em] text-text-muted">
              <span>00h</span>
              <span>00h</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/75 bg-surface-2/45 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="qv-eyebrow text-text-secondary">Resumo de hoje</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-vex-cyan-bright">Ao vivo</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-border/65 bg-surface-1/45">
              <Link to="/tarefas" className="group flex items-center justify-between gap-3 border-b border-border/65 px-2.5 py-2.5 text-[13px] transition-colors hover:bg-surface-3/45 hover:text-vex-cyan-bright">
                <span className="flex min-w-0 items-center gap-2.5 text-text-secondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-vex-cyan/10"><span className="h-1.5 w-1.5 rounded-full bg-vex-cyan" aria-hidden="true" /></span>Focos ativos</span>
                <span className="flex items-center gap-2 font-mono text-text-primary">{summary.items.length}<span className="text-xs text-text-muted transition-colors group-hover:text-vex-cyan-bright" aria-hidden="true">→</span></span>
              </Link>
              <Link to="/agenda" className="group flex items-center justify-between gap-3 border-b border-border/65 px-2.5 py-2.5 text-[13px] transition-colors hover:bg-surface-3/45 hover:text-vex-cyan-bright">
                <span className="flex min-w-0 items-center gap-2.5 text-text-secondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-category-green/10"><span className="h-1.5 w-1.5 rounded-full bg-category-green" aria-hidden="true" /></span>Compromissos</span>
                <span className="flex items-center gap-2 font-mono text-text-primary">{sortedEvents.length}<span className="text-xs text-text-muted transition-colors group-hover:text-vex-cyan-bright" aria-hidden="true">→</span></span>
              </Link>
              <Link to="/biblioteca" className="group flex items-center justify-between gap-3 px-2.5 py-2.5 text-[13px] transition-colors hover:bg-surface-3/45 hover:text-vex-cyan-bright">
                <span className="flex min-w-0 items-center gap-2.5 text-text-secondary"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-vex-gold-bright/10"><span className="h-1.5 w-1.5 rounded-full bg-vex-gold-bright" aria-hidden="true" /></span>Na biblioteca</span>
                <span className="flex items-center gap-2 font-mono text-text-primary">{libraryItems.length}<span className="text-xs text-text-muted transition-colors group-hover:text-vex-cyan-bright" aria-hidden="true">→</span></span>
              </Link>
            </div>
          </div>

      </aside>

        <div
          className="relative min-w-0 overflow-hidden rounded-[26px] border border-border bg-surface-1/20 shadow-[0_24px_70px_-48px_var(--color-vex-cyan)]"
          style={{
            backgroundImage: "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-vex-cyan) 7%, transparent), transparent 30%), linear-gradient(180deg, color-mix(in srgb, var(--color-vex-obsidian) 58%, transparent), transparent 38%)",
          }}
        >
          <header className="relative flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
            <div className="min-w-0">
              <span className="qv-eyebrow text-vex-gold-bright">Ritual de hoje</span>
              <h2 className="mt-1 font-display text-[clamp(1.45rem,2.4vw,2rem)] font-semibold leading-tight tracking-[-0.025em] text-text-primary">Seu dia em perspectiva</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs uppercase tracking-[0.1em] text-text-muted sm:inline">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
              <Button type="button" variant="quiet" size="sm" onClick={handleOpenDailyNote} disabled={ensureDailyNote.isPending}>
                Nota do Dia
              </Button>
            </div>
          </header>

          <section
            className="relative overflow-hidden border-b border-border px-5 py-5 sm:px-7 sm:py-6"
            aria-labelledby="direcao-heading"
            style={{
              backgroundImage: "linear-gradient(105deg, color-mix(in srgb, var(--color-vex-cyan) 8%, transparent), transparent 56%), radial-gradient(circle at 92% 50%, color-mix(in srgb, var(--color-vex-gold-bright) 8%, transparent), transparent 28%)",
            }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border border-vex-gold-bright/15" />
            <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-5 h-20 w-20 rounded-full border border-vex-cyan/15" />
            <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-vex-cyan-dark/70 bg-chip-cyan text-vex-cyan-bright shadow-[0_0_20px_-13px_var(--color-vex-cyan)]">
                  <CrystalCore size="sm" />
                </span>
                <div className="min-w-0">
                  <span id="direcao-heading" className="qv-eyebrow text-vex-cyan-bright">Direção do dia</span>
                  <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-text-secondary">{vexTip}</p>
                </div>
              </div>
              <Link
                to={focusPath}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-vex-cyan-dark/70 bg-chip-cyan px-3 py-1.5 text-[11px] font-semibold text-vex-cyan-bright transition-colors hover:border-vex-cyan hover:bg-vex-cyan/15"
              >
                {suggestedItem ? "Abrir foco" : "Escolher foco"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-7" aria-label="Ações rápidas">
            <span className="qv-eyebrow text-text-muted">Ações rápidas</span>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_ACTIONS.map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  className="rounded-full border border-border bg-surface-1/45 px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-vex-cyan-dark hover:bg-chip-cyan hover:text-vex-cyan-bright"
                >
                  + {label}
                </Link>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(250px,0.82fr)_minmax(0,1.18fr)]">
            <section className="min-w-0 border-b border-border px-5 py-5 sm:px-7 lg:border-b-0 lg:border-r" aria-labelledby="financas-heading">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <span className="qv-eyebrow text-vex-gold-bright">Movimento</span>
                  <h3 id="financas-heading" className="mt-1 font-display text-base font-semibold text-text-primary">Finanças</h3>
                </div>
                <Link to="/financas" className="text-xs text-vex-cyan-bright hover:underline">Abrir finanças</Link>
              </div>
              {financesLoading ? (
                <SkeletonList rows={3} />
              ) : financesError ? (
                <p className="text-[13px] text-text-muted">Não foi possível carregar seu resumo financeiro.</p>
              ) : (
                <>
                  <span className="text-xs text-text-muted">Saldo realizado</span>
                  <p className="mt-1 font-display text-[clamp(1.65rem,3vw,2.25rem)] font-semibold leading-tight tracking-tight text-text-primary">
                    {CURRENCY_FORMAT.format(balances.saldoAtual)}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3.5">
                    <span className="text-xs text-text-secondary">Projeção prevista</span>
                    <span className="font-mono text-sm font-semibold text-vex-cyan-bright">{CURRENCY_FORMAT.format(balances.saldoProjetado)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 divide-x divide-border border-t border-border pt-3.5">
                    <div className="pr-3">
                      <span className="block text-[11px] text-text-muted">A entrar</span>
                      <span className="mt-1 block truncate font-mono text-[13px] text-success">{CURRENCY_FORMAT.format(balances.entradasFuturas)}</span>
                    </div>
                    <div className="pl-3">
                      <span className="block text-[11px] text-text-muted">A sair</span>
                      <span className="mt-1 block truncate font-mono text-[13px] text-text-secondary">{CURRENCY_FORMAT.format(balances.saidasFuturas)}</span>
                    </div>
                  </div>
                  {transactions.length === 0 && (
                    <p className="mt-4 text-xs leading-relaxed text-text-muted">
                      Seu resumo ganha movimento quando você registrar lançamentos.{" "}
                      <Link to="/financas" className="text-vex-cyan-bright hover:underline">Registrar agora</Link>
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="min-w-0 px-5 py-5 sm:px-7" aria-labelledby="hoje-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <span className="qv-eyebrow text-vex-cyan-bright">Ritmo</span>
                  <h3 id="hoje-heading" className="mt-1 font-display text-base font-semibold text-text-primary">Agenda de hoje</h3>
                </div>
                <Link to="/agenda" className="shrink-0 text-xs text-vex-cyan-bright hover:underline">Ver agenda · {shortDate(now)}</Link>
              </div>
              {eventsLoading ? (
                <SkeletonList rows={2} />
              ) : sortedEvents.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface-1/35 px-3.5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-vex-cyan-dark/70 text-vex-cyan-bright" aria-hidden="true">◷</span>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] text-text-secondary">Agenda livre por enquanto.</p>
                    <Link to="/agenda" className="mt-1 block text-xs text-vex-cyan-bright hover:underline">Criar um evento</Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {sortedEvents.slice(0, MAX_TODAY_PREVIEWS).map((event) => (
                    <div key={event.id} className="py-2.5 first:pt-0 last:pb-0"><TodayEventRow event={event} /></div>
                  ))}
                  {sortedEvents.length > MAX_TODAY_PREVIEWS && <span className="pt-2.5 text-xs text-text-muted">+{sortedEvents.length - MAX_TODAY_PREVIEWS} na agenda</span>}
                </div>
              )}

              <div className="mt-5 border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">Focos do dia</h3>
                    <Link to="/tarefas" className="text-xs text-vex-cyan-bright hover:underline">Ver todos</Link>
                </div>
                {isLoading ? (
                  <SkeletonList rows={2} />
                  ) : summary.items.length === 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] text-text-muted">Tudo em dia por enquanto. Um bom momento para respirar.</p>
                      <Link to="/tarefas" className="text-xs text-vex-cyan-bright hover:underline">Planejar próxima tarefa</Link>
                    </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {prioritizedItems.slice(0, MAX_TODAY_PREVIEWS).map((item) => <HojeRow key={`${item.source}-${item.id}`} item={item} compact />)}
                  </ul>
                )}
                {!isLoading && summary.items.length > MAX_TODAY_PREVIEWS && (
                  <span className="mt-2 block text-xs text-text-muted">+{summary.items.length - MAX_TODAY_PREVIEWS} itens em outras áreas</span>
                )}
              </div>

              {activeHabits.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">Hábitos em movimento</h3>
                    <Link to="/metas-habitos" className="text-xs text-vex-cyan-bright hover:underline">Ver todos</Link>
                  </div>
                  <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                    {activeHabits.slice(0, 4).map((habit, index) => (
                      <HabitProgressRow key={habit.id} habit={habit} color={HABIT_COLORS[index % HABIT_COLORS.length]!} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

        </div>

      <section
            className="relative min-w-0 overflow-hidden rounded-[26px] border border-border bg-surface-1/20 px-5 py-6 shadow-[0_24px_70px_-52px_rgba(0,0,0,0.95)] sm:px-7 sm:py-7 lg:col-span-2"
            aria-labelledby="biblioteca-heading"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h3 id="biblioteca-heading" className="font-display text-lg font-semibold text-text-primary">Biblioteca</h3>
              </div>
              <div className="flex items-center justify-end">
                <Link to="/biblioteca" className="inline-flex items-center text-xs text-vex-cyan-bright transition-colors hover:text-vex-gold-bright">
                  Abrir biblioteca
                  <span aria-hidden="true" className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-vex-cyan-bright align-middle shadow-[0_0_10px_-2px_var(--color-vex-cyan-bright)]" />
                </Link>
              </div>
            </div>

            {!libraryLoading && libraryTypes.length > 1 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar biblioteca por tipo">
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryFilter === "todos"}
                  onClick={() => { setLibraryFilter("todos"); setSelectedItemId(null); }}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vex-gold-bright ${libraryFilter === "todos" ? "bg-chip-gold text-vex-gold-bright" : "text-text-muted hover:bg-surface-1/55 hover:text-text-secondary"}`}
                >
                  Todos
                </button>
                {libraryTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={libraryFilter === type}
                    onClick={() => { setLibraryFilter(type); setSelectedItemId(null); }}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vex-gold-bright ${libraryFilter === type ? "bg-chip-gold text-vex-gold-bright" : "text-text-muted hover:bg-surface-1/55 hover:text-text-secondary"}`}
                  >
                    {LIBRARY_ITEM_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}

            {libraryLoading ? (
              <SkeletonList rows={2} />
            ) : recentItems.length === 0 ? (
              <p className="py-2 text-sm text-text-secondary">
                Sua biblioteca começa com uma ideia, um livro ou algo que queira acompanhar.{" "}
                <Link to="/biblioteca" className="text-vex-cyan-bright transition-colors hover:text-vex-gold-bright">Adicionar o primeiro item</Link>
              </p>
            ) : (
              <div className="relative w-full">
                {featuredItem && (
                  <>
                    <div key={featuredItem.id} className="min-w-0 animate-page-in">
                      <LibraryFeature item={featuredItem} />
                    </div>
                    {visibleLibraryItems.length > 1 && (
                      <div className="absolute bottom-4 right-4 z-10 max-w-[calc(100%-2rem)] sm:bottom-5 sm:right-5" role="group" aria-label="Escolher item da biblioteca">
                        <div className="grid w-fit max-w-full grid-cols-3 items-end justify-items-end gap-x-1.5 gap-y-0.5 border-b border-white/[0.18] pb-2 sm:grid-cols-6 sm:gap-x-2">
                          {visibleLibraryItems.map((item) => (
                            <LibraryShelfItem key={item.id} item={item} isSelected={featuredItem.id === item.id} onSelect={() => setSelectedItemId(item.id)} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
      </section>
    </div>
  );
}

function HojeRow({ item, compact = false }: { item: HojeItem; compact?: boolean }) {
  const meta = itemMeta(item.time);
  const sourcePath = SOURCE_PATH[item.source] ?? "/";
  return (
    <li className={`qv-row flex min-w-0 items-center gap-2.5 ${compact ? "py-2" : "gap-3.5 px-5 py-3.5 hover:bg-chip-neutral transition-colors"}`}>
      <Link to={sourcePath} className="group flex min-w-0 flex-1 items-center gap-2.5" aria-label={`Abrir ${item.title} em ${SOURCE_LABEL[item.source] ?? item.source}`}>
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[5px] border-[1.75px] border-border text-[10px] text-transparent transition-colors group-hover:border-vex-cyan-dark group-hover:text-vex-cyan-bright" aria-hidden>→</span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[13px] font-medium text-text-primary">{item.title}</span>
          {meta && (
            <span className="truncate text-[11px] text-text-muted">
              {meta.label}
              {meta.value && <span className="font-mono"> {meta.value}</span>}
            </span>
          )}
        </div>
        <span className="qv-pill qv-pill-module hidden md:inline-flex">{SOURCE_LABEL[item.source] ?? item.source}</span>
        {item.priority && <span className={`qv-pill ${PRIORITY_PILL[item.priority]}`}>{PRIORITY_LABEL[item.priority]}</span>}
        <span className="shrink-0 text-xs text-text-muted transition-colors group-hover:text-vex-cyan-bright" aria-hidden>›</span>
      </Link>
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
  const logHabit = useLogHabit(supabase, habit.id);
  const today = localIsoDate(new Date());
  const todayLog = logs.find((log) => log.log_date === today);
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
      <button
        type="button"
        disabled={logHabit.isPending}
        onClick={() => logHabit.mutate({ logDate: today, state: "concluido" })}
        className={`self-start text-[11px] font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${todayLog?.state === "concluido" ? "text-success" : "text-vex-cyan-bright hover:text-text-primary"}`}
      >
        {todayLog?.state === "concluido" ? "Check-in feito hoje" : "Marcar check-in"}
      </button>
    </div>
  );
}
