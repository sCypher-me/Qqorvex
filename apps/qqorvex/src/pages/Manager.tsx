import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRightIcon, CopyIcon, KeyIcon, MagnifyingGlassIcon, TicketIcon, UsersIcon } from "@phosphor-icons/react";
import { useAuth, useProfile } from "@qqorvex/auth";
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Notice, PageContainer, PageHeader, Select, SkeletonCards, SkeletonList, Tabs, useToast, type BadgeTone } from "@qqorvex/ui";
import {
  useAllAccounts,
  useCreatePartnerCampaign,
  useCreateRedemptionCode,
  useDeleteAccount,
  usePartnerCampaigns,
  useRedemptionCodes,
  useSecretKeys,
  useSetSecret,
  useSystemOverview,
  useUpdatePartnerCampaignEnd,
  type AccountTier,
  type PartnerCampaign,
} from "@qqorvex/module-manager";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

const TIER_LABEL: Record<AccountTier, string> = { padrao: "Padrão", parceiro: "Parceiro", lifetime: "Lifetime", vip: "VIP" };
const TIER_TONE: Record<AccountTier, BadgeTone> = { padrao: "neutral", parceiro: "info", lifetime: "gold", vip: "gold" };

type ManagerTab = "visao-geral" | "contas" | "codigos" | "config";

const TABS: ManagerTab[] = ["visao-geral", "contas", "codigos", "config"];

function Panel({ title, description, aside, children, className = "" }: { title: string; description?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-3">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Diferencia "não tem nada cadastrado" de "não consegui buscar" — sem isso, uma falha de rede
 * parece silenciosamente uma lista vazia, o que é enganoso numa tela de administração. */
function SectionError({ what }: { what: string }) {
  return (
    <Notice title={`Não foi possível carregar ${what}`}>
      Os dados continuam existindo — só a busca falhou. Recarregue a página para tentar de novo.
    </Notice>
  );
}

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Painel Manager — só existe pro Dono. Protegido em duas camadas: `Sidebar` só mostra o link
 * quando `profile.role === 'dono'` (ver `navigation.ts`), e cada consulta/RPC aqui é restrita por
 * `is_owner()` no banco (RLS/SECURITY DEFINER) — um usuário comum que chegasse na rota veria só
 * listas vazias, nunca dado de outra conta.
 */
export function ManagerPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { profile, isLoading: profileLoading } = useProfile(supabase, userId);
  usePageMeta({ title: "Central do Dono" });
  const [params, setParams] = useSearchParams();
  const tab: ManagerTab = TABS.includes(params.get("aba") as ManagerTab) ? (params.get("aba") as ManagerTab) : "visao-geral";
  const setTab = (next: ManagerTab) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === "visao-geral") copy.delete("aba");
        else copy.set("aba", next);
        return copy;
      },
      { replace: true },
    );

  if (profileLoading) {
    return (
      <PageContainer>
        <SkeletonCards count={3} className="h-28 rounded-xl" />
      </PageContainer>
    );
  }

  if (!profile || profile.role !== "dono") {
    return (
      <PageContainer>
        <PageHeader title="Central do Dono" />
        <Notice tone="warning" title="Acesso exclusivo ao Dono">
          Esta conta não tem permissão para abrir a Central do Dono.
        </Notice>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Central do Dono" description="Contas, convites e configurações globais do Qqorvex." actions={<Badge tone="gold">Dono</Badge>}>
        <Tabs<ManagerTab>
          label="Seções"
          value={tab}
          onChange={setTab}
          options={[
            { value: "visao-geral", label: "Visão geral" },
            { value: "contas", label: "Contas" },
            { value: "codigos", label: "Códigos" },
            { value: "config", label: "Integrações" },
          ]}
        />
      </PageHeader>
      {tab === "visao-geral" && <OverviewSection onNavigate={setTab} />}
      {tab === "contas" && <AccountsSection currentUserId={userId} />}
      {tab === "codigos" && <CodesSection userId={userId} />}
      {tab === "config" && <SecretsSection />}
    </PageContainer>
  );
}

function OverviewSection({ onNavigate }: { onNavigate: (tab: ManagerTab) => void }) {
  const { overview, isLoading, error } = useSystemOverview(supabase);
  if (isLoading) return <Panel title="Números do sistema"><SkeletonCards count={3} className="h-20 w-full rounded-lg" /></Panel>;
  if (error) return <Panel title="Visão geral"><SectionError what="a visão geral" /></Panel>;
  if (!overview) return <Panel title="Visão geral"><EmptyState>Ainda não há dados suficientes pra mostrar aqui.</EmptyState></Panel>;

  const stats: [string, number][] = [
    ["Contas", overview.totalUsers],
    ["Tarefas", overview.totalTasks],
    ["Eventos", overview.totalEvents],
    ["Transações", overview.totalTransactions],
    ["Documentos", overview.totalDocuments],
    ["Páginas", overview.totalPages],
  ];

  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.75fr)]">
      <Panel title="Números do sistema" description="Totais de registros em todas as contas.">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1 rounded-lg border border-line-soft bg-canvas/40 px-4 py-3">
              <dt className="truncate text-xs text-fg-3">{label}</dt>
              <dd className="font-display text-[26px] font-semibold tabular-nums text-fg">{value.toLocaleString("pt-BR")}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Panel title="Atalhos">
        <ul className="-mx-4 -mb-4 flex flex-col divide-y divide-line-soft border-t border-line-soft sm:-mx-5 sm:-mb-5">
          {[
            { title: "Gerenciar contas", description: "Buscar, consultar e remover contas", tab: "contas" as const, icon: <UsersIcon /> },
            { title: "Criar código de convite", description: "Parceiro, Lifetime ou Beta Tester", tab: "codigos" as const, icon: <TicketIcon /> },
            { title: "Configurar integrações", description: "Chaves usadas pelas funções do servidor", tab: "config" as const, icon: <KeyIcon /> },
          ].map((action) => (
            <li key={action.tab}>
              <button type="button" onClick={() => onNavigate(action.tab)} className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hover text-fg-2 [&_svg]:size-[18px]">{action.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-fg">{action.title}</span>
                  <span className="block text-xs text-fg-3">{action.description}</span>
                </span>
                <ArrowRightIcon size={15} className="shrink-0 text-fg-4 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-fg" />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function AccountsSection({ currentUserId }: { currentUserId: string }) {
  const { accounts, isLoading, error } = useAllAccounts(supabase);
  const deleteAccountMutation = useDeleteAccount(supabase);
  const [confirming, setConfirming] = useState<{ id: string; email: string } | null>(null);
  const [search, setSearch] = useState("");

  if (isLoading) return <Panel title="Contas"><SkeletonList rows={4} leading /></Panel>;
  if (error) return <Panel title="Contas"><SectionError what="as contas" /></Panel>;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) =>
    !normalizedSearch || [account.displayName, account.username, account.email].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch)),
  );

  return (
    <Panel title="Contas" description="Todas as contas do Qqorvex." aside={<span className="text-xs tabular-nums text-fg-3">{normalizedSearch ? `${filteredAccounts.length} de ${accounts.length}` : `${accounts.length} no total`}</span>}>
      <Input placeholder="Buscar por nome, usuário ou e-mail" aria-label="Buscar uma conta" value={search} onChange={(event) => setSearch(event.target.value)} leadingIcon={<MagnifyingGlassIcon />} wrapperClassName="w-full sm:max-w-md" />
      {deleteAccountMutation.isError && <Notice title="Não foi possível excluir a conta">A operação falhou. A conta e os dados foram mantidos.</Notice>}
      {accounts.length === 0 ? (
        <EmptyState>Nenhuma conta cadastrada.</EmptyState>
      ) : filteredAccounts.length === 0 ? (
        <EmptyState>Nenhuma conta corresponde à busca.</EmptyState>
      ) : (
        <ul className="-mx-4 -mb-4 flex flex-col divide-y divide-line-soft border-t border-line-soft sm:-mx-5 sm:-mb-5">
          {filteredAccounts.map((account) => {
            const name = account.displayName || account.username || "Sem nome definido";
            return (
              <li key={account.id} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">
                    {name}
                    {account.username && <span className="ml-1.5 font-normal text-fg-3">@{account.username}</span>}
                  </p>
                  <p className="truncate text-xs text-fg-3">
                    {account.email} · desde {shortDate.format(new Date(account.createdAt))}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {account.role === "dono" && <Badge tone="gold">Dono</Badge>}
                  {account.id === currentUserId && <Badge tone="info">Você</Badge>}
                  <Badge tone={TIER_TONE[account.accountTier]}>{TIER_LABEL[account.accountTier]}</Badge>
                </div>
                {account.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-danger"
                    loading={deleteAccountMutation.isPending && deleteAccountMutation.variables === account.id}
                    disabled={deleteAccountMutation.isPending}
                    onClick={() => {
                      deleteAccountMutation.reset();
                      setConfirming({ id: account.id, email: account.email });
                    }}
                  >
                    Excluir
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        isOpen={confirming !== null}
        title="Excluir esta conta?"
        description={confirming ? `${confirming.email} perde o acesso e todos os dados dessa conta são apagados. Isso não pode ser desfeito.` : ""}
        confirmLabel="Excluir conta"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) deleteAccountMutation.mutate(confirming.id);
          setConfirming(null);
        }}
      />
    </Panel>
  );
}

function CodesSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { codes, isLoading, error } = useRedemptionCodes(supabase);
  const { campaigns } = usePartnerCampaigns(supabase);
  const createCode = useCreateRedemptionCode(supabase, userId);
  const [tier, setTier] = useState<"parceiro" | "lifetime" | "beta_tester">("lifetime");
  const activeCampaigns = campaigns.filter(isCampaignActive);
  const [campaignId, setCampaignId] = useState("");
  const selectedCampaignId = activeCampaigns.some((campaign) => campaign.id === campaignId) ? campaignId : (activeCampaigns[0]?.id ?? "");
  const campaignName = (id: string | null) => campaigns.find((campaign) => campaign.id === id)?.name;
  const [note, setNote] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCopyMessage(null);
    try {
      const created = await createCode.mutateAsync({ tier, note: note.trim() || undefined, campaignId: tier === "parceiro" ? selectedCampaignId : undefined });
      setLastGenerated(created.code);
      setNote("");
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Não foi possível gerar o código agora.");
    }
  }

  async function handleCopyCode() {
    if (!lastGenerated) return;
    try {
      await navigator.clipboard.writeText(lastGenerated);
      setCopyMessage("Código copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar automaticamente. Selecione o código para copiá-lo.");
    }
  }

  const pending = codes.filter((code) => !code.redeemed_by).length;

  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(300px,.7fr)_minmax(0,1.3fr)]">
      <div className="flex min-w-0 flex-col gap-5">
      <Panel title="Novo código de convite" description="Lifetime: ilimitado para sempre (não está à venda). Parceiro: ilimitado até o fim da campanha. A pessoa ativa tocando 7 vezes seguidas na estrela do Qqorvex.">
        <form onSubmit={handleCreate} className="flex min-w-0 flex-col gap-3">
          <Select label="Acesso concedido" value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
            <option value="lifetime">Lifetime</option>
            <option value="parceiro">Parceiro</option>
            <option value="beta_tester">Beta Tester</option>
          </Select>
          {tier === "parceiro" &&
            (activeCampaigns.length > 0 ? (
              <Select label="Campanha" value={selectedCampaignId} onChange={(event) => setCampaignId(event.target.value)} hint="O acesso do parceiro acaba quando a campanha acaba.">
                {activeCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} · até {shortDate.format(new Date(campaign.ends_at))}
                  </option>
                ))}
              </Select>
            ) : (
              <Notice compact tone="info">Crie uma campanha ativa abaixo antes de gerar códigos de Parceiro.</Notice>
            ))}
          <Input label="Para quem (opcional)" placeholder="Ex.: convite para a Carol" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" className="self-start" leadingIcon={<TicketIcon size={16} />} loading={createCode.isPending} disabled={tier === "parceiro" && !selectedCampaignId}>
            Gerar código
          </Button>
        </form>
        {createError && <Notice compact>{createError}</Notice>}
        {lastGenerated && (
          <div className="flex flex-col gap-2 rounded-lg border border-success/35 bg-success-soft p-3.5">
            <p className="text-xs font-medium text-success">Código criado — envie para a pessoa</p>
            <div className="flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[15px] font-semibold tracking-[.06em] text-fg">{lastGenerated}</code>
              <Button variant="secondary" size="sm" leadingIcon={<CopyIcon size={14} />} onClick={() => void handleCopyCode()}>
                Copiar
              </Button>
            </div>
            {copyMessage && <p className="text-xs text-fg-2" role="status">{copyMessage}</p>}
          </div>
        )}
      </Panel>
      <CampaignsPanel userId={userId} campaigns={campaigns} codes={codes} />
      </div>

      <Panel title="Códigos emitidos" aside={!isLoading && !error && codes.length > 0 ? <span className="text-xs tabular-nums text-fg-3">{codes.length} · {pending} pendentes</span> : undefined}>
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : error ? (
          <SectionError what="os códigos gerados" />
        ) : codes.length === 0 ? (
          <EmptyState>Nenhum código gerado ainda. Os próximos aparecem aqui com o status de resgate.</EmptyState>
        ) : (
          <ul className="-mx-4 -mb-4 flex flex-col divide-y divide-line-soft border-t border-line-soft sm:-mx-5 sm:-mb-5">
            {codes.map((code) => (
              <li key={code.id} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-[13.5px] font-semibold text-fg">{code.code}</code>
                  <p className="truncate text-xs text-fg-3">
                    Criado em {shortDate.format(new Date(code.created_at))}
                    {code.campaign_id ? ` · ${campaignName(code.campaign_id) ?? "campanha"}` : ""}
                    {code.note ? ` · ${code.note}` : ""}
                  </p>
                </div>
                <Badge tone={code.tier === "lifetime" ? "gold" : "info"}>{code.tier === "beta_tester" ? "Beta Tester" : TIER_LABEL[code.tier as AccountTier]}</Badge>
                <Badge tone={code.redeemed_by ? "success" : "neutral"}>{code.redeemed_by ? "Resgatado" : "Pendente"}</Badge>
                {!code.redeemed_by && (
                  <IconButton label="Copiar código" size="sm" onClick={() => void navigator.clipboard?.writeText(code.code).then(() => toast({ title: "Código copiado", tone: "success" }))}>
                    <CopyIcon />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function isCampaignActive(campaign: PartnerCampaign): boolean {
  return Date.parse(campaign.ends_at) > Date.now();
}

/** Fim do dia escolhido no horário de Brasília (sem horário de verão desde 2019). */
function endOfDaySaoPaulo(date: string): string {
  return new Date(`${date}T23:59:59-03:00`).toISOString();
}

function dateInputValue(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/**
 * Campanhas de Parceiro: cada código de Parceiro pertence a uma. Mudar a data (estender ou
 * encerrar) vale na hora para todos os parceiros da campanha.
 */
function CampaignsPanel({ userId, campaigns, codes }: { userId: string; campaigns: PartnerCampaign[]; codes: { campaign_id: string | null; redeemed_by: string | null }[] }) {
  const { toast } = useToast();
  const createCampaign = useCreatePartnerCampaign(supabase, userId);
  const updateEnd = useUpdatePartnerCampaignEnd(supabase);
  const [name, setName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ending, setEnding] = useState<PartnerCampaign | null>(null);
  const today = dateInputValue(new Date().toISOString());

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !endDate) return;
    createCampaign.mutate(
      { name, endsAt: endOfDaySaoPaulo(endDate) },
      {
        onSuccess: () => {
          setName("");
          setEndDate("");
          toast({ title: "Campanha criada", tone: "success" });
        },
        onError: () => toast({ title: "Não foi possível criar a campanha", tone: "danger" }),
      },
    );
  }

  function changeEnd(campaign: PartnerCampaign, date: string) {
    if (!date || date === dateInputValue(campaign.ends_at)) return;
    updateEnd.mutate(
      { campaignId: campaign.id, endsAt: endOfDaySaoPaulo(date) },
      { onSuccess: () => toast({ title: `“${campaign.name}” vai até ${shortDate.format(new Date(endOfDaySaoPaulo(date)))}`, tone: "success" }) },
    );
  }

  return (
    <Panel title="Campanhas de Parceiro" description="O acesso Parceiro dura até o fim da campanha. Estender ou encerrar vale para todos de uma vez; quem sai volta ao plano que tinha, sem perder nada.">
      <form onSubmit={handleCreate} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
        <Input label="Nome" placeholder="Ex.: Lançamento" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        <Input label="Termina em" type="date" min={today} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <Button type="submit" variant="secondary" loading={createCampaign.isPending} disabled={!name.trim() || !endDate}>
          Criar
        </Button>
      </form>
      {campaigns.length > 0 && (
        <ul className="-mx-4 -mb-4 flex flex-col divide-y divide-line-soft border-t border-line-soft sm:-mx-5 sm:-mb-5">
          {campaigns.map((campaign) => {
            const active = isCampaignActive(campaign);
            const partners = codes.filter((code) => code.campaign_id === campaign.id && code.redeemed_by).length;
            return (
              <li key={campaign.id} className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">{campaign.name}</p>
                  <p className="text-xs text-fg-3">
                    {partners} {partners === 1 ? "parceiro" : "parceiros"} · {active ? "até" : "terminou em"} {shortDate.format(new Date(campaign.ends_at))}
                  </p>
                </div>
                <Badge tone={active ? "success" : "neutral"}>{active ? "Ativa" : "Encerrada"}</Badge>
                <Input
                  aria-label={`Nova data de fim de ${campaign.name}`}
                  type="date"
                  fieldSize="sm"
                  wrapperClassName="w-[150px]"
                  min={today}
                  defaultValue={dateInputValue(campaign.ends_at)}
                  key={campaign.ends_at}
                  onBlur={(event) => changeEnd(campaign, event.target.value)}
                />
                {active && (
                  <Button size="sm" variant="ghost" onClick={() => setEnding(campaign)}>
                    Encerrar agora
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        isOpen={ending !== null}
        title={ending ? `Encerrar “${ending.name}” agora?` : "Encerrar campanha"}
        description="Todos os parceiros desta campanha perdem o acesso ilimitado na hora e voltam ao plano que tinham. Dá para reativar escolhendo uma nova data de fim."
        confirmLabel="Encerrar campanha"
        destructive
        onCancel={() => setEnding(null)}
        onConfirm={() => {
          if (ending) updateEnd.mutate({ campaignId: ending.id, endsAt: new Date().toISOString() }, { onSuccess: () => toast({ title: "Campanha encerrada", tone: "success" }) });
          setEnding(null);
        }}
      />
    </Panel>
  );
}

const SECRET_LABELS: Record<string, string> = {
  app_base_url: "URL pública do Qqorvex",
  cron_secret: "Segredo do agendador",
  gemini_api_key: "Chave do Gemini",
  gemini_model: "Modelo do Gemini",
  google_client_id: "Google OAuth — Client ID",
  google_client_secret: "Google OAuth — segredo do cliente",
  rapidapi_private_key: "RapidAPI — chave privada",
  rapidapi_public_key: "RapidAPI — chave pública",
  tavily_api_key: "Chave da Tavily",
  zoom_account_id: "Zoom — Account ID",
  zoom_client_id: "Zoom — Client ID",
  zoom_client_secret: "Zoom — Client Secret",
};

function readableSecretLabel(key: string): string {
  return key.split("_").filter(Boolean).map((part) => part === "api" ? "API" : part === "id" ? "ID" : part === "url" ? "URL" : `${part[0]?.toLocaleUpperCase("pt-BR")}${part.slice(1)}`).join(" ");
}

function SecretsSection() {
  const { secrets, isLoading, error } = useSecretKeys(supabase);
  const setSecretMutation = useSetSecret(supabase);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newSecretError, setNewSecretError] = useState<string | null>(null);
  const [newSecretSaved, setNewSecretSaved] = useState(false);

  async function handleSave(key: string, value: string) {
    if (!value.trim()) throw new Error("Informe um valor antes de salvar.");
    await setSecretMutation.mutateAsync({ key, value: value.trim() });
  }

  return (
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <Panel title="Chaves configuradas" description="Por segurança, os valores nunca voltam a ser exibidos. Dá para substituir, não para consultar.">
        {isLoading ? (
          <SkeletonList rows={3} className="py-3" />
        ) : error ? (
          <SectionError what="as configurações" />
        ) : secrets.length === 0 ? (
          <EmptyState>Nenhuma chave configurada. Adicione uma ao lado para conectar uma integração.</EmptyState>
        ) : (
          <div className="-mx-4 -mb-4 flex min-w-0 flex-col divide-y divide-line-soft border-t border-line-soft sm:-mx-5 sm:-mb-5">
            {secrets.map((secret) => (
              <SecretRow
                key={secret.key}
                label={SECRET_LABELS[secret.key] ?? readableSecretLabel(secret.key)}
                secretKey={secret.key}
                hasValue={secret.hasValue}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Nova chave" description="Segredos usados pelas funções do servidor. Credenciais da Stripe continuam nos segredos do Supabase.">
        <form
          className="flex min-w-0 flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setNewSecretError(null);
            setNewSecretSaved(false);
            if (!newKey.trim() || !newValue.trim()) return;
            try {
              await handleSave(newKey.trim(), newValue);
              setNewKey("");
              setNewValue("");
              setNewSecretSaved(true);
            } catch (caught) {
              setNewSecretError(caught instanceof Error ? caught.message : "Não foi possível salvar esta configuração.");
            }
          }}
        >
          <Input label="Identificador" placeholder="Ex.: outra_api_key" value={newKey} onChange={(event) => { setNewKey(event.target.value); setNewSecretSaved(false); }} autoComplete="off" />
          <Input label="Valor secreto" type="password" value={newValue} onChange={(event) => { setNewValue(event.target.value); setNewSecretSaved(false); }} autoComplete="new-password" />
          <Button type="submit" className="self-start" loading={setSecretMutation.isPending} disabled={!newKey.trim() || !newValue.trim()}>Salvar chave</Button>
        </form>
        {newSecretError && <Notice tone="error">{newSecretError}</Notice>}
        {newSecretSaved && <Notice tone="success">Chave salva. O valor secreto não será mostrado novamente.</Notice>}
      </Panel>
    </div>
  );
}

function SecretRow({
  label,
  secretKey,
  hasValue,
  onSave,
}: {
  label: string;
  secretKey: string;
  hasValue: boolean;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!value.trim() || saving) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await onSave(secretKey, value);
      setValue("");
      setEditing(false);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar esta chave.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[13.5px] font-medium text-fg">{label}</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-fg-3">{secretKey}</p>
        </div>
        <Badge tone={hasValue ? "success" : "neutral"}>{hasValue ? "Configurada" : "Sem valor"}</Badge>
      </div>
      {editing ? (
        <form className="flex min-w-0 flex-col gap-2 sm:w-full sm:max-w-md sm:flex-row sm:items-center" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Input type="password" aria-label="Novo valor secreto" placeholder="Cole o novo valor" value={value} onChange={(event) => setValue(event.target.value)} fieldSize="sm" wrapperClassName="min-w-0 flex-1" autoComplete="new-password" />
          <div className="flex shrink-0 gap-2">
            <Button type="submit" size="sm" loading={saving} disabled={!value.trim()}>Salvar</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setValue(""); setError(null); }} disabled={saving}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" size="sm" className="self-start sm:self-auto" onClick={() => { setEditing(true); setSaved(false); }}>
          {hasValue ? "Substituir" : "Definir valor"}
        </Button>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {saved && !editing && <p className="text-xs text-success" role="status">Configuração salva com sucesso.</p>}
    </article>
  );
}
