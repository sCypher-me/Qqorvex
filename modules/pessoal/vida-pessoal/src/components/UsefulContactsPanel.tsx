import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, EmptyState, Input } from "@qqorvex/ui";
import { useCreateUsefulContact, useDeleteUsefulContact, useUsefulContacts } from "../hooks/useVidaPratica";

/** NÃO é uma agenda de contatos genérica (decisão explícita do usuário) — só profissionais/serviços úteis. */
export function UsefulContactsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { contacts, isLoading } = useUsefulContacts(client);
  const createContact = useCreateUsefulContact(client, userId);
  const deleteContact = useDeleteUsefulContact(client);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmContact = contacts.find((c) => c.id === confirmDeleteId) ?? null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createContact.mutate({
      name,
      category: String(form.get("category") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? "").trim() || undefined,
    });
    event.currentTarget.reset();
  }

  return (
    <section className="qv-card p-[18px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="flex-1 text-[15px] font-semibold text-text-primary">Contatos úteis</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{contacts.length}</span>}
      </div>

      {isLoading ? (
        <EmptyState>Carregando...</EmptyState>
      ) : contacts.length === 0 ? (
        <EmptyState>Nenhum contato útil cadastrado.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <li key={contact.id} className="qv-row-top flex items-center gap-2.5 py-2">
              <span className="flex-1 min-w-0 text-[13px] text-text-primary">
                {contact.category && <span className="text-text-secondary">{contact.category} — </span>}
                {contact.name}
              </span>
              <span className="font-mono text-xs text-text-secondary">{contact.phone || "—"}</span>
              <button
                type="button"
                className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
                aria-label={`Excluir "${contact.name}"`}
                title="Excluir"
                onClick={() => setConfirmDeleteId(contact.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="qv-row-top pt-3 flex flex-col gap-2.5">
          <Input name="name" placeholder="Nome" aria-label="Nome" className="py-2 text-[13px]" autoFocus />
          <Input name="category" placeholder="Categoria (ex.: encanador)" aria-label="Categoria" className="py-2 text-[13px]" />
          <Input name="phone" placeholder="Telefone" aria-label="Telefone" className="py-2 text-[13px] font-mono" />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm">
              Adicionar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Fechar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="dashed" className="w-full" onClick={() => setFormOpen(true)}>
          Adicionar
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmContact !== null}
        title={`Excluir "${confirmContact?.name}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmContact) deleteContact.mutate(confirmContact.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </section>
  );
}
