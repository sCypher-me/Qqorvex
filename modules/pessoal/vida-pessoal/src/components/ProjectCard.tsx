import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Card, Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useTasks } from "@qqorvex/module-tarefas";
import { useLinkTaskToProject, useProjectTaskRelations, useUnlinkTaskFromProject } from "../hooks/useVidaPessoal";
import type { Project, PlanStatus } from "../types";

const STATUS_LABEL: Record<PlanStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  ativo: "success",
  concluido: "info",
  arquivado: "warning",
};

/** Um Projeto é só um agrupador de Tarefas já existentes — nunca duplica o Kanban. */
export function ProjectCard({
  client,
  project,
  onChangeStatus,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  project: Project;
  onChangeStatus: (status: PlanStatus) => void;
  onDelete: () => void;
}) {
  const { tasks } = useTasks(client);
  const { relations } = useProjectTaskRelations(client);
  const linkTask = useLinkTaskToProject(client);
  const unlinkTask = useUnlinkTaskFromProject(client);

  const linkedTaskIds = new Set(relations.filter((r) => r.project_id === project.id).map((r) => r.task_id));
  const linkedTasks = tasks.filter((t) => linkedTaskIds.has(t.id));
  const linkableTasks = tasks.filter((t) => !linkedTaskIds.has(t.id));
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold text-text-primary">{project.title}</p>
          <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
        </div>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={`Excluir "${project.title}"?`}
          description="Essa ação não pode ser desfeita."
          onConfirm={() => {
            setConfirmOpen(false);
            onDelete();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {project.status === "ativo" && (
          <StatusButton label="Concluir" onClick={() => onChangeStatus("concluido")} />
        )}
        {project.status !== "arquivado" && <StatusButton label="Arquivar" onClick={() => onChangeStatus("arquivado")} />}
        {project.status !== "ativo" && <StatusButton label="Reativar" onClick={() => onChangeStatus("ativo")} />}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-xs text-text-secondary-warm">Tarefas vinculadas</p>
        {linkedTasks.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary-warm">Nenhuma tarefa vinculada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {linkedTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 text-sm text-text-primary">
                <span>{task.title}</span>
                <Button type="button" variant="chip" onClick={() => unlinkTask.mutate({ projectId: project.id, taskId: task.id })}>
                  Desvincular
                </Button>
              </li>
            ))}
          </ul>
        )}

        {linkableTasks.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              linkTask.mutate({ projectId: project.id, taskId: e.target.value });
              e.target.value = "";
            }}
            className="mt-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
          >
            <option value="">Vincular uma tarefa...</option>
            {linkableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </Card>
  );
}

function StatusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="chip" onClick={onClick}>
      {label}
    </Button>
  );
}
