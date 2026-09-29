import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowClockwiseIcon, CheckCircleIcon, CrownIcon } from "@phosphor-icons/react";
import { useAuth, useProfile } from "@qqorvex/auth";
import { Badge, Button, ExternalButtonLink, IconButton, Notice, PageContainer, PageHeader, ProgressBar, Segmented, cx } from "@qqorvex/ui";
import { BILLING_PLANS, currentBillingMonthSaoPaulo, type BillingPeriod } from "../billing/plans";
import { hasPlusEntitlement } from "../billing/entitlements";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type Subscription = {
  billing_period: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  plan_key: string;
  provider: string;
  status: string;
};

type BillingSnapshot = {
  subscription: Subscription | null;
  vexResponses: number;
  webSearches: number;
  activeGoals: number;
  activeHabits: number;
  notebooks: number;
  mindMaps: number;
  documentStorageBytes: number;
  documentStorageQuotaBytes: number;
};

const EMPTY_SNAPSHOT: BillingSnapshot = {
  subscription: null,
  vexResponses: 0,
  webSearches: 0,
  activeGoals: 0,
  activeHabits: 0,
  notebooks: 0,
  mindMaps: 0,
  documentStorageBytes: 0,
  documentStorageQuotaBytes: BILLING_PLANS.free.documentStorageBytes,
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function getCheckoutNotice(value: string | null): { tone: "success" | "info"; text: string } | null {
  if (value === "success") return { tone: "success", text: "Você voltou do checkout. O acesso Plus só será liberado quando a confirmação assinada da Stripe chegar ao servidor." };
  if (value === "cancelled") return { tone: "info", text: "O checkout foi fechado e nenhuma alteração foi feita no seu plano." };
  if (value === "portal_return") return { tone: "info", text: "Você voltou do portal de cobrança. Estamos atualizando o status da assinatura." };
  return null;
}

export function AssinaturaPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { profile } = useProfile(supabase, userId);
  const isOwner = profile?.role === "dono";
  usePageMeta({ title: "Plano e assinatura" });
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const [checkoutOutcome, setCheckoutOutcome] = useState<string | null>(null);
  const checkoutNotice = useMemo(() => getCheckoutNotice(checkoutOutcome), [checkoutOutcome]);
  const billingChannel = import.meta.env.VITE_BILLING_CHANNEL ?? "disabled";
  const isPlayBuild = billingChannel === "play";
  const isDirectApk = billingChannel === "direct_apk";
  const stripeCheckoutEnabled = billingChannel === "web";
  const directApkNative = isDirectApk && isTauri();
  const stripeActionsEnabled = stripeCheckoutEnabled || directApkNative;
  const [snapshot, setSnapshot] = useState<BillingSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [externalFlow, setExternalFlow] = useState<"checkout" | "portal" | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    const monthStart = currentBillingMonthSaoPaulo();
    const [subscription, usage, goals, habits, notebooks, maps, documentStorage] = await Promise.all([
      supabase.from("billing_subscriptions").select("billing_period,cancel_at_period_end,current_period_end,plan_key,provider,status").eq("user_id", userId).maybeSingle(),
      supabase.from("billing_usage_monthly").select("vex_ai_responses,vex_web_searches").eq("user_id", userId).eq("month_start", monthStart).maybeSingle(),
      supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ativa"),
      supabase.from("habits").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ativo"),
      supabase.from("notebooks").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "arquivado"),
      supabase.from("pages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("page_type", "mapa_mental").eq("is_archived", false),
      supabase.rpc("get_my_document_storage_quota"),
    ]);
    const queryError = subscription.error ?? usage.error ?? goals.error ?? habits.error ?? notebooks.error ?? maps.error ?? documentStorage.error;
    if (queryError) {
      setLoadError("Ainda não foi possível consultar os dados do plano. Se este preview acabou de ser atualizado, a migração de cobrança pode ainda não ter sido aplicada no Supabase.");
      setLoading(false);
      return;
    }
    setSnapshot({
      subscription: subscription.data,
      vexResponses: usage.data?.vex_ai_responses ?? 0,
      webSearches: usage.data?.vex_web_searches ?? 0,
      activeGoals: goals.count ?? 0,
      activeHabits: habits.count ?? 0,
      notebooks: notebooks.count ?? 0,
      mindMaps: maps.count ?? 0,
      documentStorageBytes: Number(documentStorage.data?.[0]?.used_bytes ?? 0),
      documentStorageQuotaBytes: Number(documentStorage.data?.[0]?.quota_bytes ?? BILLING_PLANS.free.documentStorageBytes),
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!checkoutStatus) return;
    setCheckoutOutcome(checkoutStatus);
    setExternalFlow(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("checkout");
    setSearchParams(nextParams, { replace: true });
  }, [checkoutStatus, searchParams, setSearchParams]);

  useEffect(() => {
    if (checkoutOutcome !== "success" && checkoutOutcome !== "portal_return") return;
    const intervalId = window.setInterval(() => { void refresh(); }, 2_500);
    const timeoutId = window.setTimeout(() => window.clearInterval(intervalId), 25_000);
    return () => { window.clearInterval(intervalId); window.clearTimeout(timeoutId); };
  }, [checkoutOutcome, refresh]);

  const subscription = snapshot.subscription;
  const hasPlus = hasPlusEntitlement(subscription, Date.now(), isOwner);
  const monthLimit = hasPlus ? BILLING_PLANS.plus.vexInteractions : BILLING_PLANS.free.vexInteractions;
  const searchLimit = hasPlus ? BILLING_PLANS.plus.webSearches : BILLING_PLANS.free.webSearches;
  const annualSavings = useMemo(
    () => BILLING_PLANS.plus.monthlyPrice * 12 - BILLING_PLANS.plus.annualPrice,
    [],
  );

  async function beginCheckout() {
    setBusy(true);
    setActionError(null);
    setExternalFlow(null);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("billing-checkout", {
      body: { billingPeriod: period, returnTarget: directApkNative ? "app" : "web" },
    });
    if (error || !data?.url) {
      setActionError(data?.error ?? error?.message ?? "Não foi possível iniciar o checkout.");
      setBusy(false);
      return;
    }
    if (directApkNative) {
      try {
        await openUrl(data.url);
        setExternalFlow("checkout");
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : "Não foi possível abrir o Checkout no navegador.");
      } finally {
        setBusy(false);
      }
      return;
    }
    window.location.assign(data.url);
  }

  async function openBillingPortal() {
    setBusy(true);
    setActionError(null);
    setExternalFlow(null);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("billing-portal", {
      body: { returnTarget: directApkNative ? "app" : "web" },
    });
    if (error || !data?.url) {
      setActionError(data?.error ?? error?.message ?? "Não foi possível abrir o gerenciamento da assinatura.");
      setBusy(false);
      return;
    }
    if (directApkNative) {
      try {
        await openUrl(data.url);
        setExternalFlow("portal");
      } catch (caught) {
        setActionError(caught instanceof Error ? caught.message : "Não foi possível abrir o portal Stripe no navegador.");
      } finally {
        setBusy(false);
      }
      return;
    }
    window.location.assign(data.url);
  }

  const statusText = !hasPlus ? "Plano Free" : isOwner && !subscription ? "Plus permanente · Dono" : subscription?.cancel_at_period_end ? "Plus · cancelamento agendado" : "Qqorvex Plus ativo";
  const price = period === "monthly" ? BILLING_PLANS.plus.monthlyPrice : BILLING_PLANS.plus.annualPrice;
  const nearLimit = !hasPlus && !loading && (snapshot.vexResponses / monthLimit >= 0.8 || snapshot.activeGoals >= BILLING_PLANS.free.goals || snapshot.activeHabits >= BILLING_PLANS.free.habits);

  let plusAction: ReactNode;
  if (isOwner && !subscription) plusAction = <Button variant="secondary" disabled fullWidth>Plus permanente da conta Dono</Button>;
  else if (hasPlus && subscription?.provider === "stripe" && stripeActionsEnabled) plusAction = <Button variant="secondary" fullWidth loading={busy} onClick={() => void openBillingPortal()}>{directApkNative ? "Gerenciar no navegador" : "Gerenciar assinatura"}</Button>;
  else if (hasPlus && subscription?.provider === "stripe") plusAction = <Button variant="secondary" disabled fullWidth>Gerencie pelo site</Button>;
  else if (hasPlus && subscription?.provider === "google_play") plusAction = <ExternalButtonLink href="https://play.google.com/store/account/subscriptions" variant="secondary" fullWidth>Gerenciar na Google Play</ExternalButtonLink>;
  else if (hasPlus) plusAction = <Button variant="secondary" disabled fullWidth>Seu plano atual</Button>;
  else if (isPlayBuild) plusAction = <Button disabled fullWidth>Em breve pela Google Play</Button>;
  else if (isDirectApk && !directApkNative) plusAction = <Button disabled fullWidth>Disponível no app instalado</Button>;
  else if (!stripeActionsEnabled) plusAction = <Button disabled fullWidth>Assinaturas indisponíveis nesta versão</Button>;
  else plusAction = <Button fullWidth leadingIcon={<CrownIcon size={16} weight="fill" />} loading={busy} disabled={loading} onClick={() => void beginCheckout()}>{`Assinar por ${money.format(price)}`}</Button>;

  return (
    <PageContainer>
      <PageHeader
        title="Plano e assinatura"
        description="Todos os módulos são seus no Free. O Plus amplia limites e o uso da Vex."
        actions={
          <>
            <Badge tone={hasPlus ? "gold" : "neutral"}>{statusText}</Badge>
            <IconButton label="Atualizar status do plano" onClick={() => void refresh()}>
              <ArrowClockwiseIcon />
            </IconButton>
          </>
        }
      />

      {checkoutNotice && <Notice tone={checkoutNotice.tone} title={checkoutNotice.tone === "success" ? "Pagamento recebido" : "Checkout fechado"}>{checkoutNotice.text}</Notice>}
      {externalFlow && <Notice tone="info" title={externalFlow === "checkout" ? "Checkout aberto no navegador" : "Portal aberto no navegador"}>{externalFlow === "checkout" ? "Conclua ou cancele o pagamento no navegador. Ao voltar, o Qqorvex confere a confirmação." : "Gerencie ou cancele a assinatura no portal e volte para atualizar o status."}</Notice>}
      {loadError && <Notice tone="warning" title="Status do plano indisponível">{loadError}</Notice>}
      {actionError && <Notice title="Não foi possível continuar">{actionError}</Notice>}
      {isPlayBuild && <Notice tone="info" title="Compras pela Google Play em breve">Sua conta e seus dados continuam intactos enquanto a cobrança pela loja é ativada.</Notice>}
      {isDirectApk && !directApkNative && <Notice tone="info" title="Assine pelo app instalado">O checkout desta versão abre a partir do aplicativo instalado.</Notice>}
      {billingChannel === "disabled" && import.meta.env.DEV && <Notice tone="info" title="Canal de cobrança não configurado">Defina VITE_BILLING_CHANNEL=web (site) ou direct_apk (APK) para habilitar o checkout.</Notice>}
      {nearLimit && <Notice tone="warning" title="Você está perto dos limites do Free">O Plus libera metas, hábitos e cadernos ilimitados e 6× mais conversas com a Vex.</Notice>}

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="usage-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="usage-title" className="text-[15px] font-semibold text-fg">Seu uso neste mês</h2>
          <span className="text-xs text-fg-3">Reinicia no dia 1º, horário de Brasília</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <UsageMeter label="Conversas com a Vex" used={snapshot.vexResponses} limit={monthLimit} loading={loading} />
          <UsageMeter label="Buscas na internet" used={snapshot.webSearches} limit={searchLimit} loading={loading} />
          <UsageMeter label="Armazenamento" used={snapshot.documentStorageBytes} limit={snapshot.documentStorageQuotaBytes} loading={loading} format={formatStorage} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Count label="Metas ativas" used={snapshot.activeGoals} limit={hasPlus ? null : BILLING_PLANS.free.goals} loading={loading} />
          <Count label="Hábitos ativos" used={snapshot.activeHabits} limit={hasPlus ? null : BILLING_PLANS.free.habits} loading={loading} />
          <Count label="Cadernos" used={snapshot.notebooks} limit={hasPlus ? null : BILLING_PLANS.free.notebooks} loading={loading} />
          <Count label="Mapas mentais" used={snapshot.mindMaps} limit={hasPlus ? null : BILLING_PLANS.free.mindMaps} loading={loading} />
        </div>
        <p className="text-xs leading-relaxed text-fg-3">Uma mensagem à Vex pode usar mais de uma interação quando ela executa uma ação. O armazenamento inclui versões anteriores e a lixeira.</p>
      </section>

      <section className="flex flex-col gap-4" aria-label="Planos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-fg">Planos</h2>
          <Segmented<BillingPeriod>
            label="Periodicidade"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "monthly", label: "Mensal" },
              { value: "annual", label: `Anual · economize ${money.format(annualSavings)}` },
            ]}
          />
        </div>
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <article className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-[22px] font-semibold text-fg">Free</h3>
                <p className="mt-1 text-[13px] text-fg-3">O essencial, com todos os módulos.</p>
              </div>
              {!hasPlus && <Badge tone="neutral">Seu plano</Badge>}
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-[32px] font-semibold leading-none text-fg">{money.format(0)}</span>
              <span className="text-sm text-fg-3">para sempre</span>
            </p>
            <ul className="flex flex-col gap-2.5 text-[13.5px] text-fg-2">
              <Feature>Todos os módulos do Qqorvex</Feature>
              <Feature>{BILLING_PLANS.free.goals} metas e {BILLING_PLANS.free.habits} hábitos ativos</Feature>
              <Feature>{BILLING_PLANS.free.notebooks} cadernos e {BILLING_PLANS.free.mindMaps} mapas mentais</Feature>
              <Feature>{BILLING_PLANS.free.vexInteractions} conversas com a Vex por mês</Feature>
              <Feature>{BILLING_PLANS.free.webSearches} buscas na internet por mês</Feature>
              <Feature>{formatStorage(BILLING_PLANS.free.documentStorageBytes)} na nuvem · arquivos de até {formatStorage(BILLING_PLANS.free.maxDocumentFileBytes)}</Feature>
            </ul>
          </article>

          <article className="relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-xl border border-gold-line bg-[linear-gradient(160deg,var(--q-gold-soft),var(--q-surface)_60%)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-display text-[22px] font-semibold text-fg">
                  <CrownIcon size={22} weight="fill" className="text-gold-fg" /> Plus
                </h3>
                <p className="mt-1 text-[13px] text-fg-3">Sem limites para a sua rotina.</p>
              </div>
              {hasPlus ? <Badge tone="gold">Seu plano</Badge> : <Badge tone="gold">Recomendado</Badge>}
            </div>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-display text-[32px] font-semibold leading-none text-fg">{money.format(price)}</span>
              <span className="text-sm text-fg-3">/ {period === "monthly" ? "mês" : "ano"}</span>
              {period === "annual" && <span className="w-full pt-1 text-xs text-gold-fg">equivale a {money.format(BILLING_PLANS.plus.annualPrice / 12)} por mês</span>}
            </p>
            <ul className="flex flex-col gap-2.5 text-[13.5px] text-fg-2">
              <Feature gold>Metas, hábitos, cadernos e mapas mentais ilimitados</Feature>
              <Feature gold>{BILLING_PLANS.plus.vexInteractions} conversas com a Vex por mês</Feature>
              <Feature gold>{BILLING_PLANS.plus.webSearches} buscas na internet por mês</Feature>
              <Feature gold>{formatStorage(BILLING_PLANS.plus.documentStorageBytes)} na nuvem · arquivos de até {formatStorage(BILLING_PLANS.plus.maxDocumentFileBytes)}</Feature>
              <Feature gold>Cor de destaque exclusiva Coroa Vex e selos de fidelidade</Feature>
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              {hasPlus && subscription?.current_period_end && (
                <p className="text-xs text-fg-3">
                  {subscription.cancel_at_period_end ? "Acesso até " : "Renova em "}
                  {dateFormat.format(new Date(subscription.current_period_end))}.
                </p>
              )}
              {plusAction}
              <p className="text-[11px] leading-relaxed text-fg-3">Pagamento recorrente e seguro. Cancele quando quiser; o acesso continua até o fim do período pago.</p>
            </div>
          </article>
        </div>
      </section>

      <p className="text-center text-xs leading-relaxed text-fg-3">
        {isOwner ? "O benefício Plus da conta Dono permanece ativo sem cobrança." : "Seus dados são seus. Se o Plus terminar, você continua consultando, editando e exportando tudo; só novas criações acima dos limites do Free ficam bloqueadas."}
      </p>
    </PageContainer>
  );
}

function Feature({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircleIcon size={17} weight="fill" className={cx("mt-0.5 shrink-0", gold ? "text-gold-fg" : "text-fg-4")} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function formatStorage(bytes: number): string {
  if (bytes > 0 && bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

function UsageMeter({ label, used, limit, loading, format = (value) => value.toLocaleString("pt-BR") }: { label: string; used: number; limit: number; loading: boolean; format?: (value: number) => string }) {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-fg-2">{label}</span>
        <span className="text-[13px] tabular-nums text-fg">{loading ? "—" : `${format(used)} / ${format(limit)}`}</span>
      </div>
      <ProgressBar value={loading ? 0 : percentage} tone={percentage >= 90 ? "danger" : percentage >= 75 ? "warning" : "gold"} height={6} label={`${label}: ${format(used)} de ${format(limit)}`} />
    </div>
  );
}

function Count({ label, used, limit, loading }: { label: string; used: number; limit: number | null; loading: boolean }) {
  const full = limit !== null && used >= limit;
  return (
    <div className={cx("rounded-lg border px-3 py-2.5", full ? "border-warning/40 bg-warning-soft" : "border-line-soft bg-canvas/40")}>
      <span className="block text-xs text-fg-3">{label}</span>
      <strong className="mt-0.5 block text-[15px] font-semibold tabular-nums text-fg">
        {loading ? "—" : used}
        {!loading && <span className="text-xs font-normal text-fg-3">{limit === null ? " · ilimitado" : ` de ${limit}`}</span>}
      </strong>
    </div>
  );
}
