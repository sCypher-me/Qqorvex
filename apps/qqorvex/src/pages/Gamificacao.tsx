import { EmptyState, ProgressBar, ProgressRing, SectionTitle } from "@qqorvex/ui";
import { useAuth } from "@qqorvex/auth";
import {
  ActionCountersCard,
  BadgesPanel,
  LevelProgressText,
  formatXp,
  useGamificationStats,
  useUnlockedBadges,
} from "@qqorvex/module-gamificacao";

/**
 * Gamificação: nível/XP/título derivados do XP total, contadores reais por ação e o catálogo de
 * badges. Missões, temporada e relíquias do design não existem nos dados — ficam de fora.
 */
export function GamificacaoPage() {
  const { client, session } = useAuth();
  const userId = session!.user.id;
  const { stats, progress, title, isLoading: statsLoading } = useGamificationStats(client, userId);
  const { badges, isLoading: badgesLoading } = useUnlockedBadges(client, userId);

  if (statsLoading || badgesLoading) {
    return (
      <div className="flex flex-col gap-5 max-w-[1080px]">
        <EmptyState>Carregando...</EmptyState>
      </div>
    );
  }

  const unlockedCount = badges.filter((b) => b.isUnlockedForUser).length;

  return (
    <div className="flex flex-col gap-5 max-w-[1080px]">
      {progress && title && stats && (
        <div className="qv-card-milestone flex items-center gap-[26px] flex-wrap px-6 py-[22px]">
          <ProgressRing value={progress.progressPercent} size={104} thickness={10} tone="gold">
            <span className="font-mono text-2xl font-semibold leading-none text-vex-gold-bright">{progress.level}</span>
            <span className="text-[10px] tracking-[.1em] uppercase text-text-muted mt-0.5">Nível</span>
          </ProgressRing>
          <div className="flex-[1_1_280px] min-w-0 flex flex-col gap-2.5">
            <span className="font-display text-2xl font-semibold">{title}</span>
            <span className="text-[13px] text-text-secondary">
              <LevelProgressText progress={progress} />. XP vem de tarefas concluídas, check-ins de hábitos e metas,
              quizzes em Estudos e itens concluídos na Biblioteca.
            </span>
            <ProgressBar value={progress.progressPercent} tone="gold" height={7} />
          </div>
          <div className="flex gap-[26px] pl-3 border-l border-border flex-wrap">
            {[
              { value: formatXp(stats.xp), label: "XP total" },
              { value: `${unlockedCount}/${badges.length}`, label: "badges" },
              { value: formatXp(stats.tasks_completed), label: "tarefas" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-[3px]">
                <span className="font-mono text-2xl font-semibold leading-tight">{stat.value}</span>
                <span className="text-[11px] tracking-[.08em] uppercase text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-5 items-start">
          <ActionCountersCard stats={stats} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionTitle meta={`${unlockedCount} de ${badges.length} conquistados`}>Badges</SectionTitle>
        <BadgesPanel badges={badges} stats={stats} />
      </div>
    </div>
  );
}
