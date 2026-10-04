import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../cx";

/**
 * Gráficos leves em SVG (sem dependência). Especificação:
 *  - barras ≤ 24px, topo arredondado 4px e base reta, 2px de respiro entre barras vizinhas;
 *  - linhas 2px, área com lavagem de ~10%, marcadores ≥ 8px com anel da superfície;
 *  - grade em linha fina sólida e recessiva; um único eixo Y;
 *  - texto sempre nas cores de texto (nunca na cor da série);
 *  - legenda sempre presente com 2+ séries; tooltip no hover/foco de cada ponto.
 * Séries usam a paleta categórica em ordem fixa (`--q-cat-N`); série única usa o dourado.
 */

export interface ChartSeries {
  key: string;
  label: string;
  /** Cor explícita (var(--q-*)). Sem ela, usa a paleta categórica pela posição. */
  color?: string;
}

export interface ChartDatum {
  label: string;
  /** Rótulo longo para o tooltip (ex.: "março de 2026"). */
  fullLabel?: string;
  values: Record<string, number>;
}

function seriesColor(series: ChartSeries[], index: number): string {
  const explicit = series[index]?.color;
  if (explicit) return explicit;
  if (series.length === 1) return "var(--q-gold)";
  return `var(--q-cat-${(index % 8) + 1})`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

const compactFormatter = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function ChartLegend({ series, className }: { series: ChartSeries[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {series.map((item, index) => (
        <li key={item.key} className="inline-flex items-center gap-1.5 text-xs text-fg-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: seriesColor(series, index) }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.max(0, Math.min(x, width));
  const alignRight = left > width * 0.65;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[140px] rounded-lg border border-line bg-overlay px-3 py-2 text-xs shadow-md"
      style={{ top: Math.max(0, y), left, transform: alignRight ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)" }}
    >
      {children}
    </div>
  );
}

function TooltipRows({ datum, series, format }: { datum: ChartDatum; series: ChartSeries[]; format: (value: number) => string }) {
  return (
    <>
      <p className="mb-1 font-medium text-fg">{datum.fullLabel ?? datum.label}</p>
      {series.map((item, index) => (
        <p key={item.key} className="flex items-center justify-between gap-4 text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: seriesColor(series, index) }} />
            {item.label}
          </span>
          <span className="tabular-nums text-fg">{format(datum.values[item.key] ?? 0)}</span>
        </p>
      ))}
    </>
  );
}

export interface BarChartProps {
  data: ChartDatum[];
  series: ChartSeries[];
  height?: number;
  format?: (value: number) => string;
  /** Formato curto para os ticks do eixo Y. */
  axisFormat?: (value: number) => string;
  /** Índice destacado (ex.: mês atual); os outros ficam mais discretos. */
  highlightIndex?: number;
  className?: string;
  /** Descrição acessível do gráfico. */
  label: string;
  /** Valores inteiros (contagens): eixo com passos inteiros. */
  integer?: boolean;
}

function axisTicks(maxValue: number, integer: boolean): { max: number; ticks: number[] } {
  if (integer && maxValue <= 5) {
    const max = Math.max(1, Math.ceil(maxValue));
    return { max, ticks: Array.from({ length: max + 1 }, (_, index) => index) };
  }
  const max = niceMax(maxValue);
  return { max, ticks: [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio) };
}

/** Colunas agrupadas (1–3 séries). */
export function BarChart({ data, series, height = 200, format = (v) => v.toLocaleString("pt-BR"), axisFormat = formatCompact, highlightIndex, className, label, integer = false }: BarChartProps) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const padding = { top: 12, right: 4, bottom: 24, left: 40 };
  const innerWidth = Math.max(0, width - padding.left - padding.right);
  const innerHeight = height - padding.top - padding.bottom;
  const { max, ticks } = axisTicks(Math.max(0, ...data.flatMap((datum) => series.map((item) => datum.values[item.key] ?? 0))), integer);
  const band = data.length ? innerWidth / data.length : 0;
  const barWidth = Math.max(4, Math.min(24, (band * 0.62 - (series.length - 1) * 2) / Math.max(1, series.length)));
  const groupWidth = barWidth * series.length + (series.length - 1) * 2;
  const y = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;

  return (
    <div ref={ref} className={cx("relative w-full", className)} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-labelledby={titleId} className="block overflow-visible">
          <title id={titleId}>{label}</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke="var(--q-line-soft)" strokeWidth={1} />
              <text x={padding.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-4 text-[10.5px] tabular-nums">
                {axisFormat(tick)}
              </text>
            </g>
          ))}
          {data.map((datum, index) => {
            const groupX = padding.left + band * index + (band - groupWidth) / 2;
            const dim = highlightIndex !== undefined && highlightIndex !== index && active !== index;
            return (
              <g key={datum.label} opacity={dim ? 0.55 : 1}>
                {series.map((item, seriesIndex) => {
                  const value = Math.max(0, datum.values[item.key] ?? 0);
                  const x = groupX + seriesIndex * (barWidth + 2);
                  const top = y(value);
                  const barHeight = padding.top + innerHeight - top;
                  const r = Math.min(4, barHeight, barWidth / 2);
                  const path =
                    barHeight <= 0
                      ? ""
                      : `M${x},${top + barHeight} V${top + r} Q${x},${top} ${x + r},${top} H${x + barWidth - r} Q${x + barWidth},${top} ${x + barWidth},${top + r} V${top + barHeight} Z`;
                  return path ? <path key={item.key} d={path} fill={seriesColor(series, seriesIndex)} /> : null;
                })}
                <text x={padding.left + band * index + band / 2} y={height - 6} textAnchor="middle" className={cx("text-[10.5px]", highlightIndex === index ? "fill-fg-2 font-medium" : "fill-fg-4")}>
                  {datum.label}
                </text>
                <rect
                  x={padding.left + band * index}
                  y={padding.top}
                  width={band}
                  height={innerHeight}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${datum.fullLabel ?? datum.label}: ${series.map((item) => `${item.label} ${format(datum.values[item.key] ?? 0)}`).join(", ")}`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          {active !== null && <rect x={padding.left + band * active} y={padding.top} width={band} height={innerHeight} fill="var(--q-hover)" pointerEvents="none" />}
        </svg>
      )}
      {active !== null && data[active] && (
        <Tooltip x={padding.left + band * active + band / 2} y={y(Math.max(...series.map((item) => data[active]!.values[item.key] ?? 0))) + 10} width={width}>
          <TooltipRows datum={data[active]!} series={series} format={format} />
        </Tooltip>
      )}
    </div>
  );
}

export interface LineChartProps {
  data: ChartDatum[];
  series: ChartSeries[];
  height?: number;
  format?: (value: number) => string;
  axisFormat?: (value: number) => string;
  /** Lavagem de área abaixo da linha (só faz sentido com 1–2 séries). */
  area?: boolean;
  /** Permite valores negativos (saldo). */
  allowNegative?: boolean;
  className?: string;
  label: string;
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  format?: (value: number) => string;
  /** Conteúdo central (total). */
  center?: ReactNode;
  label: string;
  className?: string;
}

/** Rosca com fatias separadas por respiro de 2px. Sempre acompanhada de legenda/lista. */
export function DonutChart({ slices, size = 160, thickness = 18, format = (v) => v.toLocaleString("pt-BR"), center, label, className }: DonutChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.filter((slice) => slice.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  const activeSlice = slices.find((slice) => slice.key === active);

  return (
    <div className={cx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--q-selected)" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((slice, index) => {
            if (slice.value <= 0) return null;
            const length = (slice.value / total) * circumference;
            const dash = Math.max(0, length - gap);
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color ?? `var(--q-cat-${(index % 8) + 1})`}
                strokeWidth={active === slice.key ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                opacity={active && active !== slice.key ? 0.45 : 1}
                onMouseEnter={() => setActive(slice.key)}
                onMouseLeave={() => setActive(null)}
                className="cursor-default transition-[stroke-width,opacity] duration-150"
              >
                <title>{`${slice.label}: ${format(slice.value)}`}</title>
              </circle>
            );
            offset += length;
            return element;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {activeSlice ? (
          <>
            <span className="max-w-full truncate text-xs text-fg-3">{activeSlice.label}</span>
            <span className="font-display text-[17px] font-semibold tabular-nums">{format(activeSlice.value)}</span>
            <span className="text-2xs text-fg-4">{total > 0 ? Math.round((activeSlice.value / total) * 100) : 0}%</span>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}
