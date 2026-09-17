import { useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Button, Badge, ConfirmDialog, type BadgeTone } from "@qqorvex/ui";
import { useTasks } from "@qqorvex/module-tarefas";
import { useLinkTaskToProject, useProjectTaskRelations, useUnlinkTaskFromProject } from "../hooks/useVidaPessoal";
import type { Project, PlanStatus } from "../types";

const STATUS_LABEL: Record<PlanStatus, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

/** ativo = em andamento (cyan) · arquivado = parado (âmbar) · concluído = sucesso (verde). */
const STATUS_TONE: Record<PlanStatus, BadgeTone> = {
  ativo: "info",
  concluido: "success",
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
  const [tasksOpen, setTasksOpen] = useState(false);

  return (
    <div className="qv-card p-4 flex flex-col gap-[9px]">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-[1.35] text-text-primary">{project.title}</span>
        <button
          type="button"
          className="qv-icon-btn w-6 h-6 text-[11px] shrink-0"
          aria-label={`Excluir "${project.title}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>
      <span className="text-[13px] leading-normal text-text-secondary">
        {project.description ? (
          project.description
        ) : (
          <>
            <span className="font-mono text-xs">{linkedTasks.length}</span>{" "}
            {linkedTasks.length === 1 ? "tarefa vinculada" : "tarefas vinculadas"}
          </>
        )}
      </span>
      <Badge tone={STATUS_TONE[project.status]} className="self-start">
        {STATUS_LABEL[project.status]}
      </Badge>

      <div className="qv-row-top pt-[9px] flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant="ghost" size="xs" aria-expanded={tasksOpen} onClick={() => setTasksOpen((v) => !v)}>
          Tarefas <span className="font-mono text-text-muted">{linkedTasks.length}</span>
          <span aria-hidden>{tasksOpen ? "‹" : "›"}</span>
        </Button>
        <span className="flex-1" />
        {project.status === "ativo" && <StatusButton label="Concluir" onClick={() => onChangeStatus("concluido")} />}
        {project.status !== "arquivado" && <StatusButton label="Arquivar" onClick={() => onChangeStatus("arquivado")} />}
        {project.status !== "ativo" && <StatusButton label="Reativar" onClick={() => onChangeStatus("ativo")} />}
      </div>

      {tasksOpen && (
        <div className="flex flex-col gap-2">
          <span className="qv-eyebrow">Tarefas vinculadas</span>
          {linkedTasks.length === 0 ? (
            <p className="text-[13px] text-text-secondary">Nenhuma tarefa vinculada ainda.</p>
          ) : (
            <ul className="flex flex-col">
              {linkedTasks.map((task) => (
                <li key={task.id} className="qv-row flex items-center gap-2 py-1.5 text-[13px] text-text-primary">
                  <span className="flex-1 min-w-0">{task.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => unlinkTask.mutate({ projectId: project.id, taskId: task.id })}
                  >
                    Desvincular
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {linkableTasks.length > 0 && (
            <select
              defaultValue=""
              aria-label="Vincular uma tarefa"
              onChange={(e) => {
                if (!e.target.value) return;
                linkTask.mutate({ projectId: project.id, taskId: e.target.value });
                e.target.value = "";
              }}
              className="qv-field py-2 text-[13px]"
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
      )}

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
  );
}

function StatusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="quiet" size="xs" onClick={onClick}>
      {label}
    </Button>
  );
}
