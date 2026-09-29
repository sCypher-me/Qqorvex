import { useState, type FormEvent } from "react";
import { AddressBookIcon, CopyIcon, PhoneIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, IconButton, Input, SkeletonList, initialsOf } from "@qqorvex/ui";
import { useCreateUsefulContact, useDeleteUsefulContact, useUsefulContacts } from "../hooks/useVidaPratica";
import { PanelEmpty, PanelRow, PanelShell } from "./PanelShell";

/** NÃO é uma agenda de contatos genérica (decisão explícita do usuário) — só profissionais/serviços úteis. */
export function UsefulContactsPanel({ client, userId }: { client: SupabaseClient<Database>; userId: string }) {
  const { contacts, isLoading } = useUsefulContacts(client);
  const createContact = useCreateUsefulContact(client, userId);
  const deleteContact = useDeleteUsefulContact(client);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const confirmContact = contacts.find((c) => c.id === confirmDeleteId) ?? null;
  const sorted = [...contacts].sort((a, b) => (a.category ?? a.name).localeCompare(b.category ?? b.name, "pt-BR"));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    createContact.mutate(
      {
        name,
        category: String(form.get("category") ?? "").trim() || undefined,
        phone: String(form.get("phone") ?? "").trim() || undefined,
      },
      {
        onSuccess: () => {
          formElement.reset();
          setFormOpen(false);
        },
      },
    );
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input name="name" placeholder="Nome" aria-label="Nome" fieldSize="sm" autoFocus />
        <Input name="category" placeholder="Serviço (ex.: eletricista)" aria-label="Serviço" fieldSize="sm" />
      </div>
      <div className="flex gap-2">
        <Input name="phone" type="tel" placeholder="Telefone" aria-label="Telefone" fieldSize="sm" wrapperClassName="flex-1" />
        <Button type="submit" size="sm" loading={createContact.isPending}>
          Salvar
        </Button>
      </div>
      {createContact.isError && <p className="text-xs text-danger" role="alert">Não foi possível salvar. Os campos foram mantidos.</p>}
    </form>
  );

  return (
    <PanelShell
      icon={<AddressBookIcon />}
      title="Contatos úteis"
      meta={isLoading ? undefined : contacts.length || undefined}
      summary="Profissionais e serviços de confiança"
      addLabel="Adicionar contato"
      formOpen={formOpen}
      onToggleForm={() => setFormOpen((value) => !value)}
      form={form}
    >
      {isLoading ? (
        <SkeletonList rows={2} leading />
      ) : contacts.length === 0 ? (
        <PanelEmpty>Guarde aqui o eletricista, a dentista, o mecânico — quem você precisa achar rápido.</PanelEmpty>
      ) : (
        <ul className="divide-y divide-line-soft">
          {sorted.map((contact) => {
            const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : null;
            return (
              <PanelRow key={contact.id} onDelete={() => setConfirmDeleteId(contact.id)} deleteLabel={`Excluir "${contact.name}"`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11px] font-semibold text-gold-fg" aria-hidden="true">
                  {initialsOf(contact.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-fg">{contact.name}</span>
                  <span className="block truncate text-xs text-fg-3">{[contact.category, contact.phone].filter(Boolean).join(" · ") || "sem telefone"}</span>
                </span>
                {contact.phone && (
                  <IconButton
                    label={copiedId === contact.id ? "Copiado" : "Copiar telefone"}
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(contact.phone!);
                      setCopiedId(contact.id);
                      window.setTimeout(() => setCopiedId((current) => (current === contact.id ? null : current)), 1500);
                    }}
                    className="hidden sm:inline-flex"
                  >
                    <CopyIcon />
                  </IconButton>
                )}
                {phoneHref && (
                  <a href={phoneHref} aria-label={`Ligar para ${contact.name}`} title="Ligar" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gold-fg hover:bg-gold-soft">
                    <PhoneIcon size={16} />
                  </a>
                )}
              </PanelRow>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={confirmContact !== null}
        title={`Excluir "${confirmContact?.name}"?`}
        description="O contato sai da sua lista. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmContact) deleteContact.mutate(confirmContact.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </PanelShell>
  );
}
