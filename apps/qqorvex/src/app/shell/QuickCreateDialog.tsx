import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HOJE_REGISTRY_CHANGE_EVENT } from "@qqorvex/module-hoje";
import { createTask, localDateKey, type TaskPriority } from "@qqorvex/module-tarefas";
import { createEvent } from "@qqorvex/module-agenda";
import { createTransaction, listAccounts, listCategories } from "@qqorvex/module-financas";
import { createPage } from "@qqorvex/module-segundo-cerebro";
import { billingLimitMessage } from "@qqorvex/database";
import { Button, Input, Modal, Notice, Segmented, Select, useToast } from "@qqorvex/ui";
import { useAccount } from "../account";
import { supabase } from "../supabase";
import { QUICK_CREATE_OPTIONS, QUICK_CREATE_TITLES, type QuickCreateKind } from "./QuickCreate";

function addDays(key: string, days: number): string {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return localDateKey(date);
}

function errorMessage(error: unknown): string {
  return billingLimitMessage(error) ?? (error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.");
}

export function QuickCreateDialog({
  kind,
  defaults,
  onKindChange,
  onClose,
}: {
  kind: QuickCreateKind;
  defaults?: { title?: string; date?: string };
  onKindChange: (kind: QuickCreateKind) => void;
  onClose: () => void;
}) {
  const option = QUICK_CREATE_OPTIONS.find((item) => item.kind === kind)!;
  return (
    <Modal isOpen onClose={onClose} title={QUICK_CREATE_TITLES[kind]} size="md" icon={option.icon}>
      <Segmented
        label="Tipo de item"
        size="sm"
        fullWidth
        options={QUICK_CREATE_OPTIONS.map((item) => ({ value: item.kind, label: item.label }))}
        value={kind}
        onChange={onKindChange}
      />
      {kind === "task" && <TaskForm defaults={defaults} onDone={onClose} />}
      {kind === "event" && <EventForm defaults={defaults} onDone={onClose} />}
      {kind === "transaction" && <TransactionForm defaults={defaults} onDone={onClose} />}
      {kind === "note" && <NoteForm defaults={defaults} onDone={onClose} />}
    </Modal>
  );
}

function useAfterCreate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries();
    window.dispatchEvent(new Event(HOJE_REGISTRY_CHANGE_EVENT));
  };
}

function FormActions({ saving, label, onCancel }: { saving: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="-mx-5 mt-1 flex justify-end gap-2 border-t border-line px-5 pt-3.5 sm:-mx-6 sm:px-6">
      <Button variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" loading={saving}>
        {label}
      </Button>
    </div>
  );
}

const DATE_SHORTCUTS = [
  { label: "Hoje", offset: 0 },
  { label: "Amanhã", offset: 1 },
  { label: "Em 1 semana", offset: 7 },
];

function TaskForm({ defaults, onDone }: { defaults?: { title?: string; date?: string }; onDone: () => void }) {
  const { userId } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const afterCreate = useAfterCreate();
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [dueDate, setDueDate] = useState(defaults?.date ?? "");
  const [priority, setPriority] = useState<TaskPriority>("sem_prioridade");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDateKey();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Dê um título para a tarefa.");
    setSaving(true);
    setError(null);
    try {
      await createTask(supabase, userId, { title: title.trim(), dueDate: dueDate || undefined, priority });
      afterCreate();
      toast({ title: "Tarefa criada", description: title.trim(), tone: "success", action: { label: "Ver", onClick: () => navigate("/planejar/tarefas") } });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="O que precisa ser feito?" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Enviar proposta para o cliente" autoFocus data-autofocus maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Input label="Prazo" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {DATE_SHORTCUTS.map((shortcut) => {
              const value = addDays(today, shortcut.offset);
              return (
                <button key={shortcut.label} type="button" onClick={() => setDueDate(value)} className={`rounded-md px-2 py-0.5 text-xs transition-colors ${dueDate === value ? "bg-gold-soft text-gold-fg" : "text-fg-3 hover:bg-hover hover:text-fg"}`}>
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </div>
        <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="sem_prioridade">Sem prioridade</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </Select>
      </div>
      {error && <Notice compact>{error}</Notice>}
      <FormActions saving={saving} label="Criar tarefa" onCancel={onDone} />
    </form>
  );
}

function EventForm({ defaults, onDone }: { defaults?: { title?: string; date?: string }; onDone: () => void }) {
  const { userId } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const afterCreate = useAfterCreate();
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [date, setDate] = useState(defaults?.date ?? localDateKey());
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(() => {
    const next = new Date();
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return `${String(next.getHours()).padStart(2, "0")}:00`;
  });
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const [h = 0, m = 0] = start.split(":").map(Number);
    const endHour = Math.min(23, h + 1);
    setEnd(`${String(endHour).padStart(2, "0")}:${String(endHour === 23 && h === 23 ? 59 : m).padStart(2, "0")}`);
  }, [start]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Dê um nome para o evento.");
    const [y = 0, mo = 1, d = 1] = date.split("-").map(Number);
    const [sh = 0, sm = 0] = start.split(":").map(Number);
    const [eh = 0, em = 0] = end.split(":").map(Number);
    const startAt = allDay ? new Date(y, mo - 1, d, 0, 0) : new Date(y, mo - 1, d, sh, sm);
    const endAt = allDay ? new Date(y, mo - 1, d, 23, 59) : new Date(y, mo - 1, d, eh, em);
    if (endAt <= startAt) return setError("O término precisa ser depois do início.");
    setSaving(true);
    setError(null);
    try {
      await createEvent(supabase, userId, { title: title.trim(), startAt: startAt.toISOString(), endAt: endAt.toISOString(), isAllDay: allDay, location: location.trim() || undefined });
      afterCreate();
      toast({ title: "Evento criado", description: title.trim(), tone: "success", action: { label: "Ver", onClick: () => navigate("/planejar/agenda") } });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Nome do evento" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reunião de planejamento" autoFocus data-autofocus maxLength={200} />
      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr]">
        <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Início" type="time" value={start} onChange={(e) => setStart(e.target.value)} disabled={allDay} />
        <Input label="Término" type="time" value={end} onChange={(e) => setEnd(e.target.value)} disabled={allDay} />
      </div>
      <label className="flex items-center gap-2 text-[13px] text-fg-2">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        Dia inteiro
      </label>
      <Input label="Local ou link (opcional)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Escritório, sala 3" />
      {error && <Notice compact>{error}</Notice>}
      <FormActions saving={saving} label="Criar evento" onCancel={onDone} />
    </form>
  );
}

function TransactionForm({ defaults, onDone }: { defaults?: { title?: string; date?: string }; onDone: () => void }) {
  const { userId } = useAccount();
  const { toast } = useToast();
  const navigate = useNavigate();
  const afterCreate = useAfterCreate();
  const [type, setType] = useState<"saida" | "entrada">("saida");
  const [name, setName] = useState(defaults?.title ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaults?.date ?? localDateKey());
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ["quick-create", "categories"], queryFn: () => listCategories(supabase) });
  const accounts = useQuery({ queryKey: ["quick-create", "accounts"], queryFn: () => listAccounts(supabase) });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!name.trim()) return setError("Descreva a transação.");
    if (!Number.isFinite(value) || value <= 0) return setError("Informe um valor maior que zero.");
    setSaving(true);
    setError(null);
    try {
      await createTransaction(supabase, userId, { name: name.trim(), amount: value, transactionType: type, date, categoryId: categoryId || undefined, accountId: accountId || undefined });
      afterCreate();
      toast({ title: type === "saida" ? "Despesa registrada" : "Receita registrada", description: `${name.trim()} · ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, tone: "success", action: { label: "Ver", onClick: () => navigate("/vida/financas") } });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  const filteredCategories = (categories.data ?? []).filter((category) => category.kind === type);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Segmented
        label="Tipo de transação"
        options={[
          { value: "saida", label: "Despesa" },
          { value: "entrada", label: "Receita" },
        ]}
        value={type}
        onChange={(value) => {
          setType(value);
          setCategoryId("");
        }}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <Input label="Descrição" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "saida" ? "Ex.: Mercado" : "Ex.: Salário"} autoFocus data-autofocus maxLength={200} />
        <Input label="Valor (R$)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0,00" className="tabular-nums" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Select label="Categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {filteredCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select label="Conta" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Sem conta</option>
          {(accounts.data ?? []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>
      {error && <Notice compact>{error}</Notice>}
      <FormActions saving={saving} label={type === "saida" ? "Registrar despesa" : "Registrar receita"} onCancel={onDone} />
    </form>
  );
}

function NoteForm({ defaults, onDone }: { defaults?: { title?: string }; onDone: () => void }) {
  const { userId } = useAccount();
  const navigate = useNavigate();
  const afterCreate = useAfterCreate();
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const page = await createPage(supabase, userId, { title: title.trim() || "Sem título" });
      afterCreate();
      onDone();
      navigate(`/conhecimento/notas/${page.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Título da nota" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ideias para o fim de semana" autoFocus data-autofocus maxLength={200} hint="A nota abre no editor logo depois de criada." />
      {error && <Notice compact>{error}</Notice>}
      <FormActions saving={saving} label="Criar e abrir" onCancel={onDone} />
    </form>
  );
}
