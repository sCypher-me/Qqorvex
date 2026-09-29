import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cx } from "@qqorvex/ui";
import { compareTasksForAction, DUE_BUCKET_LABEL, dueBucketOf, localDateKey, type DueBucket } from "../service";
import type { TaskWithConditions } from "../types";
import { TaskRow, type TaskRowActions } from "./TaskRow";

const BUCKET_ORDER: DueBucket[] = ["atrasadas", "hoje", "amanha", "semana", "depois", "sem_prazo"];

export type TaskGrouping = "prazo" | "prioridade" | "nenhum";

const PRIORITY_GROUPS: Array<{ key: TaskWithConditions["priority"]; label: string }> = [
  { key: "alta", label: "Prioridade alta" },
  { key: "media", label: "Prioridade média" },
  { key: "baixa", label: "Prioridade baixa" },
  { key: "sem_prioridade", label: "Sem prioridade" },
];

/** Lista de tarefas agrupada (por prazo ou prioridade), com grupos recolhíveis. */
export function TaskList({
  tasks,
  actions,
  grouping = "prazo",
  selectedId,
  metaFor,
}: {
  tasks: TaskWithConditions[];
  actions: TaskRowActions;
  grouping?: TaskGrouping;
  selectedId?: string | null;
  metaFor?: (task: TaskWithConditions) => string | undefined;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sorted = [...tasks].sort(compareTasksForAction);
  const today = localDateKey();

  const open = sorted.filter((task) => task.status !== "concluido");
  const done = sorted.filter((task) => task.status === "concluido");

  let groups: Array<{ key: string; label: string; tasks: TaskWithConditions[]; tone?: "danger" | "gold" }>;
  if (grouping === "prazo") {
    groups = BUCKET_ORDER.map((bucket) => ({
      key: bucket,
      label: DUE_BUCKET_LABEL[bucket],
      tasks: open.filter((task) => dueBucketOf(task.due_date, today) === bucket),
      tone: bucket === "atrasadas" ? ("danger" as const) : bucket === "hoje" ? ("gold" as const) : undefined,
    }));
    // Concluídas ficam num grupo próprio no fim (recolhido por padrão).
    groups.push({ key: "concluidas", label: "Concluídas", tasks: done });
  } else if (grouping === "prioridade") {
    groups = PRIORITY_GROUPS.map((group) => ({ key: group.key, label: group.label, tasks: sorted.filter((task) => task.priority === group.key) }));
  } else {
    groups = [{ key: "all", label: "", tasks: sorted }];
  }
  const finalGroups = groups.filter((group) => group.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {finalGroups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? group.key === "concluidas";
        return (
          <section key={group.key} aria-label={group.label || "Tarefas"} className="overflow-hidden rounded-xl border border-line bg-surface">
            {group.label && (
              <button
                type="button"
                onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="flex h-10 w-full items-center gap-2 border-b border-line-soft px-3 text-left transition-colors hover:bg-hover sm:px-4"
              >
                <CaretDownIcon size={12} weight="bold" className={cx("text-fg-4 transition-transform", isCollapsed && "-rotate-90")} />
                <span className={cx("text-[13px] font-semibold", group.tone === "danger" ? "text-danger" : group.tone === "gold" ? "text-gold-fg" : "text-fg-2")}>{group.label}</span>
                <span className="text-xs tabular-nums text-fg-4">{group.tasks.length}</span>
              </button>
            )}
            {!isCollapsed && (
              <ul className="divide-y divide-line-soft">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} actions={actions} selected={selectedId === task.id} meta={metaFor?.(task)} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
