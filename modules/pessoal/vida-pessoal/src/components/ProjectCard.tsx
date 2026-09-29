import { useState } from "react";
import { CaretDownIcon, CheckCircleIcon, CircleIcon, ListChecksIcon, XIcon } from "@phosphor-icons/react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { Badge, ConfirmDialog, IconButton, ProgressBar, cx } from "@qqorvex/ui";
import { useTasks } from "@qqorvex/module-tarefas";
import { useLinkTaskToProject, useProjectTaskRelations, useUnlinkTaskFromProject } from "../hooks/useVidaPessoal";
import type { Project, PlanStatus } from "../types";
import { PLAN_STATUS_LABEL, PLAN_STATUS_TONE, statusMenu } from "./PlanCard";
import { KebabMenu } from "./PanelShell";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const linkedTaskIds = new Set(relations.filter((r) => r.project_id === project.id).map((r) => r.task_id));
  const linkedTasks = tasks.filter((t) => linkedTaskIds.has(t.id)).sort((a, b) => Number(a.status === "concluido") - Number(b.status === "concluido"));
  const linkableTasks = tasks.filter((t) => !linkedTaskIds.has(t.id) && t.status !== "concluido");
  const doneCount = linkedTasks.filter((task) => task.status === "concluido").length;
  const percent = linkedTasks.length ? Math.round((doneCount / linkedTasks.length) * 100) : 0;

  return (
    <article className={cx("min-w-0 rounded-xl border border-line bg-surface", project.status !== "ativo" && "opacity-75")}>
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold leading-snug text-fg">{project.title}</h3>
          {project.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-2">{project.description}</p>}
        </div>
        {project.status !== "ativo" && <Badge tone={PLAN_STATUS_TONE[project.status]}>{PLAN_STATUS_LABEL[project.status]}</Badge>}
        <KebabMenu label={`Ações para ${project.title}`} items={statusMenu(project.status, onChangeStatus, () => setConfirmOpen(true))} />
      </div>

      <button type="button" onClick={() => setTasksOpen((value) => !value)} aria-expanded={tasksOpen} className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-2.5 text-left hover:bg-hover">
        <ListChecksIcon size={15} className="shrink-0 text-fg-3" />
        <span className="shrink-0 text-xs text-fg-2">{linkedTasks.length ? `${doneCount}/${linkedTasks.length} tarefas` : "Vincular tarefas"}</span>
        {linkedTasks.length > 0 ? <ProgressBar value={percent} height={4} className="flex-1" tone={percent >= 100 ? "success" : "gold"} label="Tarefas concluídas" /> : <span className="flex-1" />}
        <CaretDownIcon size={12} className={cx("shrink-0 text-fg-4 transition-transform", !tasksOpen && "-rotate-90")} />
      </button>

      {tasksOpen && (
        <div className="flex flex-col gap-2 border-t border-line-soft bg-canvas/40 px-4 py-3">
          {linkedTasks.length === 0 ? (
            <p className="text-[13px] text-fg-3">Agrupe aqui as tarefas que fazem este projeto andar. Elas continuam no seu quadro de Tarefas.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {linkedTasks.map((task) => {
                const done = task.status === "concluido";
                return (
                  <li key={task.id} className="flex items-center gap-2.5">
                    {done ? <CheckCircleIcon size={16} weight="fill" className="shrink-0 text-success" /> : <CircleIcon size={16} className="shrink-0 text-fg-4" />}
                    <span className={cx("min-w-0 flex-1 truncate text-[13px]", done ? "text-fg-3 line-through" : "text-fg")}>{task.title}</span>
                    <IconButton label={`Desvincular ${task.title}`} variant="ghost" size="xs" onClick={() => unlinkTask.mutate({ projectId: project.id, taskId: task.id })}>
                      <XIcon />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
          {linkableTasks.length > 0 && (
            <select
              value=""
              aria-label="Vincular uma tarefa"
              onChange={(event) => {
                if (event.target.value) linkTask.mutate({ projectId: project.id, taskId: event.target.value });
              }}
              data-size="sm"
              className="q-input"
            >
              <option value="">+ Vincular uma tarefa…</option>
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
        description="As tarefas vinculadas continuam no seu quadro de Tarefas."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  );
}
