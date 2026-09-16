import { useState } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button } from "@qqorvex/ui";
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

const BLOCO_LABEL: Record<Bloco, string> = {
  planejamento: "Planejamento",
  "bem-estar": "Bem-estar",
  pratica: "Vida Prática",
};

/**
 * Vida Pessoal — módulo recriado com o usuário em 11/09/2026 (o Xmind original dessa parte foi
 * perdido, ver docs/decisions/vida-pessoal-design.md). Uma rota só, com abas internas pros 3
 * blocos — não vira 3 itens separados no menu principal.
 */
export function VidaPessoalPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [bloco, setBloco] = useState<Bloco>("planejamento");

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

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-text-primary">Vida Pessoal</h1>
      </div>

      <div className="w-full max-w-2xl flex gap-2">
        {(Object.keys(BLOCO_LABEL) as Bloco[]).map((b) => (
          <Button key={b} type="button" variant={bloco === b ? "chip-accent" : "chip"} onClick={() => setBloco(b)}>
            {BLOCO_LABEL[b]}
          </Button>
        ))}
      </div>

      {bloco === "planejamento" && (
        <>
          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Planos</h2>
            <NewPlanForm onCreate={(input) => createPlan.mutate(input)} />
            {plansLoading ? (
              <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
            ) : plans.length === 0 ? (
              <p className="font-sans text-sm text-text-secondary-warm">Nenhum plano ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    client={supabase}
                    plan={plan}
                    onChangeStatus={(status) => updatePlanStatus.mutate({ planId: plan.id, status })}
                    onDelete={() => deletePlan.mutate(plan.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Projetos</h2>
            <NewProjectForm onCreate={(title) => createProject.mutate({ title })} />
            {projectsLoading ? (
              <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
            ) : projects.length === 0 ? (
              <p className="font-sans text-sm text-text-secondary-warm">Nenhum projeto ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    client={supabase}
                    project={project}
                    onChangeStatus={(status) => updateProjectStatus.mutate({ projectId: project.id, status })}
                    onDelete={() => deleteProject.mutate(project.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Ideias</h2>
            <NewIdeaForm onCreate={(input) => createIdea.mutate(input)} />
            {ideasLoading ? (
              <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
            ) : ideas.length === 0 ? (
              <p className="font-sans text-sm text-text-secondary-warm">Nenhuma ideia capturada ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {ideas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onDelete={() => deleteIdea.mutate(idea.id)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {bloco === "bem-estar" && (
        <section className="w-full max-w-2xl flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">Check-in diário</h2>
          <DailyCheckinForm client={supabase} userId={userId} />
          <h2 className="font-display text-lg font-semibold text-text-primary mt-2">Pomodoro</h2>
          <PomodoroTimer client={supabase} userId={userId} />
        </section>
      )}

      {bloco === "pratica" && (
        <>
          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Contatos Úteis</h2>
            <UsefulContactsPanel client={supabase} userId={userId} />
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Veículos</h2>
            <VehiclesPanel client={supabase} userId={userId} />
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Bens e Inventário</h2>
            <AssetsPanel client={supabase} userId={userId} />
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Compras Importantes</h2>
            <ImportantPurchasesPanel client={supabase} userId={userId} />
          </section>

          <section className="w-full max-w-2xl flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold text-text-primary">Lista de Compras</h2>
            <ShoppingListPanel client={supabase} userId={userId} />
          </section>
        </>
      )}
    </main>
  );
}
