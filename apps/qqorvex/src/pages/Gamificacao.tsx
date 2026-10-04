import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRightIcon, CheckCircleIcon, ClockCountdownIcon, LightningIcon, PaletteIcon, SealCheckIcon, TrophyIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import {
  ActionCountersCard,
  BadgesPanel,
  SpecialBadgeArt,
  TitleBadge,
  formatDailyCountdown,
  formatXp,
  getDailyChallenges,
  localDateKey,
  summarizeDailyChallengeHistory,
  useDailyChallengeHistory,
  useDailyChallengeProgress,
  useGamificationStats,
  useUnlockedBadges,
  type BadgeWithStatus,
  type DailyChallengeDefinition,
  type DailyChallengeProgress,
  type GamificationStats,
} from "@qqorvex/module-gamificacao";
import { Button, ButtonLink, Notice, PageContainer, PageHeader, ProgressBar, Segmented, SkeletonBlock, Tabs, cx } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { usePageMeta } from "../app/shell/PageMeta";
import { LEVEL_THEMES, VIP_THEME } from "../app/ThemeContext";

type Tab = "visao" | "conquistas" | "niveis";
const TABS: Tab[] = ["visao", "conquistas", "niveis"];
const MAX_LEVEL = 50;

/** Conquistas: nível e XP, desafios do dia, insígnias permanentes e a trilha de 50 níveis. */
export function GamificacaoPage() {
  const { client, session } = useAuth();
  const { profile, isOwner } = useAccount();
  const userId = session!.user.id;
  usePageMeta({ title: "Conquistas" });
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("aba") as Tab) ? (params.get("aba") as Tab) : "visao";
  const setTab = (next: Tab) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === "visao") copy.delete("aba");
        else copy.set("aba", next);
        return copy;
      },
      { replace: true },
    );

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const { stats, progress, title, isLoading, refetch } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading, error: badgesError } = useUnlockedBadges(client, userId, isOwner);
  const dateKey = localDateKey(now);
  const { progressByKey, isLoading: challengesLoading, error: challengesError } = useDailyChallengeProgress(client, userId, dateKey);

  if (isLoading && !progress) {
    return (
      <PageContainer>
        <PageHeader title="Conquistas" description="Carregando sua jornada…" />
        <SkeletonBlock className="h-44 w-full rounded-xl" />
        <SkeletonBlock className="h-56 w-full rounded-xl" />
      </PageContainer>
    );
  }
  if (!progress || !stats) {
    return (
      <PageContainer>
        <PageHeader title="Conquistas" />
        <Notice title="Sua jornada não carregou" actions={<Button size="sm" variant="secondary" onClick={() => void refetch()}>Tentar de novo</Button>}>
          Não foi possível buscar seu nível e XP agora. Seu progresso continua salvo.
        </Notice>
      </PageContainer>
    );
  }

  const unlocked = badges.filter((badge) => badge.isUnlockedForUser).length;
  const challenges = getDailyChallenges(dateKey);
  const doneToday = challenges.filter((challenge) => Boolean(progressByKey.get(challenge.key)?.completed_at)).length;

  return (
    <PageContainer>
      <PageHeader title="Conquistas" description={`Nível ${progress.level} · ${formatXp(progress.xp)} XP · ${badgesLoading ? "…" : `${unlocked} de ${badges.length}`} insígnias`}>
        <Tabs<Tab>
          label="Seções"
          value={tab}
          onChange={setTab}
          options={[
            { value: "visao", label: "Visão geral" },
            { value: "conquistas", label: "Insígnias", count: badgesLoading ? null : unlocked },
            { value: "niveis", label: "Níveis" },
          ]}
        />
      </PageHeader>

      {tab === "visao" && (
        <div className="flex flex-col gap-6">
          <LevelHero level={progress.level} xp={progress.xp} percent={progress.progressPercent} xpForCurrent={progress.xpForCurrentLevel} xpForNext={progress.xpForNextLevel} title={profile?.selected_title || title || "Iniciante"} stats={stats} unlocked={unlocked} totalBadges={badges.length} doneToday={doneToday} />

          <section className="flex flex-col gap-3" aria-labelledby="daily-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="daily-title" className="text-[15px] font-semibold text-fg">
                  Desafios de hoje <span className="ml-1 text-xs font-normal tabular-nums text-fg-3">{challengesLoading ? "" : `${doneToday}/${challenges.length}`}</span>
                </h2>
                <p className="text-xs text-fg-3">Quatro por dia, do fácil ao difícil. Recompensa em XP.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-fg-2">
                <ClockCountdownIcon size={14} className="text-fg-3" />
                Novos em <time className="font-medium tabular-nums text-fg">{formatDailyCountdown(now)}</time>
              </span>
            </div>
            {challengesError && <Notice compact>Os registros de hoje não puderam ser confirmados.</Notice>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.key} challenge={challenge} progress={progressByKey.get(challenge.key)} available={!challengesError && !challengesLoading} />
              ))}
            </div>
            <ChallengeHistory userId={userId} dateKey={dateKey} />
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <NextBadges badges={badges} stats={stats} loading={badgesLoading} onSeeAll={() => setTab("conquistas")} />
            <ActionCountersCard stats={stats} />
          </div>
        </div>
      )}

      {tab === "conquistas" && <BadgesTab badges={badges} stats={stats} loading={badgesLoading} error={Boolean(badgesError)} />}

      {tab === "niveis" && <LevelsTab progress={progress} title={profile?.selected_title || title || "Iniciante"} />}
    </PageContainer>
  );
}

function LevelHero({ level, xp, percent, xpForCurrent, xpForNext, title, stats, unlocked, totalBadges, doneToday }: { level: number; xp: number; percent: number; xpForCurrent: number; xpForNext: number; title: string; stats: GamificationStats; unlocked: number; totalBadges: number; doneToday: number }) {
  const remaining = Math.max(0, xpForNext - xp);
  const actions = stats.tasks_completed + stats.habit_or_goal_checkins + stats.quizzes_completed + stats.library_items_completed;
  const metrics = [
    { label: "XP total", value: formatXp(xp) },
    { label: "Ações registradas", value: formatXp(actions) },
    { label: "Desafios hoje", value: `${doneToday}/4` },
    { label: "Insígnias", value: `${unlocked}/${totalBadges}` },
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-[linear-gradient(135deg,var(--q-gold-soft),var(--q-surface)_55%)]" aria-label="Seu nível">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <LevelBadge level={Math.min(level, MAX_LEVEL)} alt={`Insígnia do nível ${level}`} className="h-24 w-24 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[34px] font-semibold leading-none tracking-[-0.02em] text-fg">Nível {level}</h2>
            <TitleBadge title={title} />
          </div>
          <div className="mt-4 flex max-w-xl flex-col gap-1.5">
            <ProgressBar value={percent} height={8} label="Progresso para o próximo nível" />
            <div className="flex justify-between text-xs text-fg-3">
              <span className="tabular-nums">
                {formatXp(xp - xpForCurrent)} / {formatXp(xpForNext - xpForCurrent)} XP neste nível
              </span>
              <span className="tabular-nums">{level >= MAX_LEVEL ? "Todas as insígnias de nível conquistadas" : `faltam ${formatXp(remaining)} XP`}</span>
            </div>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-line-soft sm:grid-cols-4">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={cx("px-5 py-3.5 sm:px-6", index % 2 === 1 && "border-l border-line-soft", index >= 2 && "border-t border-line-soft sm:border-t-0", index === 2 && "sm:border-l")}>
            <dt className="text-xs text-fg-3">{metric.label}</dt>
            <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-fg">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const DIFFICULTY: Record<DailyChallengeDefinition["difficulty"], string> = {
  Fácil: "bg-success-soft text-success",
  Médio: "bg-warning-soft text-warning",
  Difícil: "bg-danger-soft text-danger",
  Especial: "bg-ai-soft text-ai-fg",
};

function ChallengeCard({ challenge, progress, available }: { challenge: DailyChallengeDefinition; progress?: DailyChallengeProgress; available: boolean }) {
  const current = Math.min(progress?.progress ?? 0, challenge.target);
  const done = available && Boolean(progress?.completed_at);
  return (
    <article className={cx("flex min-w-0 flex-col gap-3 rounded-xl border p-4", done ? "border-success/35 bg-success-soft" : "border-line bg-surface")}>
      <div className="flex items-center justify-between gap-2">
        <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", DIFFICULTY[challenge.difficulty] ?? "bg-hover text-fg-2")}>{challenge.difficulty}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-gold-fg">
          <LightningIcon size={13} weight="fill" />+{challenge.rewardXp} XP
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold leading-snug text-fg">{challenge.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-fg-3">{challenge.description}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className={done ? "font-medium text-success" : "tabular-nums text-fg-2"}>{!available ? "—" : done ? "Concluído" : `${current} de ${challenge.target} ${challenge.unit}`}</span>
          {!done && (
            <Link to={challenge.href} className="inline-flex items-center gap-1 font-medium text-gold-fg hover:underline">
              {challenge.actionLabel} <ArrowRightIcon size={12} />
            </Link>
          )}
          {done && <CheckCircleIcon size={16} weight="fill" className="text-success" />}
        </div>
        <ProgressBar value={available ? (current / challenge.target) * 100 : 0} height={4} tone={done ? "success" : "gold"} />
      </div>
    </article>
  );
}

function ChallengeHistory({ userId, dateKey }: { userId: string; dateKey: string }) {
  const { client } = useAuth();
  const [open, setOpen] = useState(false);
  const { progress, isLoading, error } = useDailyChallengeHistory(client, userId, dateKey, open);
  const days = summarizeDailyChallengeHistory(dateKey, progress);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="self-start text-xs font-medium text-fg-3 hover:text-fg">
        {open ? "Ocultar os últimos 7 dias" : "Ver os últimos 7 dias"}
      </button>
      {open &&
        (isLoading ? (
          <SkeletonBlock className="h-24 w-full rounded-xl" />
        ) : error ? (
          <Notice compact>Não foi possível carregar o histórico.</Notice>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => {
              const date = new Date(`${day.dateKey}T12:00:00`);
              const complete = day.completedCount === day.totalCount;
              return (
                <div key={day.dateKey} className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface px-3 py-2.5" title={day.completedTitles.join(" · ") || "Nenhum desafio concluído"}>
                  <span className="text-xs font-medium capitalize text-fg-2">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" }).format(date).replace(".", "")}</span>
                  <ProgressBar value={(day.completedCount / day.totalCount) * 100} height={4} tone={complete ? "success" : "gold"} />
                  <span className="text-[11px] tabular-nums text-fg-3">
                    {day.completedCount}/{day.totalCount} · +{day.rewardXp} XP
                  </span>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

function badgePercent(badge: BadgeWithStatus, stats: GamificationStats): number {
  if (badge.isUnlockedForUser) return 100;
  if (!badge.counterField || !badge.target) return 0;
  return Math.min(100, Math.round((Number(stats[badge.counterField] ?? 0) / badge.target) * 100));
}

function NextBadges({ badges, stats, loading, onSeeAll }: { badges: BadgeWithStatus[]; stats: GamificationStats; loading: boolean; onSeeAll: () => void }) {
  const next = badges
    .filter((badge) => !badge.isUnlockedForUser && badge.counterField && badge.target)
    .map((badge) => ({ badge, percent: badgePercent(badge, stats) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-[14.5px] font-semibold text-fg">Mais perto de conquistar</h3>
        <Button size="xs" variant="ghost" onClick={onSeeAll}>
          Ver todas
        </Button>
      </div>
      {loading ? (
        <SkeletonBlock className="h-32 w-full rounded-lg" />
      ) : next.length === 0 ? (
        <p className="flex items-center gap-2 py-3 text-[13px] text-fg-3">
          <SealCheckIcon size={16} className="text-success" /> Você conquistou todas as insígnias com meta.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {next.map(({ badge, percent }) => {
            const current = Math.min(Number(stats[badge.counterField!] ?? 0), badge.target!);
            return (
              <li key={badge.key} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-fg">
                  <TrophyIcon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13.5px] font-medium text-fg">{badge.label}</span>
                    <span className="shrink-0 text-xs tabular-nums text-fg-3">
                      {current}/{badge.target}
                    </span>
                  </div>
                  <ProgressBar value={percent} height={4} className="mt-1.5" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type BadgeFilter = "todas" | "conquistadas" | "bloqueadas";

function BadgesTab({ badges, stats, loading, error }: { badges: BadgeWithStatus[]; stats: GamificationStats; loading: boolean; error: boolean }) {
  const [filter, setFilter] = useState<BadgeFilter>("todas");
  const unlocked = badges.filter((badge) => badge.isUnlockedForUser);
  const visible = filter === "todas" ? badges : filter === "conquistadas" ? unlocked : badges.filter((badge) => !badge.isUnlockedForUser);
  const milestones = visible.filter((badge) => badge.subscriptionMonths == null);
  const allLoyalty = badges.filter((badge) => badge.subscriptionMonths != null);
  const earnedLoyalty = allLoyalty.filter((badge) => badge.isUnlockedForUser).sort((a, b) => (a.subscriptionMonths ?? 0) - (b.subscriptionMonths ?? 0));
  const currentLoyalty = earnedLoyalty.at(-1) ?? null;
  const nextLoyalty = allLoyalty.find((badge) => (badge.subscriptionMonths ?? 0) > (currentLoyalty?.subscriptionMonths ?? 0)) ?? null;
  const shownLoyalty = filter === "conquistadas" ? (currentLoyalty ? [currentLoyalty] : []) : filter === "bloqueadas" ? (nextLoyalty ? [nextLoyalty] : []) : [currentLoyalty, nextLoyalty].filter((badge): badge is BadgeWithStatus => badge !== null);
  if (error) return <Notice title="Insígnias indisponíveis">Atualize a página para tentar de novo.</Notice>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13px] text-fg-3">Marcos permanentes. Cada insígnia libera um título para a sua vitrine em Configurações › Perfil.</p>
        <Segmented<BadgeFilter>
          label="Filtrar insígnias"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todas", label: "Todas", count: badges.length },
            { value: "conquistadas", label: "Conquistadas", count: unlocked.length },
            { value: "bloqueadas", label: "A conquistar", count: badges.length - unlocked.length },
          ]}
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-[13px] text-fg-3">{filter === "conquistadas" ? "Sua primeira insígnia está a caminho. Veja na Visão geral qual está mais perto." : "Nada por aqui."}</p>
      ) : (
        <>
          {milestones.length > 0 && <BadgesPanel badges={milestones} stats={stats} />}
          {allLoyalty.length > 0 && (
            <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="loyalty-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="loyalty-title" className="text-[14.5px] font-semibold text-fg">Fidelidade Plus</h3>
                <span className="text-xs tabular-nums text-fg-3">{currentLoyalty ? `${currentLoyalty.subscriptionMonths} de 50 meses` : "Seu primeiro selo chega no 1º mês"} · um selo atual por vez</span>
              </div>
              {shownLoyalty.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-fg-3">{filter === "conquistadas" ? "Você ainda não conquistou um selo de fidelidade." : "Você já chegou ao último selo de fidelidade."}</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {shownLoyalty.map((badge) => {
                    const isCurrent = badge.isUnlockedForUser;
                    return (
                      <li key={badge.key} className={cx("flex min-w-0 items-center gap-3 rounded-xl border p-3.5", isCurrent ? "border-gold-line bg-gold-soft" : "border-line-soft bg-canvas/30")}>
                        <SpecialBadgeArt badge={badge} locked={!isCurrent} className="h-14 w-14 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-4">{isCurrent ? "Selo atual" : "Próximo selo"}</p>
                          <p className="mt-0.5 font-medium text-fg">{badge.subscriptionMonths} {badge.subscriptionMonths === 1 ? "mês" : "meses"} de Plus</p>
                          <p className="text-xs text-fg-3">{isCurrent ? "Este selo substitui o anterior." : "Desbloqueia ao completar mais um mês."}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LevelsTab({ progress, title }: { progress: { level: number; xp: number; progressPercent: number; xpForCurrentLevel: number; xpForNextLevel: number }; title: string }) {
  const current = Math.min(progress.level, MAX_LEVEL);
  const remaining = Math.max(0, progress.xpForNextLevel - progress.xp);
  return (
    <div className="flex flex-col gap-5">
      <section className="grid min-w-0 gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <LevelBadge level={current} alt={`Insígnia atual do nível ${progress.level}`} className="h-20 w-20" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div><p className="text-xs text-fg-3">Sua jornada</p><h2 className="font-display text-xl font-semibold text-fg">Nível {progress.level} <span className="text-sm font-normal text-fg-3">· {title}</span></h2></div>
            <span className="text-xs tabular-nums text-fg-3">{formatXp(progress.xp)} XP</span>
          </div>
          <ProgressBar value={progress.level >= MAX_LEVEL ? 100 : progress.progressPercent} height={7} className="mt-3" />
          <p className="mt-1.5 text-xs text-fg-3">{progress.level >= MAX_LEVEL ? "Você alcançou o último nível de insígnia." : `${formatXp(remaining)} XP para o nível ${progress.level + 1}`}</p>
        </div>
        <ButtonLink to="/configuracoes/aparencia" size="sm" variant="secondary" leadingIcon={<PaletteIcon size={15} />}>Escolher cor</ButtonLink>
      </section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-fg">Cores liberadas por marco</h3>
        <p className="text-xs text-fg-3">A cada 10 níveis; a {VIP_THEME.name} acompanha o Plus.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LEVEL_THEMES.map((theme) => {
          const reached = progress.level >= theme.level;
          return (
            <div key={theme.id} className={cx("flex items-center gap-3 rounded-xl border p-3", reached ? "border-line bg-surface" : "border-line-soft")}>
              <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${theme.preview.glow}, ${theme.preview.accent} 55%, ${theme.preview.panel})`, opacity: reached ? 1 : 0.4 }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-fg">{theme.name}</p>
                <p className="text-xs text-fg-3">{reached ? "Liberada" : `Nível ${theme.level}`}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LEVEL_BADGE_PALETTES = [
  { edge: "#70d9e8", core: "#182b35", glint: "#b5f5f4", shadow: "#285363" },
  { edge: "#6dd6c4", core: "#173632", glint: "#c0fff0", shadow: "#2a7467" },
  { edge: "#9b9cff", core: "#242642", glint: "#d9d8ff", shadow: "#51558a" },
  { edge: "#f0b978", core: "#3c2b25", glint: "#ffe0aa", shadow: "#8f5738" },
  { edge: "#f5d77c", core: "#383124", glint: "#fff2bd", shadow: "#a77a35" },
] as const;

function starPoints(points: number, outerRadius: number, innerRadius: number): string {
  return Array.from({ length: points * 2 }, (_, index) => {
    const angle = (index * Math.PI) / points - Math.PI / 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");
}

/** Insígnia de nível: estrela metálica com a cor da faixa (1–10, 11–20…). */
function LevelBadge({ level, alt, className }: { level: number; alt: string; className: string }) {
  const badgeLevel = Math.max(1, Math.min(MAX_LEVEL, level));
  const palette = LEVEL_BADGE_PALETTES[Math.floor((badgeLevel - 1) / 10)]!;
  const id = `level-badge-${badgeLevel}`;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={alt} className={className}>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.glint} />
          <stop offset="0.48" stopColor={palette.edge} />
          <stop offset="1" stopColor={palette.shadow} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor={palette.shadow} />
          <stop offset="1" stopColor={palette.core} />
        </radialGradient>
      </defs>
      <polygon points={starPoints(12, 47, 39)} fill={`url(#${id}-metal)`} stroke={palette.glint} strokeWidth="1.3" />
      <polygon points={starPoints(12, 40, 35)} fill={`url(#${id}-core)`} stroke={palette.edge} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="25" fill={palette.core} stroke={palette.glint} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="21.5" fill="none" stroke={palette.edge} strokeOpacity=".82" strokeWidth=".8" />
      <text x="50" y="57" textAnchor="middle" fill={palette.glint} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize={badgeLevel > 9 ? "25" : "30"} fontWeight="800" letterSpacing="-1">
        {badgeLevel}
      </text>
    </svg>
  );
}
