import { useState } from "react";
import { BrainIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useVexMemories, useVexMemoryMutations, VEX_MEMORY_MAX_CHARS } from "@qqorvex/vex";
import { Button, ConfirmDialog, IconButton, Notice, SkeletonList, useToast } from "@qqorvex/ui";
import { supabase } from "../app/supabase";
import { SettingsCard } from "./shared";

/**
 * O que a Vex lembra entre conversas — só o que a pessoa pediu (e confirmou). Dá para editar e
 * apagar cada item; apagar tudo também.
 */
export function VexMemorySettings() {
  const { toast } = useToast();
  const memories = useVexMemories(supabase);
  const { update, remove } = useVexMemoryMutations(supabase);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | "all" | null>(null);
  const items = memories.data ?? [];

  async function save(id: string) {
    const content = draft.trim();
    if (!content) return;
    try {
      await update.mutateAsync({ id, content });
      setEditingId(null);
      toast({ title: "Memória atualizada", tone: "success" });
    } catch {
      toast({ title: "Não foi possível salvar", tone: "danger" });
    }
  }

  async function confirmDelete() {
    const target = deleteId;
    setDeleteId(null);
    if (!target) return;
    try {
      if (target === "all") await Promise.all(items.map((item) => remove.mutateAsync(item.id)));
      else await remove.mutateAsync(target);
      toast({ title: target === "all" ? "A Vex esqueceu tudo" : "Memória apagada", tone: "success" });
    } catch {
      toast({ title: "Não foi possível apagar", tone: "danger" });
    }
  }

  return (
    <SettingsCard
      id="memoria-vex"
      title="Memória da Vex"
      description='O que a Vex lembra entre conversas. Ela só guarda o que você pede ("lembre que…") e confirma no cartão.'
      aside={items.length > 0 ? <span className="text-xs tabular-nums text-fg-3">{items.length}</span> : undefined}
    >
      {memories.isLoading ? (
        <SkeletonList rows={2} />
      ) : memories.error ? (
        <Notice compact>Não foi possível carregar as memórias.</Notice>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-fg-3">
          <BrainIcon size={16} className="shrink-0" /> Nada guardado. Peça à Vex: &ldquo;lembre que prefiro reuniões depois das 10h&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft rounded-lg border border-line-soft">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 px-3 py-2">
              {editingId === item.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(item.id);
                  }}
                >
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={VEX_MEMORY_MAX_CHARS} aria-label="Editar memória" className="q-input min-w-0 flex-1" data-size="sm" autoFocus />
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" loading={update.isPending} disabled={!draft.trim()}>
                      Salvar
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="min-w-0 flex-1 py-1 text-[13.5px] text-fg">{item.content}</p>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="Editar memória"
                    onClick={() => {
                      setEditingId(item.id);
                      setDraft(item.content);
                    }}
                  >
                    <PencilSimpleIcon />
                  </IconButton>
                  <IconButton size="sm" variant="ghost" label="Apagar memória" onClick={() => setDeleteId(item.id)}>
                    <TrashIcon />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length > 1 && (
        <Button variant="ghost" size="sm" className="self-start text-danger" onClick={() => setDeleteId("all")}>
          Apagar todas
        </Button>
      )}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title={deleteId === "all" ? "Apagar todas as memórias?" : "Apagar esta memória?"}
        description="A Vex deixa de usar isso nas próximas conversas."
        confirmLabel="Apagar"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </SettingsCard>
  );
}
