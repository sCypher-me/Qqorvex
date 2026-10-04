import { useMemo, useState, type FormEvent } from "react";
import { ArrowClockwiseIcon, ArrowDownIcon, ArrowUpIcon, ChartLineIcon, CoinsIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge, Button, ConfirmDialog, EmptyState, Input, Notice, Select, Skeleton, Segmented, useToast } from "@qqorvex/ui";
import type { Database, SupabaseClient } from "@qqorvex/database";
import {
  useDeleteInvestmentPosition,
  useInvestmentPositions,
  useInvestmentQuotes,
  useSaveInvestmentPosition,
} from "../hooks/useFinancas";
import type { InvestmentAssetType, InvestmentPosition } from "../types";

type Filter = "all" | InvestmentAssetType;
const ASSET_LABEL: Record<InvestmentAssetType, string> = { crypto: "Cripto", stock: "Ação", fii: "FII" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const quantityFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatMoney(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : money.format(value);
}

export function InvestmentsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { toast } = useToast();
  const { positions, isLoading, error } = useInvestmentPositions(client);
  const { quotes, apiKeyConfigured, isLoading: quotesLoading, error: quoteError, refetch, isFetching } = useInvestmentQuotes(client, positions.length > 0);
  const savePosition = useSaveInvestmentPosition(client, userId);
  const deletePosition = useDeleteInvestmentPosition(client);
  const [assetType, setAssetType] = useState<InvestmentAssetType>("stock");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [averagePrice, setAveragePrice] = useState("0");
  const [filter, setFilter] = useState<Filter>("all");
  const [removing, setRemoving] = useState<InvestmentPosition | null>(null);

  const quotesByPosition = useMemo(() => new Map(quotes.map((quote) => [quote.positionId, quote])), [quotes]);
  const displayed = filter === "all" ? positions : positions.filter((position) => position.asset_type === filter);
  const totalInvested = positions.reduce((sum, position) => sum + position.quantity * position.average_price, 0);
  const pricedPositions = positions.filter((position) => quotesByPosition.get(position.id)?.price != null);
  const totalValue = pricedPositions.reduce((sum, position) => sum + position.quantity * (quotesByPosition.get(position.id)?.price ?? 0), 0);
  const profit = pricedPositions.length ? pricedPositions.reduce((sum, position) => sum + position.quantity * ((quotesByPosition.get(position.id)?.price ?? 0) - position.average_price), 0) : null;
  const currentSuggestion = assetType === "crypto" ? "Ex.: BTC" : assetType === "fii" ? "Ex.: MXRF11" : "Ex.: PETR4";

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedSymbol = symbol.trim().toUpperCase();
    const amount = Number(quantity.replace(",", "."));
    const cost = Number(averagePrice.replace(",", "."));
    if (!/^[A-Z0-9.-]{1,15}$/.test(normalizedSymbol)) {
      toast({ title: "Confira o código do ativo", description: "Use até 15 letras ou números, sem espaços.", tone: "danger" });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(cost) || cost < 0) {
      toast({ title: "Quantidade e preço precisam ser números válidos", tone: "danger" });
      return;
    }
    savePosition.mutate({ assetType, symbol: normalizedSymbol, quantity: amount, averagePrice: cost }, {
      onSuccess: () => {
        setSymbol(""); setQuantity("0"); setAveragePrice("0");
        toast({ title: `${normalizedSymbol} salvo na carteira`, tone: "success" });
      },
      onError: () => toast({ title: "Não foi possível salvar este ativo", description: "Tente novamente em instantes.", tone: "danger" }),
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg"><ChartLineIcon size={18} className="text-gold-fg" /> Investimentos</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-fg-3">Acompanhe quantidades, custo médio e variação de criptomoedas, ações e FIIs brasileiros em um só lugar.</p>
          </div>
          <Button size="sm" variant="secondary" leadingIcon={<ArrowClockwiseIcon size={15} />} loading={isFetching} disabled={!positions.length || isFetching} onClick={() => void refetch()}>Atualizar cotações</Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryCard label="Valor acompanhado" value={pricedPositions.length ? formatMoney(totalValue) : "—"} hint={positions.length ? `${pricedPositions.length} de ${positions.length} ativos com cotação` : "Adicione ativos para começar"} />
          <SummaryCard label="Custo informado" value={formatMoney(totalInvested)} hint="Quantidade × preço médio cadastrado" />
          <SummaryCard label="Variação estimada" value={profit === null ? "—" : `${profit >= 0 ? "+" : "−"}${formatMoney(Math.abs(profit))}`} hint="Só considera ativos com cotação" tone={profit === null ? undefined : profit >= 0 ? "up" : "down"} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h3 className="text-[14px] font-semibold text-fg">Adicionar à carteira</h3>
        <p className="mt-0.5 text-xs text-fg-3">Informe a quantidade e, se quiser, seu preço médio de compra.</p>
        <form onSubmit={submit} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[150px_minmax(120px,1fr)_minmax(120px,.8fr)_minmax(140px,.9fr)_auto] xl:items-end">
          <Select label="Tipo" value={assetType} onChange={(event) => setAssetType(event.target.value as InvestmentAssetType)}>
            <option value="crypto">Criptomoeda</option><option value="stock">Ação</option><option value="fii">FII</option>
          </Select>
          <Input label="Código" placeholder={currentSuggestion} value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} maxLength={15} autoCapitalize="characters" />
          <Input label="Quantidade" type="number" min="0" step={assetType === "crypto" ? "any" : "1"} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Input label="Preço médio (R$)" type="number" min="0" step="0.00000001" value={averagePrice} onChange={(event) => setAveragePrice(event.target.value)} />
          <Button type="submit" className="sm:col-span-2 xl:col-span-1" leadingIcon={<PlusIcon size={15} />} loading={savePosition.isPending} disabled={!symbol.trim() || savePosition.isPending || positions.length >= 30}>Adicionar</Button>
        </form>
        {positions.length >= 30 && <p className="mt-2 text-xs text-fg-3">A carteira atingiu o limite de 30 ativos acompanhados.</p>}
        {savePosition.isError && <Notice tone="error" className="mt-3">Não foi possível salvar. Confira se o código e os valores estão corretos.</Notice>}
      </section>

      <section className="min-w-0 rounded-xl border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
          <h3 className="flex-1 text-[14px] font-semibold text-fg">Minha carteira</h3>
          <Segmented<Filter> label="Filtrar ativos" size="sm" value={filter} onChange={setFilter} options={[
            { value: "all", label: "Todos", count: positions.length },
            { value: "crypto", label: "Cripto", count: positions.filter((p) => p.asset_type === "crypto").length },
            { value: "stock", label: "Ações", count: positions.filter((p) => p.asset_type === "stock").length },
            { value: "fii", label: "FIIs", count: positions.filter((p) => p.asset_type === "fii").length },
          ]} />
        </header>
        {error ? <Notice className="m-4" tone="error" title="Não foi possível carregar a carteira">Tente atualizar a página.</Notice> : isLoading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : !positions.length ? (
          <EmptyState icon={<CoinsIcon />} title="Sua carteira começa aqui" description="Adicione um ticker de ação ou FII, ou o símbolo de uma cripto, para começar a acompanhar." />
        ) : !displayed.length ? (
          <p className="px-5 py-8 text-center text-sm text-fg-3">Nenhum ativo nesta categoria.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {displayed.map((position) => {
              const quote = quotesByPosition.get(position.id);
              const value = quote?.price == null ? null : quote.price * position.quantity;
              const invested = position.average_price * position.quantity;
              const positionChange = value === null ? null : value - invested;
              return (
                <li key={position.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2">{position.asset_type === "crypto" ? <CoinsIcon size={18} /> : <ChartLineIcon size={18} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><strong className="text-[13.5px] text-fg">{position.symbol}</strong><Badge tone="neutral">{ASSET_LABEL[position.asset_type as InvestmentAssetType]}</Badge></div>
                    <p className="truncate text-xs text-fg-3">{quantityFormat.format(position.quantity)} unidades · custo médio {formatMoney(position.average_price)}</p>
                    {quote?.error && <p className="mt-1 text-xs text-warning">{quote.error}</p>}
                  </div>
                  <div className="min-w-[100px] text-right">
                    <p className="text-[13.5px] font-medium tabular-nums text-fg">{quote?.price == null ? "—" : formatMoney(quote.price)}</p>
                    <p className="text-xs tabular-nums text-fg-3">{quote?.changePercent == null ? "Cotação indisponível" : `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2).replace(".", ",")}% hoje`}</p>
                  </div>
                  <div className="min-w-[104px] text-right">
                    <p className="text-[13.5px] font-medium tabular-nums text-fg">{formatMoney(value)}</p>
                    <p className={positionChange == null ? "text-xs text-fg-4" : `text-xs tabular-nums ${positionChange >= 0 ? "text-success" : "text-danger"}`}>{positionChange == null ? "Valor da posição" : `${positionChange >= 0 ? "+" : "−"}${formatMoney(Math.abs(positionChange))}`}</p>
                  </div>
                  <Button variant="ghost" size="xs" aria-label={`Remover ${position.symbol}`} leadingIcon={<TrashIcon size={14} />} onClick={() => setRemoving(position)} />
                </li>
              );
            })}
          </ul>
        )}
        {quoteError && <Notice className="m-4" tone="warning" title="Cotações indisponíveis">Atualize novamente mais tarde. A carteira continua salva.</Notice>}
        {positions.length > 0 && !apiKeyConfigured && !quotesLoading && (
          <div className="border-t border-line-soft px-4 py-3 text-xs leading-relaxed text-fg-3 sm:px-5">
            Algumas cotações precisam de uma chave da brapi.dev. O Dono pode configurá-la em Central do Dono › Integrações como <code className="rounded bg-hover px-1 py-0.5">brapi_api_key</code>. Preços e variações são informativos; confirme os dados na sua corretora.
          </div>
        )}
        {quotes.some((quote) => quote.asOf) && <p className="border-t border-line-soft px-4 py-2 text-[11px] text-fg-4 sm:px-5">Última cotação recebida: {dateTime.format(new Date(quotes.reduce((latest, quote) => !quote.asOf || quote.asOf > latest ? latest : quote.asOf, "1970-01-01T00:00:00.000Z")))} · Fonte: brapi.dev</p>}
      </section>

      <ConfirmDialog isOpen={Boolean(removing)} title={removing ? `Remover ${removing.symbol} da carteira?` : "Remover ativo"} description="O ativo e os valores cadastrados serão removidos da sua carteira." confirmLabel="Remover" destructive onCancel={() => setRemoving(null)} onConfirm={() => { if (removing) deletePosition.mutate(removing.id, { onSuccess: () => toast({ title: `${removing.symbol} removido`, tone: "success" }), onError: () => toast({ title: "Não foi possível remover o ativo", tone: "danger" }) }); setRemoving(null); }} />
    </div>
  );
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "up" | "down" }) {
  const Icon = tone === "up" ? ArrowUpIcon : tone === "down" ? ArrowDownIcon : null;
  return (
    <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/40 px-3.5 py-3">
      <p className="text-xs text-fg-3">{label}</p>
      <p className={`mt-1 flex items-center gap-1 font-display text-xl font-semibold tabular-nums ${tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-fg"}`}>
        {Icon && <Icon size={15} weight="bold" />}{value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-fg-4">{hint}</p>
    </div>
  );
}
