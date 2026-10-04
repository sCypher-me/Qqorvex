import { ArrowClockwiseIcon, ArrowDownRightIcon, ArrowUpRightIcon, ChartLineUpIcon, ClockIcon, CoinsIcon } from "@phosphor-icons/react";
import { Button, Notice, Skeleton } from "@qqorvex/ui";
import type { InvestmentMarketAsset, InvestmentMarketSnapshot } from "../types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const updatedTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function formatMoney(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : money.format(value);
}

export function InvestmentMarketHome({
  market,
  marketError,
  isLoading,
  isFetching,
  onRefresh,
}: {
  market: InvestmentMarketSnapshot | null;
  marketError: string | null;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft bg-[radial-gradient(ellipse_at_top_right,var(--color-gold-soft),transparent_72%)] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-line bg-gold-soft text-gold-fg">
            <ChartLineUpIcon size={22} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-fg">Investimentos</p>
            <h2 className="mt-0.5 font-display text-xl font-semibold text-fg">Mercado em movimento</h2>
            <p className="mt-1 text-xs leading-relaxed text-fg-3">Acompanhe as maiores variações de ações, FIIs e criptomoedas.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {market && <span className="hidden items-center gap-1.5 text-xs tabular-nums text-fg-3 sm:inline-flex"><ClockIcon size={14} /> Atualizado às {updatedTime.format(new Date(market.updatedAt))}</span>}
          <Button size="sm" variant="secondary" leadingIcon={<ArrowClockwiseIcon size={15} />} loading={isFetching} disabled={isFetching} onClick={onRefresh}>Atualizar mercado</Button>
        </div>
      </header>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
        {marketError && <Notice className="xl:col-span-2" tone="warning" title="Mercado temporariamente indisponível">{marketError}</Notice>}
        {isLoading ? (
          <>
            <MarketSkeleton />
            <MarketSkeleton />
            <MarketSkeleton />
            <MarketSkeleton />
            <MarketSkeleton className="xl:col-span-2" />
          </>
        ) : market ? (
          <>
            <MoversCard title="Ações que mais subiram" description="B3 · último pregão" direction="up" assets={market.stocks.gainers} />
            <MoversCard title="Ações que mais caíram" description="B3 · último pregão" direction="down" assets={market.stocks.decliners} />
            <MoversCard title="FIIs em alta" description="B3 · último pregão" direction="up" assets={market.fiis.gainers} />
            <MoversCard title="FIIs em queda" description="B3 · último pregão" direction="down" assets={market.fiis.decliners} />
            <CryptoCard assets={market.crypto} />
          </>
        ) : !marketError ? (
          <Notice className="xl:col-span-2" tone="info" title="As cotações ainda não chegaram">Tente atualizar o mercado em instantes.</Notice>
        ) : null}
      </div>
      <p className="border-t border-line-soft px-4 py-3 text-[11px] leading-relaxed text-fg-4 sm:px-5">
        Fonte: brapi.dev · ações e FIIs mostram a variação do último pregão; criptomoedas usam uma janela móvel de 24 horas. Dados informativos, sem recomendação de investimento.
      </p>
    </section>
  );
}

function MoversCard({
  title,
  description,
  assets,
  direction,
}: {
  title: string;
  description: string;
  direction: "up" | "down";
  assets: InvestmentMarketAsset[];
}) {
  const DirectionIcon = direction === "up" ? ArrowUpRightIcon : ArrowDownRightIcon;
  const tone = direction === "up" ? "text-success" : "text-danger";
  return (
    <div className="min-w-0 rounded-xl border border-line-soft bg-canvas/35 p-3.5 sm:p-4">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover ${tone}`}><DirectionIcon size={18} weight="bold" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
          <p className="mt-0.5 text-[11px] text-fg-4">{description}</p>
        </div>
      </div>
      {assets.length ? (
        <ul className="mt-3 divide-y divide-line-soft">
          {assets.map((asset) => <MoverRow key={`${asset.assetType}:${asset.symbol}`} asset={asset} tone={tone} />)}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-line-soft px-3 py-4 text-center text-xs text-fg-4">Sem variações disponíveis neste pregão.</p>
      )}
    </div>
  );
}

function MoverRow({ asset, tone }: { asset: InvestmentMarketAsset; tone: string }) {
  return (
    <li className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-[10px] font-bold text-fg-3">{asset.symbol.slice(0, 4)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-fg">{asset.symbol}</p>
        <p className="truncate text-[10px] text-fg-4">{asset.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium tabular-nums text-fg">{formatMoney(asset.price)}</p>
        <p className={`mt-0.5 text-xs font-semibold tabular-nums ${tone}`}>{asset.changePercent == null ? "—" : `${asset.changePercent > 0 ? "+" : ""}${asset.changePercent.toFixed(2).replace(".", ",")}%`}</p>
      </div>
    </li>
  );
}

function CryptoCard({ assets }: { assets: InvestmentMarketAsset[] }) {
  return (
    <div className="min-w-0 rounded-xl border border-line-soft bg-canvas/35 p-3.5 sm:p-4 xl:col-span-2">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-ai-fg"><CoinsIcon size={18} weight="duotone" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-fg">Criptomoedas em destaque</h3>
          <p className="mt-0.5 text-[11px] text-fg-4">Preço em reais · variação das últimas 24h</p>
        </div>
      </div>
      {assets.length ? (
        <ul className="mt-3 grid grid-cols-1 gap-x-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.symbol} className="flex min-w-0 items-center gap-3 border-t border-line-soft py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[10px] font-bold text-fg-2">{asset.symbol.slice(0, 3)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-fg">{asset.name}</p>
                <p className="text-[10px] text-fg-4">{asset.symbol}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium tabular-nums text-fg">{formatMoney(asset.price)}</p>
                <p className={`mt-0.5 text-xs font-semibold tabular-nums ${asset.changePercent == null ? "text-fg-4" : asset.changePercent >= 0 ? "text-success" : "text-danger"}`}>
                  {asset.changePercent == null ? "—" : `${asset.changePercent > 0 ? "+" : ""}${asset.changePercent.toFixed(2).replace(".", ",")}%`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-line-soft px-3 py-4 text-center text-xs text-fg-4">Cotações de cripto indisponíveis no momento.</p>
      )}
    </div>
  );
}

function MarketSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-line-soft bg-canvas/35 p-4 ${className}`}>
      <Skeleton className="h-4 w-44" />
      <div className="mt-4 space-y-3">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-10 w-full" />)}</div>
    </div>
  );
}
