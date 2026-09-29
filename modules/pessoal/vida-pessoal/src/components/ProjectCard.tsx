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
  userId,
  onChangeStatus,
  onDelete,
}: {
  client: SupabaseClient<Database>;
  project: Project;
  userId: string;
  onChangeStatus: (status: PlanStatus) => void;
  onDelete: () => void;
}) {
  const { tasks } = useTasks(client, userId);
  const { relations } = useProjectTaskRelations(client);
  const linkTask = useLinkTaskToProject(client);
  const unlinkTask = useUnlinkTaskFromProject(client);

  const linkedTaskIds = new Set(relations.filter((r) => r.project_id === project.id).map((r) => r.task_id));
  const linkedTasks = tasks.filter((t) => linkedTaskIds.has(t.id));
  const linkableTasks = tasks.filter((t) => !linkedTaskIds.has(t.id));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-4 flex flex-col gap-[9px]">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm font-semibold leading-[1.35] text-fg">{project.title}</span>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-hover hover:text-fg disabled:opacity-40 w-6 h-6 text-[11px] shrink-0"
          aria-label={`Excluir "${project.title}"`}
          title="Excluir"
          onClick={() => setConfirmOpen(true)}
        >
          ✕
        </button>
      </div>
      <span className="text-[13px] leading-normal text-fg-2">
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

      <div className="border-t border-line-soft pt-[9px] flex items-center gap-1.5 flex-wrap">
        <Button type="button" variant="ghost" size="xs" aria-expanded={tasksOpen} onClick={() => setTasksOpen((v) => !v)}>
          Tarefas <span className="font-mono text-fg-3">{linkedTasks.length}</span>
          <span aria-hidden>{tasksOpen ? "‹" : "›"}</span>
        </Button>
        <span className="flex-1" />
        {project.status === "ativo" && <StatusButton label="Concluir" onClick={() => onChangeStatus("concluido")} />}
        {project.status !== "arquivado" && <StatusButton label="Arquivar" onClick={() => onChangeStatus("arquivado")} />}
        {project.status !== "ativo" && <StatusButton label="Reativar" onClick={() => onChangeStatus("ativo")} />}
      </div>

      {tasksOpen && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4">Tarefas vinculadas</span>
          {linkedTasks.length === 0 ? (
            <p className="text-[13px] text-fg-2">Nenhuma tarefa vinculada ainda.</p>
          ) : (
            <ul className="flex flex-col">
              {linkedTasks.map((task) => (
                <li key={task.id} className="border-b border-line-soft last:border-b-0 flex items-center gap-2 py-1.5 text-[13px] text-fg">
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
              className="q-input py-2 text-[13px]"
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
