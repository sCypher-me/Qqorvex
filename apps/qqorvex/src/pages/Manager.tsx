import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth, useProfile, type Profile } from "@qqorvex/auth";
import { Badge, Button, ConfirmDialog, EmptyState, Input, Notice, Select, ChipTabs, SkeletonCards, SkeletonList, type BadgeTone } from "@qqorvex/ui";
import {
  useAllAccounts,
  useCreateRedemptionCode,
  useDeleteAccount,
  useRedemptionCodes,
  useSecretKeys,
  useSetSecret,
  useSystemOverview,
  type AccountTier,
} from "@qqorvex/module-manager";
import { supabase } from "../app/supabase";

const TIER_LABEL: Record<AccountTier, string> = { padrao: "Padrão", parceiro: "Parceiro", lifetime: "Lifetime", vip: "VIP" };
const TIER_TONE: Record<AccountTier, BadgeTone> = { padrao: "neutral", parceiro: "info", lifetime: "premium", vip: "premium" };

type ManagerTab = "visao-geral" | "contas" | "codigos" | "config";

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`qv-card flex min-w-0 flex-col gap-4 p-5 sm:p-6 ${className}`}>
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

function OwnerHero({ profile, email }: { profile: Profile; email: string }) {
  const name = profile.display_name || profile.full_name || profile.username || "Dono";
  const username = profile.username ? `@${profile.username}` : email;
  const tier = (profile.account_tier in TIER_LABEL ? profile.account_tier : "padrao") as AccountTier;

  return (
    <section className="qv-card grid min-w-0 gap-5 border-vex-gold-muted/40 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)] lg:items-center lg:p-7">
      <div className="min-w-0">
        <p className="qv-eyebrow text-vex-gold-bright">ESPAÇO ADMINISTRATIVO</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">Central do Dono</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Contas, convites e configurações globais, organizados em um único painel privado.
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-3.5 rounded-2xl border border-border bg-surface-1 p-3.5 sm:p-4">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full border border-vex-gold-muted/70 object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-vex-gold-muted/70 bg-surface-3 font-mono text-sm font-semibold text-vex-gold-bright">
              {name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
          <p className="truncate text-xs text-text-muted">{username}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="premium">Dono</Badge>
            <span className="text-[11px] text-text-muted">Conta {TIER_LABEL[tier]}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Diferencia "não tem nada cadastrado" de "não consegui buscar" — sem isso, uma falha de rede
 * parece silenciosamente uma lista vazia, o que é enganoso numa tela de administração. */
function SectionError({ what }: { what: string }) {
  return (
    <Notice tone="error" title={`Não foi possível carregar ${what}`}>
      Os dados continuam existindo — só essa busca que falhou agora. Recarregue a página pra tentar de novo.
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
  const [tab, setTab] = useState<ManagerTab>("visao-geral");

  if (profileLoading) {
    return <div className="qv-page mx-auto flex w-full max-w-[1440px] flex-col gap-5"><SkeletonCards count={3} className="h-28 rounded-[20px]" /></div>;
  }

  if (!profile || profile.role !== "dono") {
    return (
      <div className="qv-page mx-auto w-full max-w-[900px]">
        <Panel title="Área restrita">
          <Notice tone="warning" title="Acesso exclusivo ao Dono">Esta conta não possui permissão para abrir a Central do Dono.</Notice>
        </Panel>
      </div>
    );
  }

  return (
    <div className="qv-page mx-auto flex w-full max-w-[1440px] flex-col gap-5 pb-8">
      <OwnerHero profile={profile} email={session!.user.email ?? ""} />
      <div className="-mx-1 overflow-x-auto border-b border-border px-1 pb-3">
      <ChipTabs value={tab} onChange={setTab} className="min-w-max flex-nowrap" options={[
        { value: "visao-geral", label: "Visão geral" },
        { value: "contas", label: "Contas" },
        { value: "codigos", label: "Códigos" },
        { value: "config", label: "Configurações" },
      ]} />
      </div>
      {tab === "visao-geral" && <OverviewSection onNavigate={setTab} />}
      {tab === "contas" && <AccountsSection currentUserId={userId} />}
      {tab === "codigos" && <CodesSection userId={userId} />}
      {tab === "config" && <SecretsSection />}
    </div>
  );
}

function OverviewSection({ onNavigate }: { onNavigate: (tab: ManagerTab) => void }) {
  const { overview, isLoading, error } = useSystemOverview(supabase);
  if (isLoading) return <Panel title="Visão do sistema"><SkeletonCards count={6} className="h-24 w-full rounded-xl" /></Panel>;
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
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.75fr)]">
      <Panel title="Visão do sistema" className="min-w-0">
        <p className="-mt-2 text-sm leading-relaxed text-text-secondary">Indicadores gerais dos dados registrados no Qqorvex.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="qv-tile flex min-h-[104px] min-w-0 flex-col justify-between gap-3 p-4 sm:p-5">
              <span className="truncate text-[10px] font-medium uppercase tracking-[.12em] text-text-muted sm:text-[11px]">{label}</span>
              <span className="font-display text-2xl font-semibold text-text-primary qv-num sm:text-3xl">{value.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Atalhos de gestão" className="min-w-0">
        <p className="-mt-2 text-sm leading-relaxed text-text-secondary">Acesse rapidamente as tarefas mais comuns do painel.</p>
        {[
          { title: "Gerenciar contas", description: "Consultar acessos e contas", tab: "contas" as const },
          { title: "Criar código", description: "Gerar um convite de acesso", tab: "codigos" as const },
          { title: "Configurar integrações", description: "Gerenciar chaves do sistema", tab: "config" as const },
        ].map((action) => (
          <button key={action.tab} type="button" onClick={() => onNavigate(action.tab)} className="qv-row group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-vex-cyan-dark">
            <span className="min-w-0"><strong className="block text-sm font-semibold text-text-primary">{action.title}</strong><span className="mt-0.5 block text-xs text-text-muted">{action.description}</span></span>
            <span aria-hidden="true" className="shrink-0 text-lg text-vex-cyan-bright transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        ))}
      </Panel>
    </div>
  );
}

function AccountsSection({ currentUserId }: { currentUserId: string }) {
  const { accounts, isLoading, error } = useAllAccounts(supabase);
  const deleteAccountMutation = useDeleteAccount(supabase);
  const [confirming, setConfirming] = useState<{ id: string; email: string } | null>(null);
  const [search, setSearch] = useState("");

  if (isLoading) return <Panel title="Contas"><SkeletonList rows={3} className="py-3" /></Panel>;
  if (error) return <Panel title="Contas"><SectionError what="as contas" /></Panel>;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) =>
    !normalizedSearch || [account.displayName, account.username, account.email].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch)),
  );

  return (
    <Panel title="Contas e acessos">
      <div className="flex min-w-0 flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <Input label="Buscar uma conta" placeholder="Nome, usuário ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} wrapperClassName="w-full sm:max-w-xl" />
        <div className="flex flex-wrap gap-2 pb-0.5">
          <Badge tone="info">{accounts.length} no total</Badge>
          <Badge tone="outline">{filteredAccounts.length} exibida{filteredAccounts.length === 1 ? "" : "s"}</Badge>
        </div>
      </div>
      {deleteAccountMutation.isError && <Notice tone="error" title="Não foi possível excluir a conta">A operação falhou. A conta e os dados associados foram mantidos.</Notice>}
      {accounts.length === 0 ? (
        <EmptyState>Nenhuma conta cadastrada.</EmptyState>
      ) : filteredAccounts.length === 0 ? (
        <EmptyState>Nenhuma conta corresponde à busca.</EmptyState>
      ) : (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredAccounts.map((account) => (
            <article key={account.id} className="qv-tile flex min-w-0 flex-col gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2 font-display text-sm font-semibold text-text-secondary">
                  {(account.displayName || account.username || account.email).trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-text-primary">{account.displayName || account.username || "Sem nome definido"}</p>
                  <p className="mt-1 break-all text-xs text-text-muted">{account.email}</p>
                  {account.username && <p className="mt-1 truncate text-xs text-vex-cyan-bright">@{account.username}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {account.role === "dono" && <Badge tone="premium">Dono</Badge>}
                {account.id === currentUserId && <Badge tone="info">Sua conta</Badge>}
                <Badge tone={TIER_TONE[account.accountTier]}>{TIER_LABEL[account.accountTier]}</Badge>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-[11px] text-text-muted">Membro desde {shortDate.format(new Date(account.createdAt))}</span>
                {account.id !== currentUserId && (
                  <Button variant="destructive" size="sm" disabled={deleteAccountMutation.isPending} onClick={() => { deleteAccountMutation.reset(); setConfirming({ id: account.id, email: account.email }); }}>
                    {deleteAccountMutation.isPending && deleteAccountMutation.variables === account.id ? "Excluindo…" : "Excluir conta"}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={confirming !== null}
        title="Excluir esta conta?"
        description={confirming ? `${confirming.email} perde acesso e todos os dados dessa conta são apagados. Isso não pode ser desfeito.` : ""}
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
  const { codes, isLoading, error } = useRedemptionCodes(supabase);
  const createCode = useCreateRedemptionCode(supabase, userId);
  const [tier, setTier] = useState<"parceiro" | "lifetime" | "beta_tester">("parceiro");
  const [note, setNote] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCopyMessage(null);
    try {
      const created = await createCode.mutateAsync({ tier, note: note.trim() || undefined });
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

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
      <Panel title="Gerar código de convite">
        <p className="-mt-2 text-sm leading-relaxed text-text-secondary">Crie códigos para conceder acesso Parceiro, Lifetime ou reconhecer participantes oficiais do beta.</p>
        <form onSubmit={handleCreate} className="flex min-w-0 flex-col gap-4">
          <Select label="Acesso concedido" value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}>
            <option value="parceiro">Parceiro</option>
            <option value="lifetime">Lifetime</option>
            <option value="beta_tester">Beta Tester</option>
          </Select>
          <Input label="Identificação interna (opcional)" placeholder="Ex.: convite para uma pessoa" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" variant="primary" className="self-start" disabled={createCode.isPending}>{createCode.isPending ? "Gerando…" : "Gerar código"}</Button>
        </form>
        {createError && <Notice tone="error">{createError}</Notice>}
        {lastGenerated && (
          <div className="rounded-xl border border-success/30 bg-success-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-success">Código criado</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-base font-semibold tracking-[.06em] text-text-primary">{lastGenerated}</code>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopyCode()}>Copiar</Button>
            </div>
            {copyMessage && <p className="mt-2 text-xs leading-relaxed text-text-secondary" role="status">{copyMessage}</p>}
          </div>
        )}
      </Panel>

      <Panel title="Códigos emitidos">
        {!isLoading && !error && codes.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Total", value: codes.length, tone: "text-text-primary" },
              { label: "Pendentes", value: codes.filter((code) => !code.redeemed_by).length, tone: "text-vex-gold-bright" },
              { label: "Resgatados", value: codes.filter((code) => Boolean(code.redeemed_by)).length, tone: "text-success" },
            ].map((stat) => <div key={stat.label} className="qv-tile min-w-0 p-3.5"><p className="text-[10px] font-medium uppercase tracking-[.1em] text-text-muted">{stat.label}</p><p className={`mt-1 font-display text-xl font-semibold ${stat.tone}`}>{stat.value}</p></div>)}
          </div>
        )}
        {isLoading ? (
          <SkeletonList rows={3} className="py-3" />
        ) : error ? (
          <SectionError what="os códigos gerados" />
        ) : codes.length === 0 ? (
          <EmptyState>Nenhum código gerado ainda. Os próximos aparecerão aqui com o status de resgate.</EmptyState>
        ) : (
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
            {codes.map((code) => (
              <article key={code.id} className="qv-tile flex min-w-0 flex-col gap-3 p-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <code className="break-all font-mono text-sm font-semibold text-text-primary">{code.code}</code>
                  <Badge tone={code.redeemed_by ? "success" : "outline"}>{code.redeemed_by ? "Resgatado" : "Pendente"}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={code.tier === "lifetime" ? "premium" : "info"}>{code.tier === "beta_tester" ? "Beta Tester" : TIER_LABEL[code.tier as AccountTier]}</Badge>
                  <span className="text-[11px] text-text-muted">Criado {shortDate.format(new Date(code.created_at))}</span>
                </div>
                {code.note && <p className="truncate border-t border-border pt-2 text-xs text-text-muted" title={code.note}>{code.note}</p>}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
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
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <Panel title="Chaves configuradas" className="min-w-0">
        <Notice tone="info" title="Segredos protegidos">
          Os valores nunca são exibidos após o salvamento. Você pode substituir uma chave, mas não consultar seu valor atual.
        </Notice>
        {isLoading ? (
          <SkeletonList rows={3} className="py-3" />
        ) : error ? (
          <SectionError what="as configurações" />
        ) : secrets.length === 0 ? (
          <EmptyState>Nenhuma chave configurada. Adicione uma ao lado para conectar uma integração.</EmptyState>
        ) : (
          <div className="flex min-w-0 flex-col">
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

      <Panel title="Adicionar configuração" className="min-w-0">
        <p className="-mt-2 text-sm leading-relaxed text-text-secondary">Cadastre segredos usados pelas funções de servidor do Qqorvex. Não coloque chaves privadas no código do app; credenciais de Edge Functions, como Stripe, continuam configuradas nos segredos do Supabase.</p>
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
          <Button type="submit" variant="primary" className="self-start" disabled={setSecretMutation.isPending || !newKey.trim() || !newValue.trim()}>{setSecretMutation.isPending ? "Salvando…" : "Salvar configuração"}</Button>
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
    <article className="qv-row flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-text-primary">{label}</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-text-muted">{secretKey}</p>
        </div>
        <Badge tone={hasValue ? "success" : "outline"}>{hasValue ? "Configurada" : "Sem valor"}</Badge>
      </div>
      {editing ? (
        <form className="flex min-w-0 flex-col gap-2 sm:w-full sm:max-w-md sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Input label="Novo valor secreto" type="password" placeholder="Cole o novo valor" value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1" autoComplete="new-password" />
          <div className="flex shrink-0 gap-2">
            <Button type="submit" size="sm" disabled={saving || !value.trim()}>{saving ? "Salvando…" : "Salvar"}</Button>
            <Button type="button" variant="quiet" size="sm" onClick={() => { setEditing(false); setValue(""); setError(null); }} disabled={saving}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="quiet" size="sm" className="self-start sm:self-auto" onClick={() => { setEditing(true); setSaved(false); }}>
          {hasValue ? "Substituir" : "Definir valor"}
        </Button>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {saved && !editing && <p className="text-xs text-success" role="status">Configuração salva com sucesso.</p>}
    </article>
  );
}
