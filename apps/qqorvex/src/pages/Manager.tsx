import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth, useProfile } from "@qqorvex/auth";
import { Badge, Button, ConfirmDialog, EmptyState, Input, Select, ChipTabs, type BadgeTone } from "@qqorvex/ui";
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

const TIER_LABEL: Record<AccountTier, string> = { padrao: "Padrão", parceiro: "Parceiro", lifetime: "Lifetime" };
const TIER_TONE: Record<AccountTier, BadgeTone> = { padrao: "neutral", parceiro: "info", lifetime: "premium" };

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="qv-card p-5 flex flex-col gap-3.5">
      <h2 className="font-display text-[17px] font-semibold">{title}</h2>
      {children}
    </section>
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
  const { profile } = useProfile(supabase, userId);
  const [tab, setTab] = useState<"visao-geral" | "contas" | "codigos" | "config">("visao-geral");

  if (profile && profile.role !== "dono") {
    return (
      <Panel title="Painel Manager">
        <EmptyState>Essa área é só para o Dono da conta.</EmptyState>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1040px]">
      <ChipTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "visao-geral", label: "Visão geral" },
          { value: "contas", label: "Contas" },
          { value: "codigos", label: "Códigos" },
          { value: "config", label: "Configurações" },
        ]}
      />
      {tab === "visao-geral" && <OverviewSection />}
      {tab === "contas" && <AccountsSection currentUserId={userId} />}
      {tab === "codigos" && <CodesSection userId={userId} />}
      {tab === "config" && <SecretsSection />}
    </div>
  );
}

function OverviewSection() {
  const { overview, isLoading } = useSystemOverview(supabase);
  if (isLoading) return <Panel title="Visão geral"><EmptyState>Carregando...</EmptyState></Panel>;
  if (!overview) return <Panel title="Visão geral"><EmptyState>Sem dados.</EmptyState></Panel>;

  const stats: [string, number][] = [
    ["Contas", overview.totalUsers],
    ["Tarefas", overview.totalTasks],
    ["Eventos", overview.totalEvents],
    ["Transações", overview.totalTransactions],
    ["Documentos", overview.totalDocuments],
    ["Páginas", overview.totalPages],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      {stats.map(([label, value]) => (
        <div key={label} className="qv-tile p-4 flex flex-col gap-1">
          <span className="qv-eyebrow">{label}</span>
          <span className="font-display text-2xl font-semibold qv-num">{value}</span>
        </div>
      ))}
    </div>
  );
}

function AccountsSection({ currentUserId }: { currentUserId: string }) {
  const { accounts, isLoading } = useAllAccounts(supabase);
  const deleteAccountMutation = useDeleteAccount(supabase);
  const [confirming, setConfirming] = useState<{ id: string; email: string } | null>(null);

  if (isLoading) return <Panel title="Contas"><EmptyState>Carregando...</EmptyState></Panel>;

  return (
    <Panel title={`Contas · ${accounts.length}`}>
      {accounts.length === 0 ? (
        <EmptyState>Nenhuma conta cadastrada.</EmptyState>
      ) : (
        <div className="flex flex-col">
          {accounts.map((account) => (
            <div key={account.id} className="qv-row flex items-center gap-3 py-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{account.displayName || account.email}</p>
                <p className="text-xs text-text-muted truncate">{account.email} · desde {shortDate.format(new Date(account.createdAt))}</p>
              </div>
              {account.role === "dono" && <Badge tone="premium">Dono</Badge>}
              <Badge tone={TIER_TONE[account.accountTier]}>{TIER_LABEL[account.accountTier]}</Badge>
              {account.id !== currentUserId && (
                <Button variant="destructive" size="sm" onClick={() => setConfirming({ id: account.id, email: account.email })}>
                  Excluir
                </Button>
              )}
            </div>
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
  const { codes, isLoading } = useRedemptionCodes(supabase);
  const createCode = useCreateRedemptionCode(supabase, userId);
  const [tier, setTier] = useState<Exclude<AccountTier, "padrao">>("parceiro");
  const [note, setNote] = useState("");
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const created = await createCode.mutateAsync({ tier, note: note.trim() || undefined });
    setLastGenerated(created.code);
    setNote("");
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Panel title="Gerar código de resgate">
        <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
          <Select label="Tipo" value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
            <option value="parceiro">Parceiro</option>
            <option value="lifetime">Lifetime</option>
          </Select>
          <Input label="Nota (opcional)" placeholder="ex.: convite pro Fulano" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" disabled={createCode.isPending}>Gerar código</Button>
        </form>
        {lastGenerated && (
          <p className="text-sm">
            Código gerado: <span className="qv-num font-semibold text-vex-cyan-bright">{lastGenerated}</span>
          </p>
        )}
      </Panel>

      <Panel title={`Códigos gerados · ${codes.length}`}>
        {isLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : codes.length === 0 ? (
          <EmptyState>Nenhum código gerado ainda.</EmptyState>
        ) : (
          <div className="flex flex-col">
            {codes.map((code) => (
              <div key={code.id} className="qv-row flex items-center gap-3 py-3 flex-wrap">
                <span className="qv-num text-sm font-medium">{code.code}</span>
                <Badge tone={code.tier === "lifetime" ? "premium" : "info"}>{TIER_LABEL[code.tier as AccountTier]}</Badge>
                {code.note && <span className="text-xs text-text-muted flex-1 min-w-0 truncate">{code.note}</span>}
                <span className="flex-1" />
                <Badge tone={code.redeemed_by ? "success" : "outline"}>{code.redeemed_by ? "Resgatado" : "Pendente"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

const SECRET_LABELS: Record<string, string> = {
  gemini_api_key: "Chave do Gemini",
  gemini_model: "Modelo do Gemini",
  tavily_api_key: "Chave da Tavily",
  zoom_account_id: "Zoom — Account ID",
  zoom_client_id: "Zoom — Client ID",
  zoom_client_secret: "Zoom — Client Secret",
};

function SecretsSection() {
  const { secrets, isLoading } = useSecretKeys(supabase);
  const setSecretMutation = useSetSecret(supabase);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  async function handleSave(key: string, value: string) {
    if (!value.trim()) return;
    await setSecretMutation.mutateAsync({ key, value: value.trim() });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Panel title="Configurações globais">
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Valores nunca são mostrados de volta depois de salvos — só é possível sobrescrever, nunca ler o que já está configurado.
        </p>
        {isLoading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : secrets.length === 0 ? (
          <EmptyState>Nenhuma configuração cadastrada ainda.</EmptyState>
        ) : (
          <div className="flex flex-col">
            {secrets.map((secret) => (
              <SecretRow
                key={secret.key}
                label={SECRET_LABELS[secret.key] ?? secret.key}
                secretKey={secret.key}
                hasValue={secret.hasValue}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Adicionar nova chave">
        <form
          className="flex items-end gap-3 flex-wrap"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newKey.trim() || !newValue.trim()) return;
            await handleSave(newKey.trim(), newValue);
            setNewKey("");
            setNewValue("");
          }}
        >
          <Input label="Chave" placeholder="ex.: outra_api_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input label="Valor" type="password" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Button type="submit">Salvar</Button>
        </form>
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
  onSave: (key: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="qv-row flex items-center gap-3 py-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-text-muted qv-num">{secretKey}</p>
      </div>
      <Badge tone={hasValue ? "success" : "outline"}>{hasValue ? "Configurada" : "Vazia"}</Badge>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input type="password" placeholder="Novo valor" value={value} onChange={(e) => setValue(e.target.value)} className="w-48" />
          <Button
            size="sm"
            onClick={() => {
              onSave(secretKey, value);
              setValue("");
              setEditing(false);
            }}
          >
            Salvar
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        </div>
      ) : (
        <Button variant="quiet" size="sm" onClick={() => setEditing(true)}>
          {hasValue ? "Trocar" : "Definir"}
        </Button>
      )}
    </div>
  );
}
