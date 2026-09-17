import { useState, type ReactNode } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, ChipTabs, EmptyState } from "@qqorvex/ui";
import {
  useCreateIdea,
  useCreatePlan,
  useCreateProject,
  useDeleteIdea,
  useDeletePlan,
  useDeleteProject,
  useIdeas,
  usePlans,
  useProjects,
  useUpdatePlanStatus,
  useUpdateProjectStatus,
  AssetsPanel,
  DailyCheckinForm,
  IdeaCard,
  ImportantPurchasesPanel,
  NewIdeaForm,
  NewPlanForm,
  NewProjectForm,
  PlanCard,
  PomodoroTimer,
  ProjectCard,
  ShoppingListPanel,
  UsefulContactsPanel,
  VehiclesPanel,
} from "@qqorvex/module-vida-pessoal";
import { supabase } from "../app/supabase";

type Bloco = "planejamento" | "bem-estar" | "pratica";
type Coluna = "planos" | "projetos" | "ideias";

const BLOCO_OPTIONS: { value: Bloco; label: string }[] = [
  { value: "planejamento", label: "Planejamento" },
  { value: "bem-estar", label: "Bem-estar" },
  { value: "pratica", label: "Vida Prática" },
];

/**
 * Vida Pessoal — módulo recriado com o usuário em 11/09/2026 (o Xmind original dessa parte foi
 * perdido, ver docs/decisions/vida-pessoal-design.md). Uma rota só, com abas internas pros 3
 * blocos — não vira 3 itens separados no menu principal.
 */
export function VidaPessoalPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [bloco, setBloco] = useState<Bloco>("planejamento");
  const [formAberto, setFormAberto] = useState<Coluna | null>(null);

  const { plans, isLoading: plansLoading } = usePlans(supabase);
  const createPlan = useCreatePlan(supabase, userId);
  const updatePlanStatus = useUpdatePlanStatus(supabase);
  const deletePlan = useDeletePlan(supabase);

  const { projects, isLoading: projectsLoading } = useProjects(supabase);
  const createProject = useCreateProject(supabase, userId);
  const updateProjectStatus = useUpdateProjectStatus(supabase);
  const deleteProject = useDeleteProject(supabase);

  const { ideas, isLoading: ideasLoading } = useIdeas(supabase);
  const createIdea = useCreateIdea(supabase, userId);
  const deleteIdea = useDeleteIdea(supabase);

  const fecharForm = () => setFormAberto(null);

  return (
    <div className="flex flex-col gap-[18px]">
      <ChipTabs options={BLOCO_OPTIONS} value={bloco} onChange={setBloco} />

      {bloco === "planejamento" && (
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,minmax(0,1fr))] gap-5 items-start">
          <PlanningColumn
            title="Planos"
            count={plans.length}
            isLoading={plansLoading}
            emptyText="Nenhum plano ainda."
            formOpen={formAberto === "planos"}
            onOpenForm={() => setFormAberto("planos")}
            form={
              <NewPlanForm
                onCreate={(input) => {
                  createPlan.mutate(input);
                  fecharForm();
                }}
                onCancel={fecharForm}
              />
            }
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                client={supabase}
                plan={plan}
                onChangeStatus={(status) => updatePlanStatus.mutate({ planId: plan.id, status })}
                onDelete={() => deletePlan.mutate(plan.id)}
              />
            ))}
          </PlanningColumn>

          <PlanningColumn
            title="Projetos"
            count={projects.length}
            isLoading={projectsLoading}
            emptyText="Nenhum projeto ainda."
            formOpen={formAberto === "projetos"}
            onOpenForm={() => setFormAberto("projetos")}
            form={
              <NewProjectForm
                onCreate={(title) => {
                  createProject.mutate({ title });
                  fecharForm();
                }}
                onCancel={fecharForm}
              />
            }
          >
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                client={supabase}
                project={project}
                onChangeStatus={(status) => updateProjectStatus.mutate({ projectId: project.id, status })}
                onDelete={() => deleteProject.mutate(project.id)}
              />
            ))}
          </PlanningColumn>

          <PlanningColumn
            title="Ideias"
            count={ideas.length}
            isLoading={ideasLoading}
            emptyText="Nenhuma ideia capturada ainda."
            formOpen={formAberto === "ideias"}
            onOpenForm={() => setFormAberto("ideias")}
            form={
              <NewIdeaForm
                onCreate={(input) => {
                  createIdea.mutate(input);
                  fecharForm();
                }}
                onCancel={fecharForm}
              />
            }
          >
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onDelete={() => deleteIdea.mutate(idea.id)} />
            ))}
          </PlanningColumn>
        </div>
      )}

      {bloco === "bem-estar" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <DailyCheckinForm client={supabase} userId={userId} />
          <PomodoroTimer client={supabase} userId={userId} />
        </div>
      )}

      {bloco === "pratica" && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 items-start">
          <UsefulContactsPanel client={supabase} userId={userId} />
          <VehiclesPanel client={supabase} userId={userId} />
          <AssetsPanel client={supabase} userId={userId} />
          <ImportantPurchasesPanel client={supabase} userId={userId} />
          <ShoppingListPanel client={supabase} userId={userId} />
        </div>
      )}
    </div>
  );
}

function PlanningColumn({
  title,
  count,
  isLoading,
  emptyText,
  formOpen,
  onOpenForm,
  form,
  children,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  emptyText: string;
  formOpen: boolean;
  onOpenForm: () => void;
  form: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2.5">
        <h2 className="font-display text-[17px] font-semibold text-text-primary">{title}</h2>
        {!isLoading && <span className="font-mono text-xs text-text-muted">{count}</span>}
      </div>

      {isLoading ? <EmptyState>Carregando...</EmptyState> : count === 0 && !formOpen ? <EmptyState>{emptyText}</EmptyState> : children}

      {formOpen ? (
        <div className="qv-card p-4">{form}</div>
      ) : (
        <Button type="button" variant="dashed" className="w-full" onClick={onOpenForm}>
          Adicionar
        </Button>
      )}
    </section>
  );
}
