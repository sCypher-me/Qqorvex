import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowClockwiseIcon, CheckCircleIcon, CrownIcon, SparkleIcon } from "@phosphor-icons/react";
import { useAuth, useProfile } from "@qqorvex/auth";
import { Badge, Button, Notice, ProgressBar } from "@qqorvex/ui";
import { BILLING_PLANS, currentBillingMonthSaoPaulo, type BillingPeriod } from "../billing/plans";
import { hasPlusEntitlement } from "../billing/entitlements";
import { supabase } from "../app/supabase";

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

  return (
    <div className="qv-page mx-auto flex w-full max-w-[1120px] flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="qv-eyebrow">SEU ESPAÇO, NO SEU RITMO</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-.045em] text-text-primary sm:text-4xl">Planos e assinatura</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">Todos os módulos continuam acessíveis no Free. O Plus amplia seus limites e o uso da Vex.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge tone={hasPlus ? "premium" : "neutral"}>{statusText}</Badge>
          <Button type="button" variant="quiet" size="xs" onClick={() => void refresh()} aria-label="Atualizar status do plano"><ArrowClockwiseIcon size={17} /></Button>
        </div>
      </header>

      {checkoutNotice && <Notice tone={checkoutNotice.tone} title={checkoutNotice.tone === "success" ? "Retorno do checkout" : "Checkout cancelado"}>{checkoutNotice.text}</Notice>}
      {externalFlow && <Notice tone="info" title={externalFlow === "checkout" ? "Checkout aberto no navegador" : "Portal Stripe aberto no navegador"}>{externalFlow === "checkout" ? "Conclua ou cancele o pagamento no navegador. Ao voltar ao Qqorvex, o app consultará a confirmação enviada pelo webhook." : "Gerencie ou cancele sua assinatura no portal. Depois, volte ao Qqorvex para atualizar o status."}</Notice>}
      {loadError && <Notice tone="warning" title="Status do plano indisponível">{loadError}</Notice>}
      {actionError && <Notice tone="error" title="Não foi possível continuar">{actionError}</Notice>}
      {isPlayBuild && <Notice tone="info" title="Cobrança pela Google Play ainda não foi ativada">Esta versão está configurada para a Play Store. As compras só serão habilitadas após integrar Play Billing e validar recibos no servidor. Sua conta e seus dados permanecem intactos.</Notice>}
      {isDirectApk && !directApkNative && <Notice tone="info" title="Use o APK instalado para assinar">O checkout externo e o retorno por link do app só ficam disponíveis no APK direto; este preview web não inicia essa compra.</Notice>}
      {directApkNative && <Notice tone="info" title="Pagamento seguro no navegador">O Qqorvex abrirá o Stripe no navegador do sistema e retornará ao app. O plano só muda após confirmação do webhook.</Notice>}
      {billingChannel === "disabled" && <Notice tone="info" title="Canal de cobrança não configurado">Configure VITE_BILLING_CHANNEL=web para a versão web ou direct_apk para o APK distribuído diretamente.</Notice>}

      <section className="grid min-w-0 gap-4 lg:grid-cols-2" aria-label="Planos disponíveis">
        <article className="qv-card flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="qv-eyebrow">PARA COMEÇAR</p><h2 className="mt-1 font-display text-2xl font-semibold text-text-primary">Free</h2></div>
            {!hasPlus && <Badge tone="info">Seu plano atual</Badge>}
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">O essencial para organizar sua vida com acesso a todos os módulos principais.</p>
          <ul className="flex flex-col gap-3 text-sm text-text-secondary">
            <Feature>Todos os módulos centrais do Qqorvex</Feature>
            <Feature>{BILLING_PLANS.free.goals} metas ativas e {BILLING_PLANS.free.habits} hábitos ativos</Feature>
            <Feature>{BILLING_PLANS.free.notebooks} cadernos e {BILLING_PLANS.free.mindMaps} mapas mentais</Feature>
            <Feature>{BILLING_PLANS.free.vexInteractions} interações de texto com a Vex por mês</Feature>
            <Feature>{BILLING_PLANS.free.webSearches} buscas na internet por mês</Feature>
            <Feature>{formatStorage(BILLING_PLANS.free.documentStorageBytes)} de armazenamento na nuvem · arquivo de até {formatStorage(BILLING_PLANS.free.maxDocumentFileBytes)}</Feature>
          </ul>
          <div className="mt-auto border-t border-border pt-4 text-xs leading-relaxed text-text-muted">Continuar no Free não remove seus conteúdos. Mesmo após um cancelamento, seus dados continuam acessíveis.</div>
        </article>

        <article className="qv-card relative flex min-w-0 flex-col gap-5 overflow-hidden border-vex-gold-muted/50 p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vex-gold-bright/70 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div><p className="qv-eyebrow text-vex-gold-bright">MAIS ESPAÇO PARA SUA ROTINA</p><h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-text-primary"><CrownIcon size={23} className="text-vex-gold-bright" /> Qqorvex Plus</h2></div>
            {hasPlus && <Badge tone="premium">Seu plano atual</Badge>}
          </div>
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="font-display text-4xl font-bold tracking-[-.04em] text-text-primary">{money.format(period === "monthly" ? BILLING_PLANS.plus.monthlyPrice : BILLING_PLANS.plus.annualPrice)}</span>
            <span className="pb-1 text-sm text-text-muted">/ {period === "monthly" ? "mês" : "ano"}</span>
            {period === "annual" && <Badge tone="premium">Economize {money.format(annualSavings)} por ano</Badge>}
          </div>
          <div className="flex w-fit rounded-xl border border-border bg-surface-1 p-1" role="group" aria-label="Periodicidade da assinatura">
            <button type="button" aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${period === "monthly" ? "bg-surface-3 text-text-primary" : "text-text-muted hover:text-text-primary"}`}>Mensal</button>
            <button type="button" aria-pressed={period === "annual"} onClick={() => setPeriod("annual")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${period === "annual" ? "bg-surface-3 text-text-primary" : "text-text-muted hover:text-text-primary"}`}>Anual · 10% off</button>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-text-secondary">
            <Feature>Metas, hábitos, cadernos e mapas mentais ilimitados</Feature>
            <Feature>{BILLING_PLANS.plus.vexInteractions} interações de texto com a Vex por mês</Feature>
            <Feature>{BILLING_PLANS.plus.webSearches} buscas na internet por mês</Feature>
            <Feature>{formatStorage(BILLING_PLANS.plus.documentStorageBytes)} de armazenamento na nuvem · arquivo de até {formatStorage(BILLING_PLANS.plus.maxDocumentFileBytes)}</Feature>
            <Feature>{isOwner && !subscription ? "Benefício Plus permanente da conta Dono · sem cobrança ou renovação" : isPlayBuild ? "Cobrança pela Google Play (integração ainda não habilitada)" : isDirectApk ? "Checkout no navegador externo, com retorno ao app" : stripeCheckoutEnabled ? "Assinatura gerenciada com segurança pela Stripe" : "Checkout Stripe disponível na versão web"}</Feature>
          </ul>
          {isOwner && !subscription && <p className="text-xs leading-relaxed text-text-muted">Sua conta de Dono tem acesso Plus permanente. Esse benefício não cria uma assinatura Stripe nem exige método de pagamento.</p>}
          {hasPlus && subscription?.current_period_end && <p className="text-xs text-text-muted">{subscription.cancel_at_period_end ? "Acesso disponível até " : "Próxima renovação em "}{dateFormat.format(new Date(subscription.current_period_end))}.</p>}
          {isOwner && !subscription ? (
            <Button type="button" variant="secondary" disabled className="mt-auto">Plus permanente da conta Dono</Button>
          ) : hasPlus && subscription?.provider === "stripe" && stripeActionsEnabled ? (
            <Button type="button" variant="premium" onClick={() => void openBillingPortal()} disabled={busy} className="mt-auto">{busy ? "Abrindo…" : directApkNative ? "Gerenciar no navegador" : "Gerenciar assinatura"}</Button>
          ) : hasPlus && subscription?.provider === "stripe" ? (
            <Button type="button" variant="secondary" disabled className="mt-auto">Gerenciamento pelo site</Button>
          ) : hasPlus && subscription?.provider === "google_play" ? (
            <a className="qv-btn qv-btn-secondary mt-auto justify-center" href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noreferrer">Gerenciar na Google Play</a>
          ) : isPlayBuild ? (
            <Button type="button" variant="premium" disabled className="mt-auto">Play Billing em configuração</Button>
          ) : isDirectApk && !directApkNative ? (
            <Button type="button" variant="premium" disabled className="mt-auto">Disponível no APK direto</Button>
          ) : !stripeActionsEnabled ? (
            <Button type="button" variant="premium" disabled className="mt-auto">Canal de cobrança não configurado</Button>
          ) : (
            <Button type="button" variant="premium" onClick={() => void beginCheckout()} disabled={busy || loading} className="mt-auto">{busy ? "Preparando checkout…" : `Assinar por ${money.format(period === "monthly" ? BILLING_PLANS.plus.monthlyPrice : BILLING_PLANS.plus.annualPrice)}`}</Button>
          )}
          <p className="text-[11px] leading-relaxed text-text-muted">Pagamento recorrente. Você pode gerenciar ou cancelar a assinatura no portal de cobrança; o acesso pago permanece até o fim do período quitado.</p>
        </article>
      </section>

      <section className="qv-card flex flex-col gap-5 p-5 sm:p-6" aria-labelledby="billing-usage-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="qv-eyebrow">ACOMPANHAMENTO</p><h2 id="billing-usage-title" className="mt-1 font-display text-xl font-semibold text-text-primary">Seu uso neste mês</h2></div>
          <span className="text-xs text-text-muted">Reinicia no primeiro dia do mês, no horário de Brasília</span>
        </div>
        <p className="-mt-2 text-xs leading-relaxed text-text-muted">A Vex é uma assistente de texto. Uma mensagem pode consumir mais de uma chamada se ela precisar executar uma ação; buscas na internet usam uma cota separada.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <UsageMeter label="Interações de texto com a Vex" used={snapshot.vexResponses} limit={monthLimit} loading={loading} />
          <UsageMeter label="Buscas na internet" used={snapshot.webSearches} limit={searchLimit} loading={loading} />
        </div>
        <StorageMeter used={snapshot.documentStorageBytes} limit={snapshot.documentStorageQuotaBytes} loading={loading} />
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <Count label="Metas ativas" used={snapshot.activeGoals} limit={hasPlus ? null : BILLING_PLANS.free.goals} loading={loading} />
          <Count label="Hábitos ativos" used={snapshot.activeHabits} limit={hasPlus ? null : BILLING_PLANS.free.habits} loading={loading} />
          <Count label="Cadernos" used={snapshot.notebooks} limit={hasPlus ? null : BILLING_PLANS.free.notebooks} loading={loading} />
          <Count label="Mapas mentais" used={snapshot.mindMaps} limit={hasPlus ? null : BILLING_PLANS.free.mindMaps} loading={loading} />
        </div>
      </section>

      <p className="text-center text-xs leading-relaxed text-text-muted">{isOwner ? "O benefício Plus da conta Dono permanece ativo sem cobrança." : "Seus dados são seus. Se o Plus terminar, você continua podendo consultar, editar e exportar o que criou; apenas novas criações acima dos limites do Free ficam bloqueadas."}</p>
    </div>
  );
}

function Feature({ children }: { children: ReactNode }) {
  return <li className="flex items-start gap-2.5"><CheckCircleIcon size={17} weight="fill" className="mt-0.5 shrink-0 text-success" aria-hidden="true" /><span>{children}</span></li>;
}

function formatStorage(bytes: number): string {
  if (bytes > 0 && bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

function StorageMeter({ used, limit, loading }: { used: number; limit: number; loading: boolean }) {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return <div className="flex flex-col gap-2 border-t border-border pt-4">
    <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">Armazenamento na nuvem</span><span className="font-mono text-text-primary">{loading ? "—" : `${formatStorage(used)} / ${formatStorage(limit)}`}</span></div>
    <ProgressBar value={loading ? 0 : percentage} tone={percentage >= 90 ? "gold" : "cyan"} height={6} aria-label={`Armazenamento na nuvem: ${formatStorage(used)} de ${formatStorage(limit)}`} />
    <span className="text-xs text-text-muted">O uso inclui documentos, versões anteriores e itens ainda na lixeira.</span>
  </div>;
}

function UsageMeter({ label, used, limit, loading }: { label: string; used: number; limit: number; loading: boolean }) {
  const percentage = Math.min(100, (used / limit) * 100);
  return <div className="flex flex-col gap-2">
    <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">{label}</span><span className="font-mono text-text-primary">{loading ? "—" : `${used} / ${limit}`}</span></div>
    <ProgressBar value={loading ? 0 : percentage} tone={percentage >= 90 ? "gold" : "cyan"} height={6} aria-label={`${label}: ${used} de ${limit}`} />
  </div>;
}

function Count({ label, used, limit, loading }: { label: string; used: number; limit: number | null; loading: boolean }) {
  return <div className="rounded-xl border border-border bg-surface-1 p-3">
    <span className="block text-[11px] text-text-muted">{label}</span>
    <strong className="mt-1 block font-mono text-base text-text-primary">{loading ? "—" : `${used}${limit === null ? "" : ` / ${limit}`}`}</strong>
  </div>;
}
