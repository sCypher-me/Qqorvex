import { useState } from "react";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, ConfirmDialog, SkeletonList, useToast } from "@qqorvex/ui";
import { useCheckpoints, useCreateCheckpoint, useRestoreCheckpoint } from "../hooks/usePageDetail";
import type { PageCheckpoint } from "../types";

/**
 * Versões salvas da página. Restaurar guarda o estado atual como uma versão automática antes
 * (como um git revert, não um reset)
 */
export function CheckpointsPanel({ client, pageId }: { client: SupabaseClient<Database>; pageId: string }) {
  const { toast } = useToast();
  const { checkpoints, isLoading } = useCheckpoints(client, pageId);
  const createCheckpoint = useCreateCheckpoint(client, pageId);
  const restoreCheckpoint = useRestoreCheckpoint(client, pageId);
  const [restoring, setRestoring] = useState<PageCheckpoint | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <SkeletonList rows={2} subtitle={false} className="py-2" />
      ) : checkpoints.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-fg-3">Salve uma versão antes de grandes mudanças para poder voltar depois.</p>
      ) : (
        <ul className="flex max-h-60 flex-col overflow-y-auto">
          {checkpoints.map((checkpoint) => (
            <li key={checkpoint.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-hover">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-fg">{checkpoint.title}</p>
                <p className="text-[11px] text-fg-4">{new Date(checkpoint.created_at).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setRestoring(checkpoint)} disabled={restoreCheckpoint.isPending} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" size="sm" leadingIcon={<BookmarkSimpleIcon size={14} />} onClick={() => createCheckpoint.mutate(undefined, { onSuccess: () => toast({ title: "Versão salva", tone: "success" }) })} loading={createCheckpoint.isPending}>
        Salvar versão atual
      </Button>
      <ConfirmDialog
        isOpen={restoring !== null}
        title="Restaurar esta versão?"
        description={restoring ? `O conteúdo volta para “${restoring.title}”. O estado atual é guardado como uma nova versão, então nada se perde.` : undefined}
        confirmLabel="Restaurar"
        destructive={false}
        onCancel={() => setRestoring(null)}
        onConfirm={() => {
          const target = restoring;
          setRestoring(null);
          if (target) restoreCheckpoint.mutate(target, { onSuccess: () => toast({ title: "Versão restaurada", tone: "success" }) });
        }}
      />
    </div>
  );
}
