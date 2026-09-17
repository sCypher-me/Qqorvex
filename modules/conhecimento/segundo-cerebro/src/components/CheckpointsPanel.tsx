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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-base font-semibold text-text-primary">Histórico</span>
        <Button variant="secondary" size="sm" onClick={() => createCheckpoint.mutate()} disabled={createCheckpoint.isPending}>
          Salvar checkpoint
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : checkpoints.length === 0 ? (
        <p className="text-sm leading-relaxed text-text-secondary">Nenhum checkpoint salvo ainda.</p>
      ) : (
        <ul className="flex flex-col">
          {checkpoints.map((checkpoint) => (
            <li key={checkpoint.id} className="qv-row flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium text-text-primary">{checkpoint.title}</span>
                <span className="font-mono text-[11px] text-text-muted">
                  {new Date(checkpoint.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Button
                type="button"
                variant="quiet"
                size="xs"
                onClick={() => restoreCheckpoint.mutate(checkpoint)}
                disabled={restoreCheckpoint.isPending}
              >
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
