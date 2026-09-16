import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button } from "@qqorvex/ui";
import { useCheckpoints, useCreateCheckpoint, useRestoreCheckpoint } from "../hooks/usePageDetail";

/**
 * Restaurar arquiva o estado atual como um checkpoint automático antes (git revert, não git
 * reset) — ver docs/decisions/segundo-cerebro-checkpoints-design.md.
 */
export function CheckpointsPanel({ client, pageId }: { client: SupabaseClient<Database>; pageId: string }) {
  const { checkpoints, isLoading } = useCheckpoints(client, pageId);
  const createCheckpoint = useCreateCheckpoint(client, pageId);
  const restoreCheckpoint = useRestoreCheckpoint(client, pageId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-text-primary">Histórico</h2>
        <Button variant="secondary" onClick={() => createCheckpoint.mutate()} disabled={createCheckpoint.isPending}>
          Salvar checkpoint
        </Button>
      </div>

      {isLoading ? (
        <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
      ) : checkpoints.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary-warm">Nenhum checkpoint salvo ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {checkpoints.map((checkpoint) => (
            <li
              key={checkpoint.id}
              className="flex items-center justify-between gap-2 text-sm text-text-primary bg-surface-2 border border-border rounded-md p-2"
            >
              <span>
                {checkpoint.title} — {new Date(checkpoint.created_at).toLocaleString("pt-BR")}
              </span>
              <button
                type="button"
                onClick={() => restoreCheckpoint.mutate(checkpoint)}
                disabled={restoreCheckpoint.isPending}
                className="text-xs px-2 py-1 rounded-md border border-border text-text-primary hover:bg-surface-1"
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
