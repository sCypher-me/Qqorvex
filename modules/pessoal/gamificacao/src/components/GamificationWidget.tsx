import type { LevelProgress } from "../service";

/** Resumo compacto pro topo do Hoje — atualiza no padrão normal do React Query (foco/revisita), sem sync instantâneo entre módulos. */
export function GamificationWidget({ progress, title }: { progress: LevelProgress | null; title: string | null }) {
  if (!progress || !title) return null;

  return (
    <div className="w-full bg-surface-2 border border-border rounded-md p-3 flex items-center gap-3">
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-surface-1 border border-brand-cyan shrink-0">
        <span className="font-display text-sm font-bold text-brand-cyan leading-none">{progress.level}</span>
      </div>
      <div className="flex-1">
        <p className="font-sans text-sm text-text-primary">
          {title} · Nível {progress.level}
        </p>
        <div className="w-full h-1.5 bg-surface-1 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-brand-cyan" style={{ width: `${progress.progressPercent}%` }} />
        </div>
        <p className="font-sans text-xs text-text-secondary-warm mt-0.5">
          {progress.xp - progress.xpForCurrentLevel} / {progress.xpForNextLevel - progress.xpForCurrentLevel} XP
        </p>
      </div>
    </div>
  );
}
