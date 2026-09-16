import { useState, type FormEvent } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Card, ConfirmDialog } from "@qqorvex/ui";
import { useCreateUsefulContact, useDeleteUsefulContact, useUsefulContacts } from "../hooks/useVidaPratica";

/** NÃO é uma agenda de contatos genérica (decisão explícita do usuário) — só profissionais/serviços úteis. */
export function UsefulContactsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { contacts, isLoading } = useUsefulContacts(client);
  const createContact = useCreateUsefulContact(client, userId);
  const deleteContact = useDeleteUsefulContact(client);
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
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Nome" className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <input
          name="category"
          placeholder="Categoria (ex.: encanador)"
          className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
        />
        <input name="phone" placeholder="Telefone" className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm" />
        <Button type="submit" variant="secondary">
          Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : contacts.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum contato útil cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-sans text-sm text-text-primary">{contact.name}</p>
                    <p className="font-sans text-xs text-text-secondary-warm">
                      {[contact.category, contact.phone].filter(Boolean).join(" · ") || "sem detalhes"}
                    </p>
                  </div>
                  <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(contact.id)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
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
    </div>
  );
}
