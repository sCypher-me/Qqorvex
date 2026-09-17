import type { ReactNode } from "react";
import { Badge, ProgressBar, ProgressRing } from "@qqorvex/ui";
import type { LevelProgress } from "../service";

export interface GamificationStat {
  value: ReactNode;
  label: string;
}

export interface GamificationWidgetProps {
  progress: LevelProgress | null;
  title: string | null;
  /** Pílula ouro ao lado do título (ex.: "Marco alcançado") — só quando houver um marco real. */
  highlight?: string;
  /** Estatísticas à direita. Padrão: XP total (único número sempre disponível nas props). */
  stats?: GamificationStat[];
}

const numberFormat = new Intl.NumberFormat("pt-BR");

export function formatXp(value: number): string {
  return numberFormat.format(value);
}

/** Texto padrão de progresso — "X de Y XP para o próximo nível", sempre com os números reais do nível atual. */
export function LevelProgressText({ progress }: { progress: LevelProgress }) {
  const current = progress.xp - progress.xpForCurrentLevel;
  const span = progress.xpForNextLevel - progress.xpForCurrentLevel;
  return (
    <>
      <span className="font-mono">{formatXp(current)}</span> de <span className="font-mono">{formatXp(span)}</span> XP para
      o próximo nível
    </>
  );
}

/** Card de marco (ouro, canto cortado) do topo do Hoje — atualiza no padrão normal do React Query (foco/revisita), sem sync instantâneo entre módulos. */
export function GamificationWidget({ progress, title, highlight, stats }: GamificationWidgetProps) {
  if (!progress || !title) return null;

  const rightStats = stats ?? [{ value: formatXp(progress.xp), label: "XP total" }];

  return (
    <div className="qv-card-milestone w-full flex items-center gap-7 flex-wrap px-6 py-[22px]">
      <ProgressRing value={progress.progressPercent} size={96} thickness={9} tone="gold">
        <span className="font-mono text-[22px] font-semibold leading-none text-vex-gold-bright">{progress.level}</span>
        <span className="text-[10px] tracking-[.1em] uppercase text-text-muted mt-0.5">Nível</span>
      </ProgressRing>

      <div className="flex-1 min-w-[220px] flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-display text-[22px] font-semibold">{title}</span>
          {highlight && <Badge tone="premium">{highlight}</Badge>}
        </div>
        <span className="text-[13px] text-text-secondary">
          <LevelProgressText progress={progress} />
        </span>
        <ProgressBar value={progress.progressPercent} tone="gold" height={7} />
      </div>

      {rightStats.length > 0 && (
        <div className="flex gap-7 pl-3 border-l border-border">
          {rightStats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-[3px]">
              <span className="font-mono text-[26px] font-semibold leading-tight">{stat.value}</span>
              <span className="text-[11px] tracking-[.08em] uppercase text-text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
