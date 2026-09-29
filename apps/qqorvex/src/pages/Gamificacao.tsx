import { Button, Notice, ProgressBar, SectionTitle, Skeleton } from "@qqorvex/ui";
import { useAuth, useProfile } from "@qqorvex/auth";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LEVEL_THEMES, VIP_THEME, useTheme, type AppSkin } from "../app/ThemeContext";
import { ThemeRewardCard } from "../components/ThemeRewardCard";
import { hasPlusEntitlement } from "../billing/entitlements";
import {
  BadgesPanel,
  formatDailyCountdown,
  formatXp,
  getDailyChallenges,
  localDateKey,
  summarizeDailyChallengeHistory,
  TitleBadge,
  useDailyChallengeHistory,
  useDailyChallengeProgress,
  useGamificationStats,
  useUnlockedBadges,
  type DailyChallengeDefinition,
  type DailyChallengeProgress,
} from "@qqorvex/module-gamificacao";

/** Gamificação: progresso real de XP, níveis, desafios diários rotativos e conquistas permanentes. */
export function GamificacaoPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const { profile, isLoading: profileLoading } = useProfile(client, userId);
  const isOwner = profile?.role === "dono";
  const { skin, setSkin } = useTheme();
  const [now, setNow] = useState(() => new Date());
  const [skinSaving, setSkinSaving] = useState(false);
  const [skinSaveMessage, setSkinSaveMessage] = useState<string | null>(null);
  const [hasPlus, setHasPlus] = useState(false);
  const [plusLoading, setPlusLoading] = useState(true);
  const [plusLoadError, setPlusLoadError] = useState(false);
  const levelCarouselRef = useRef<HTMLDivElement>(null);
  const [levelsPerPage, setLevelsPerPage] = useState(10);
  const { stats, progress, title, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading, error: badgesError } = useUnlockedBadges(client, userId, profile?.role === "dono");
  const dateKey = localDateKey(now);
  const { progressByKey, isLoading: challengeProgressLoading, error: challengeProgressError } = useDailyChallengeProgress(client, userId, dateKey);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const { progress: historyProgress, isLoading: historyLoading, error: historyError } = useDailyChallengeHistory(
    client,
    userId,
    dateKey,
    showDailyHistory,
  );

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshPlus = async () => {
      if (profileLoading) return;
      if (isOwner) {
        setHasPlus(true);
        setPlusLoadError(false);
        setPlusLoading(false);
        return;
      }
      const { data, error } = await client
        .from("billing_subscriptions")
        .select("plan_key,status,current_period_end")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setPlusLoadError(true);
        setPlusLoading(false);
        return;
      }
      setHasPlus(hasPlusEntitlement(data));
      setPlusLoadError(false);
      setPlusLoading(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshPlus();
    };
    void refreshPlus();
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [client, isOwner, profileLoading, userId]);

  useEffect(() => {
    const container = levelCarouselRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const updatePageSize = () => {
      const width = container.clientWidth;
      const count = width >= 1400 ? 10 : width >= 900 ? 6 : width >= 640 ? 5 : width >= 480 ? 4 : width >= 360 ? 3 : 2;
      setLevelsPerPage((current) => current === count ? current : count);
    };

    const observer = new ResizeObserver(updatePageSize);
    observer.observe(container);
    updatePageSize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!progress) return;
    const currentLevel = Math.max(1, Math.min(progress.level, 50));
    const container = levelCarouselRef.current;
    const pageIndex = Math.floor((currentLevel - 1) / levelsPerPage);
    const page = container?.querySelector<HTMLElement>(`[data-level-page="${pageIndex}"]`);
    if (!container || !page) return;
    const containerBounds = container.getBoundingClientRect();
    const pageBounds = page.getBoundingClientRect();
    const left = container.scrollLeft + pageBounds.left - containerBounds.left;
    container.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [progress?.level, levelsPerPage]);

  useEffect(() => {
    if (profileLoading || plusLoading || plusLoadError || hasPlus || skin !== VIP_THEME.id) return;
    setSkin("default");
    const savedPreferences = session!.user.user_metadata.qqorvex_preferences;
    const preferences = savedPreferences && typeof savedPreferences === "object"
      ? savedPreferences as Record<string, unknown>
      : {};
    void client.auth.updateUser({ data: { qqorvex_preferences: { ...preferences, skin: "default" } } });
  }, [client, hasPlus, plusLoadError, plusLoading, profileLoading, session, setSkin, skin]);

  if (statsLoading && (!progress || !title || !stats)) {
    return (
      <div role="status" aria-label="Carregando" className="flex w-full flex-col gap-5 desktop:pr-12">
        <Skeleton className="h-64 w-full rounded-[20px]" />
        <Skeleton className="h-36 w-full rounded-[18px]" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 w-full rounded-[16px]" />)}
        </div>
      </div>
    );
  }

  if (!progress || !title || !stats) {
    return (
      <div className=" editorial-gamification flex w-full flex-col gap-5 pb-8">
        <Notice tone="error" title="Sua jornada não carregou">
          <span className="block">Não foi possível buscar seu nível e XP agora. Seu progresso continua salvo.</span>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void refetchStats()}>
            Tentar novamente
          </Button>
        </Notice>
      </div>
    );
  }

  const unlockedCount = badges.filter((badge) => badge.isUnlockedForUser).length;
  const currentLevelXp = progress.xp - progress.xpForCurrentLevel;
  const xpRemaining = Math.max(0, progress.xpForNextLevel - progress.xp);
  const currentLevel = progress.level;
  const activityCount = stats.tasks_completed + stats.habit_or_goal_checkins + stats.quizzes_completed + stats.library_items_completed;
  const levelNumbers = Array.from({ length: 50 }, (_, index) => index + 1);
  const displayedCurrentLevel = Math.min(progress.level, levelNumbers.length);
  const levelPages = Array.from({ length: Math.ceil(levelNumbers.length / levelsPerPage) }, (_, pageIndex) =>
    levelNumbers.slice(pageIndex * levelsPerPage, (pageIndex + 1) * levelsPerPage),
  );
  const dailyChallenges = getDailyChallenges(dateKey);
  const completedChallengesToday = dailyChallenges.filter((challenge) => Boolean(progressByKey.get(challenge.key)?.completed_at)).length;
  const dailyHistory = summarizeDailyChallengeHistory(dateKey, historyProgress);
  const unlockedThemeCount = LEVEL_THEMES.filter((theme) => progress.level >= theme.level).length;

  async function chooseLevelTheme(nextSkin: AppSkin) {
    const reward = LEVEL_THEMES.find((theme) => theme.id === nextSkin);
    if ((reward && currentLevel < reward.level) || (nextSkin === VIP_THEME.id && !hasPlus) || skinSaving || nextSkin === skin) return;

    setSkinSaveMessage(null);
    setSkin(nextSkin);
    setSkinSaving(true);
    const preferences = session!.user.user_metadata.qqorvex_preferences;
    const savedPreferences = preferences && typeof preferences === "object"
      ? preferences as Record<string, unknown>
      : {};

    try {
      const { error } = await client.auth.updateUser({
        data: { qqorvex_preferences: { ...savedPreferences, skin: nextSkin } },
      });
      if (error) setSkinSaveMessage("O tema foi aplicado neste dispositivo, mas não consegui sincronizá-lo com sua conta. Tente novamente quando estiver online.");
    } catch {
      setSkinSaveMessage("O tema foi aplicado neste dispositivo, mas não consegui sincronizá-lo com sua conta. Tente novamente quando estiver online.");
    } finally {
      setSkinSaving(false);
    }
  }

  return (
    <div className=" editorial-gamification flex w-full flex-col gap-8 pb-4">
      {statsError && (
        <Notice tone="error" title="Não foi possível atualizar sua jornada">
          Os dados exibidos podem estar desatualizados. Seu progresso continua salvo.
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void refetchStats()}>
            Atualizar agora
          </Button>
        </Notice>
      )}
      <section className="editorial-gamification-header">
        <div className="editorial-gamification-identity">
          <LevelBadge level={Math.min(progress.level, 50)} alt={progress.level > 50 ? "Última insígnia disponível, do nível 50" : `Insígnia atual do nível ${progress.level}`} className="h-24 w-24 shrink-0" />
          <div className="min-w-0">
            <span className="editorial-eyebrow">SUA JORNADA / {progress.level > 50 ? "INSÍGNIA MÁXIMA" : "INSÍGNIA ATUAL"}</span>
            <h1 className="m-0 mt-2 font-display text-[clamp(42px,5.5vw,76px)] font-bold leading-none tracking-[-0.07em] text-fg">Nível {progress.level}</h1>
            <div className="mt-3"><TitleBadge title={profile?.selected_title || title} size="lg" /></div>
          </div>
        </div>
        <div className="editorial-gamification-progress">
          <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-3">
            <span>{formatXp(currentLevelXp)} XP neste nível</span>
            <span>Próximo patamar · {formatXp(progress.xpForNextLevel)} XP acumulados</span>
          </div>
          <ProgressBar value={progress.progressPercent} tone="cyan" height={6} />
          <p className="m-0 mt-2 text-xs text-fg-3">{formatXp(xpRemaining)} XP restantes para subir de nível</p>
          {progress.level >= 50 && <p className="m-0 mt-2 text-xs text-fg-2">As 50 insígnias estão completas; sua jornada de XP continua.</p>}
        </div>
      </section>

      <section className="editorial-gamification-summary grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo da jornada">
        <JourneyMetric label="XP total" value={formatXp(progress.xp)} detail="somado em toda a jornada" />
        <JourneyMetric label="Ações registradas" value={formatXp(activityCount)} detail="tarefas, check-ins, quizzes e biblioteca" />
        <JourneyMetric label="Desafios de hoje" value={challengeProgressLoading || challengeProgressError ? "—" : `${completedChallengesToday}/4`} detail="recompensa somente em XP" />
        <JourneyMetric label="Conquistas" value={badgesLoading || badgesError ? "—" : `${unlockedCount}/${badges.length}`} detail="badges e títulos permanentes" />
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle meta="50 níveis · deslize para explorar">Insígnias de nível</SectionTitle>
          <div className="flex items-center gap-2">
            <button type="button" className="editorial-carousel-arrow" onClick={() => { const carousel = levelCarouselRef.current; if (carousel) carousel.scrollBy({ left: -carousel.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }} aria-label="Ver níveis anteriores" title="Níveis anteriores">
              <svg viewBox="0 0 20 20" className="h-4 w-4 rotate-180" fill="none" aria-hidden="true"><path d="m7 4 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>
            </button>
            <button type="button" className="editorial-carousel-arrow" onClick={() => { const carousel = levelCarouselRef.current; if (carousel) carousel.scrollBy({ left: carousel.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }} aria-label="Ver próximos níveis" title="Próximos níveis">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true"><path d="m7 4 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></svg>
            </button>
          </div>
        </div>
        <div ref={levelCarouselRef} className="editorial-level-carousel" role="region" aria-roledescription="carrossel" aria-label="Galeria de insígnias de nível" tabIndex={0}>
          {levelPages.map((pageLevels, pageIndex) => (
            <div key={pageIndex} className="editorial-level-page" data-level-page={pageIndex} role="list" aria-label={`Níveis ${pageLevels[0]} a ${pageLevels[pageLevels.length - 1]}`} style={{ gridTemplateColumns: `repeat(${levelsPerPage}, minmax(0, 1fr))` }}>
              {pageLevels.map((level) => {
                const isCurrent = level === displayedCurrentLevel;
                const isComplete = level < displayedCurrentLevel;
                return (
                  <div
                    key={level}
                    data-level={level}
                    role="listitem"
                    aria-current={isCurrent ? "step" : undefined}
                    className={`editorial-level-card border px-3 py-3 text-center transition-colors ${
                      isCurrent
                        ? "border-gold-line bg-gold-soft text-gold-fg shadow-[0_0_0_1px_var(--qv-brand-primary)]"
                        : isComplete
                          ? "border-line bg-surface text-fg-2"
                          : "border-line bg-surface/50 text-fg-3"
                    }`}
                  >
                    <LevelBadge
                      level={level}
                      alt={`Insígnia do nível ${level}`}
                      className={`h-[72px] w-[72px] shrink-0 ${isCurrent ? "" : isComplete ? "opacity-80" : "opacity-35 grayscale"}`}
                    />
                    <div className="min-w-0 w-full">
                      <span className="block text-xs font-semibold text-fg">Nível {level}</span>
                      <span className="mt-1 block truncate text-[9px] text-fg-3">
                        {isCurrent
                          ? progress.level > 50 ? `Insígnia máxima · você está no nível ${progress.level}` : "Seu nível atual"
                          : isComplete ? "Nível concluído" : "Ainda não desbloqueado"}
                      </span>
                    </div>
                    <span className={`mt-2 shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${
                      isCurrent ? "border-brand-primary/40 bg-brand-primary/10 text-gold-fg" : isComplete ? "border-line text-fg-2" : "border-line/70 text-fg-3"
                    }`}>
                      {isCurrent ? "Atual" : isComplete ? "Concluído" : "Bloqueado"}
                    </span>
                  </div>
                );
              })}
              {pageLevels.length < levelsPerPage && (
                <div
                  className="editorial-level-upcoming"
                  style={{ gridColumn: `span ${levelsPerPage - pageLevels.length}` }}
                  role="note"
                  aria-label="Novos níveis em breve"
                >
                  <span className="editorial-eyebrow">EXPANSÃO DA JORNADA</span>
                  <strong>Novos níveis em breve</strong>
                  <span>Continue acumulando XP. Mais marcos estão a caminho.</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="m-0 text-[11px] text-fg-3">Deslize ou use as setas para avançar por páginas completas de níveis. Nenhuma insígnia fica cortada.</p>
      </section>

      <section className="flex flex-col gap-4" aria-label="Temas da jornada">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionTitle meta={`${unlockedThemeCount} de ${LEVEL_THEMES.length} níveis · ${plusLoading ? "verificando Plus…" : hasPlus ? isOwner ? "Plus permanente · Dono" : "VIP desbloqueado" : "VIP exclusivo Plus"}`}>Temas da jornada</SectionTitle>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-relaxed text-fg-3">Uma identidade visual a cada 10 níveis; assinantes Plus liberam automaticamente o tema VIP.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={skinSaving || skin === "default"} onClick={() => void chooseLevelTheme("default")}>
            {skin === "default" ? "Tema original ativo" : "Restaurar tema original"}
          </Button>
        </div>
        {skinSaveMessage && <Notice tone="info" title="Tema aplicado neste dispositivo">{skinSaveMessage}</Notice>}
        {plusLoadError && <Notice tone="warning" title="Não foi possível validar sua assinatura Plus">O tema VIP só será liberado após confirmação do status da assinatura. A tela tentará verificar novamente quando voltar ao foco.</Notice>}
        <div className="qv-level-themes-grid">
          {LEVEL_THEMES.map((reward) => (
            <ThemeRewardCard
              key={reward.id}
              theme={reward}
              requirement={`RECOMPENSA · NÍVEL ${reward.level}`}
              unlocked={progress.level >= reward.level}
              active={skin === reward.id}
              busy={skinSaving}
              lockedMessage={`Desbloqueie no nível ${reward.level}`}
              onChoose={() => void chooseLevelTheme(reward.id)}
            />
          ))}
          <ThemeRewardCard
            theme={VIP_THEME}
            requirement="EXCLUSIVO · QQRVEX PLUS"
            unlocked={hasPlus}
            active={skin === VIP_THEME.id}
            busy={skinSaving}
            checking={plusLoading}
            lockedMessage={plusLoadError ? "Não foi possível verificar o Plus" : "Exclusivo para assinantes Plus"}
            onChoose={() => void chooseLevelTheme(VIP_THEME.id)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle meta="2 fáceis · 1 médio · 1 difícil">Desafios do dia</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="editorial-text-link"
              aria-expanded={showDailyHistory}
              aria-controls="daily-challenge-history"
              onClick={() => setShowDailyHistory((shown) => !shown)}
            >
              {showDailyHistory ? "Ocultar histórico" : "Últimos 7 dias"}
            </button>
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-fg-3">NOVOS EM</span>
              <time className="font-mono text-sm font-semibold tabular-nums text-gold-fg">{formatDailyCountdown(now)}</time>
            </div>
          </div>
        </div>
        {challengeProgressError && <Notice tone="error" title="Progresso dos desafios indisponível">As missões continuam visíveis, mas os registros atuais não puderam ser confirmados.</Notice>}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {dailyChallenges.map((challenge) => (
            <DailyChallengeCard
              key={challenge.key}
              challenge={challenge}
              progress={progressByKey.get(challenge.key)}
              progressAvailable={!challengeProgressError && !challengeProgressLoading}
            />
          ))}
        </div>

        {showDailyHistory && (
          <section id="daily-challenge-history" className="editorial-daily-history flex flex-col gap-3" aria-label="Histórico de desafios dos últimos sete dias">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-sm font-semibold text-fg">Seu ritmo recente</h3>
              <span className="text-xs text-fg-3">Desafios anteriores · recompensas em XP</span>
            </div>
            {historyLoading ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3" role="status" aria-label="Carregando histórico">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 w-full rounded-xl" />)}
              </div>
            ) : historyError ? (
              <Notice tone="error" title="Não foi possível carregar o histórico">Seu progresso atual não foi afetado.</Notice>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                {dailyHistory.map((day) => <DailyHistoryCard key={day.dateKey} day={day} />)}
              </div>
            )}
          </section>
        )}
      </section>

      <section className="flex flex-col gap-3.5">
        <SectionTitle meta={`${unlockedCount} de ${badges.length} conquistadas · badge + título`}>Conquistas</SectionTitle>
        <p className="-mt-1 m-0 max-w-[760px] text-sm leading-relaxed text-fg-2">
          Marcos permanentes da sua jornada. Complete cada requisito para liberar a insígnia visual e o título correspondente.
        </p>
        {badgesError ? (
          <Notice tone="error" title="Conquistas indisponíveis">Não foi possível confirmar quais badges você já desbloqueou. Atualize a tela para tentar novamente.</Notice>
        ) : badgesLoading ? (
          <div role="status" aria-label="Carregando conquistas" className="grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-3.5">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-64 w-full rounded-[16px]" />)}
          </div>
        ) : (
          <BadgesPanel badges={badges} stats={stats} />
        )}
      </section>
    </div>
  );
}

function JourneyMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="editorial-gamification-metric min-w-0 border border-line bg-canvas/70 px-4 py-3.5">
      <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-3">{label}</span>
      <strong className="mt-1 block font-mono text-xl font-semibold tabular-nums text-fg">{value}</strong>
      <span className="mt-1 block truncate text-[11px] text-fg-2">{detail}</span>
    </div>
  );
}

function DailyHistoryCard({ day }: { day: ReturnType<typeof summarizeDailyChallengeHistory>[number] }) {
  const date = new Date(`${day.dateKey}T12:00:00`);
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(date);

  return (
    <article className="editorial-daily-history-card flex min-w-0 flex-col gap-2 border border-line bg-canvas/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <time dateTime={day.dateKey} className="text-xs font-semibold capitalize text-fg">{label}</time>
        <span className="font-mono text-[11px] text-fg-2">{day.completedCount}/{day.totalCount}</span>
      </div>
      <ProgressBar value={(day.completedCount / day.totalCount) * 100} tone={day.completedCount === day.totalCount ? "success" : "cyan"} height={4} />
      <span className="font-mono text-[11px] font-semibold text-gold-fg">+{day.rewardXp} XP em bônus</span>
      <p className="m-0 text-[11px] leading-relaxed text-fg-3">
        {day.completedTitles.length ? day.completedTitles.join(" · ") : "Nenhum desafio concluído nesse dia."}
      </p>
    </article>
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

function LevelBadge({
  level,
  alt,
  className,
}: {
  level: number;
  alt: string;
  className: string;
}) {
  const badgeLevel = Math.max(1, Math.min(50, level));
  const tier = Math.floor((badgeLevel - 1) / 10);
  const palette = LEVEL_BADGE_PALETTES[tier]!;
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
      <polygon points={starPoints(8, 32, 29)} fill="none" stroke={palette.shadow} strokeWidth="1" />
      <circle cx="50" cy="50" r="25" fill={palette.core} stroke={palette.glint} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="21.5" fill="none" stroke={palette.edge} strokeOpacity=".82" strokeWidth=".8" />
      <path d="M50 21v6M50 73v6M21 50h6M73 50h6M29.5 29.5l4.2 4.2M66.3 66.3l4.2 4.2M70.5 29.5l-4.2 4.2M33.7 66.3l-4.2 4.2" stroke={palette.glint} strokeLinecap="round" strokeWidth="1.3" />
      <text x="50" y="57" textAnchor="middle" fill={palette.glint} stroke={palette.core} strokeWidth="2.4" paintOrder="stroke" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize={badgeLevel > 9 ? "25" : "30"} fontWeight="800" letterSpacing="-1">{badgeLevel}</text>
      <circle cx="50" cy="8" r="1.4" fill={palette.glint} />
      <circle cx="92" cy="50" r="1.4" fill={palette.glint} />
      <circle cx="50" cy="92" r="1.4" fill={palette.glint} />
      <circle cx="8" cy="50" r="1.4" fill={palette.glint} />
    </svg>
  );
}

function DailyChallengeCard({
  challenge,
  progress,
  progressAvailable = true,
}: {
  challenge: DailyChallengeDefinition;
  progress?: DailyChallengeProgress;
  progressAvailable?: boolean;
}) {
  const current = Math.min(progress?.progress ?? 0, challenge.target);
  const completed = progressAvailable && Boolean(progress?.completed_at);
  return (
    <article className={`editorial-challenge-card flex min-h-[190px] flex-col gap-4 border p-4 transition-colors ${completed ? "border-success-border/80 bg-success-bg/20" : "border-line hover:border-gold-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${difficultyClassName(challenge.difficulty)}`}>
          {challenge.difficulty}
        </span>
        <span className="rounded-full border border-warning/40 bg-warning-soft px-2 py-1 font-mono text-[11px] font-semibold text-gold-fg">
          +{challenge.rewardXp} XP
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-semibold text-fg">{challenge.title}</h3>
        <p className="m-0 mt-1 text-xs leading-relaxed text-fg-2">{challenge.description}</p>
      </div>
      <div className="mt-auto border-t border-line/70 pt-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-fg-3">
          <span>{!progressAvailable ? "Progresso indisponível" : completed ? "Concluído" : `${current} / ${challenge.target} ${challenge.unit}`}</span>
          <span>Somente XP</span>
        </div>
        <ProgressBar value={progressAvailable ? (current / challenge.target) * 100 : 0} tone={completed ? "success" : "cyan"} height={5} />
        <Link to={challenge.href} className="mt-3 inline-block text-xs font-semibold text-gold-fg transition-colors hover:text-fg">
          {completed ? "Desafio concluído" : challenge.actionLabel} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function difficultyClassName(difficulty: DailyChallengeDefinition["difficulty"]): string {
  if (difficulty === "Difícil") return "border-danger/40 bg-danger-soft text-danger";
  if (difficulty === "Médio") return "border-warning/40 bg-warning-soft text-gold-fg";
  if (difficulty === "Especial") return "border-violet-400/50 bg-violet-400/10 text-violet-200";
  return "border-gold-line bg-gold-soft text-gold-fg";
}
