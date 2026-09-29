import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { FolderSimpleIcon, LightbulbIcon, MagnifyingGlassIcon, CompassIcon, PlusIcon } from "@phosphor-icons/react";
import {
  AssetsPanel,
  DailyCheckinForm,
  IdeaCard,
  ImportantPurchasesPanel,
  NewPlanForm,
  NewProjectForm,
  PlanCard,
  PomodoroTimer,
  ProjectCard,
  ShoppingListPanel,
  UsefulContactsPanel,
  VehiclesPanel,
  completedPomodoroMinutesThisWeek,
  localDateKey,
  useCheckinHistory,
  useCreateIdea,
  useCreatePlan,
  useCreateProject,
  useDeleteIdea,
  useDeletePlan,
  useDeleteProject,
  useIdeas,
  usePlans,
  usePomodoroSessions,
  useProjects,
  useUpdatePlanStatus,
  useUpdateProjectStatus,
  type Idea,
  type PlanStatus,
} from "@qqorvex/module-vida-pessoal";
import { Button, IconButton, Modal, PageContainer, PageHeader, Segmented, SkeletonCards, Tabs, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type Tab = "planejamento" | "bem-estar" | "pratica";
const TABS: Tab[] = ["planejamento", "bem-estar", "pratica"];

/**
 * Vida Pessoal — uma rota com três abas: Planejamento (planos, projetos e ideias), Bem-estar
 * (check-in diário e foco) e Vida prática (listas, veículos, bens e contatos).
 */
export function VidaPessoalPage() {
  const { userId: accountUserId } = useAccount();
  const userId = accountUserId ?? "";
  usePageMeta({ title: "Pessoal" });
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("aba") as Tab) ? (params.get("aba") as Tab) : "planejamento";
  const setTab = (next: Tab) =>
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === "planejamento") copy.delete("aba");
        else copy.set("aba", next);
        return copy;
      },
      { replace: true },
    );

  const { plans } = usePlans(supabase);
  const { projects } = useProjects(supabase);
  const { ideas } = useIdeas(supabase);
  const today = localDateKey(new Date());
  const { checkins } = useCheckinHistory(supabase, userId, 30);
  const { sessions } = usePomodoroSessions(supabase);
  const [modal, setModal] = useState<"plano" | "projeto" | null>(null);
  const createPlan = useCreatePlan(supabase, userId);
  const createProject = useCreateProject(supabase, userId);

  const activePlans = plans.filter((plan) => plan.status === "ativo").length;
  const activeProjects = projects.filter((project) => project.status === "ativo").length;
  const checkinToday = checkins.some((checkin) => checkin.checkin_date === today);
  const focusMinutes = completedPomodoroMinutesThisWeek(sessions, new Date());

  const description =
    tab === "planejamento"
      ? `${activePlans} ${activePlans === 1 ? "plano ativo" : "planos ativos"} · ${activeProjects} ${activeProjects === 1 ? "projeto em andamento" : "projetos em andamento"} · ${ideas.length} ${ideas.length === 1 ? "ideia" : "ideias"}`
      : tab === "bem-estar"
        ? `${checkinToday ? "Check-in de hoje feito" : "Check-in de hoje pendente"} · ${focusMinutes} min de foco nesta semana`
        : "Listas, veículos, bens e contatos que mantêm a casa funcionando";

  return (
    <PageContainer>
      <PageHeader
        title="Pessoal"
        description={description}
        actions={
          tab === "planejamento" ? (
            <>
              <Button variant="secondary" leadingIcon={<FolderSimpleIcon size={16} />} onClick={() => setModal("projeto")}>
                Novo projeto
              </Button>
              <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setModal("plano")}>
                Novo plano
              </Button>
            </>
          ) : undefined
        }
      >
        <Tabs<Tab>
          label="Seções"
          value={tab}
          onChange={setTab}
          options={[
            { value: "planejamento", label: "Planejamento" },
            { value: "bem-estar", label: "Bem-estar" },
            { value: "pratica", label: "Vida prática" },
          ]}
        />
      </PageHeader>

      {tab === "planejamento" && <PlanningTab userId={userId} onNewPlan={() => setModal("plano")} onNewProject={() => setModal("projeto")} />}

      {tab === "bem-estar" && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <DailyCheckinForm client={supabase} userId={userId} />
          <PomodoroTimer client={supabase} userId={userId} />
        </div>
      )}

      {tab === "pratica" && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-5">
            <ShoppingListPanel client={supabase} userId={userId} />
            <ImportantPurchasesPanel client={supabase} userId={userId} />
            <AssetsPanel client={supabase} userId={userId} />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <VehiclesPanel client={supabase} userId={userId} />
            <UsefulContactsPanel client={supabase} userId={userId} />
          </div>
        </div>
      )}

      <Modal isOpen={modal === "plano"} onClose={() => setModal(null)} title="Novo plano" description="Uma direção ampla — depois vincule as metas que levam até ela." size="md">
        <NewPlanForm
          onCreate={async (input) => {
            await createPlan.mutateAsync(input);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>
      <Modal isOpen={modal === "projeto"} onClose={() => setModal(null)} title="Novo projeto" description="Agrupe tarefas que fazem uma entrega andar." size="md">
        <NewProjectForm
          onCreate={async (input) => {
            await createProject.mutateAsync(input);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </PageContainer>
  );
}

type StatusFilter = "ativo" | "concluido" | "arquivado";

function PlanningTab({ userId, onNewPlan, onNewProject }: { userId: string; onNewPlan: () => void; onNewProject: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ativo");
  const [ideaTitle, setIdeaTitle] = useState("");

  const { plans, isLoading: plansLoading } = usePlans(supabase);
  const updatePlanStatus = useUpdatePlanStatus(supabase);
  const deletePlan = useDeletePlan(supabase);
  const { projects, isLoading: projectsLoading } = useProjects(supabase);
  const createProject = useCreateProject(supabase, userId);
  const updateProjectStatus = useUpdateProjectStatus(supabase);
  const deleteProject = useDeleteProject(supabase);
  const { ideas, isLoading: ideasLoading } = useIdeas(supabase);
  const createIdea = useCreateIdea(supabase, userId);
  const deleteIdea = useDeleteIdea(supabase);

  const term = search.trim().toLocaleLowerCase("pt-BR");
  const matches = (item: { title: string; description?: string | null }) => !term || `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(term);
  const visiblePlans = plans.filter((plan) => plan.status === status && matches(plan));
  const visibleProjects = projects.filter((project) => project.status === status && matches(project));
  const visibleIdeas = ideas.filter(matches);
  const count = (list: { status: PlanStatus }[], value: StatusFilter) => list.filter((item) => item.status === value).length;

  function captureIdea(event: FormEvent) {
    event.preventDefault();
    const title = ideaTitle.trim();
    if (!title) return;
    createIdea.mutate({ title }, { onSuccess: () => setIdeaTitle(""), onError: () => toast({ title: "Não foi possível guardar a ideia", tone: "danger" }) });
  }

  async function promoteIdea(idea: Idea) {
    try {
      await createProject.mutateAsync({ title: idea.title, description: idea.description ?? undefined });
      deleteIdea.mutate(idea.id);
      setStatus("ativo");
      toast({ title: "Ideia virou projeto", description: idea.title, tone: "success" });
    } catch {
      toast({ title: "Não foi possível criar o projeto", tone: "danger" });
    }
  }

  const emptyText = (kind: "planos" | "projetos") =>
    term ? `Nenhum resultado para “${search.trim()}”.` : status === "ativo" ? null : `Nenhum ${kind === "planos" ? "plano" : "projeto"} ${status === "concluido" ? "concluído" : "arquivado"}.`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar planos, projetos e ideias" aria-label="Buscar em planos, projetos e ideias" data-size="sm" className="q-input pl-8!" />
        </div>
        <Segmented<StatusFilter>
          label="Situação"
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: "ativo", label: "Ativos", count: count(plans, "ativo") + count(projects, "ativo") || null },
            { value: "concluido", label: "Concluídos", count: count(plans, "concluido") + count(projects, "concluido") || null },
            { value: "arquivado", label: "Arquivados", count: count(plans, "arquivado") + count(projects, "arquivado") || null },
          ]}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <PlanningColumn title="Planos" hint="Direções amplas, com metas vinculadas" count={visiblePlans.length} action={<IconButton label="Novo plano" size="sm" onClick={onNewPlan}><PlusIcon weight="bold" /></IconButton>}>
          {plansLoading ? (
            <SkeletonCards count={2} className="h-28 w-full rounded-xl" />
          ) : visiblePlans.length ? (
            visiblePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                client={supabase}
                plan={plan}
                onChangeStatus={(next) => updatePlanStatus.mutate({ planId: plan.id, status: next })}
                onDelete={() => deletePlan.mutate(plan.id)}
              />
            ))
          ) : (
            <ColumnEmpty icon={<CompassIcon />} text={emptyText("planos") ?? "Um plano é uma direção: “virar designer”, “viver com mais calma”. Depois, vincule as metas que levam até ela."} action={!term && status === "ativo" ? <Button size="sm" variant="secondary" onClick={onNewPlan}>Criar plano</Button> : undefined} />
          )}
        </PlanningColumn>

        <PlanningColumn title="Projetos" hint="Entregas que agrupam tarefas" count={visibleProjects.length} action={<IconButton label="Novo projeto" size="sm" onClick={onNewProject}><PlusIcon weight="bold" /></IconButton>}>
          {projectsLoading ? (
            <SkeletonCards count={2} className="h-24 w-full rounded-xl" />
          ) : visibleProjects.length ? (
            visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                client={supabase}
                project={project}
                userId={userId}
                onChangeStatus={(next) => updateProjectStatus.mutate({ projectId: project.id, status: next })}
                onDelete={() => deleteProject.mutate(project.id)}
              />
            ))
          ) : (
            <ColumnEmpty icon={<FolderSimpleIcon />} text={emptyText("projetos") ?? "Projetos juntam as tarefas de uma entrega — reforma, portfólio, mudança — e mostram quanto falta."} action={!term && status === "ativo" ? <Button size="sm" variant="secondary" onClick={onNewProject}>Criar projeto</Button> : undefined} />
          )}
        </PlanningColumn>

        <PlanningColumn title="Ideias" hint="Capture agora, decida depois" count={visibleIdeas.length}>
          <form onSubmit={captureIdea} className="flex gap-2">
            <input value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)} placeholder="Anotar uma ideia…" aria-label="Nova ideia" data-size="sm" className="q-input min-w-0 flex-1" />
            <Button type="submit" size="sm" variant="secondary" disabled={!ideaTitle.trim()} loading={createIdea.isPending}>
              Guardar
            </Button>
          </form>
          {ideasLoading ? (
            <SkeletonCards count={2} className="h-16 w-full rounded-xl" />
          ) : visibleIdeas.length ? (
            visibleIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} onDelete={() => deleteIdea.mutate(idea.id)} onPromote={() => void promoteIdea(idea)} />)
          ) : (
            <ColumnEmpty icon={<LightbulbIcon />} text={term ? `Nenhuma ideia com “${search.trim()}”.` : "Sem ideias guardadas. Quando uma amadurecer, transforme em projeto."} />
          )}
        </PlanningColumn>
      </div>
    </div>
  );
}

function PlanningColumn({ title, hint, count, action, children }: { title: string; hint: string; count: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-fg">
            {title}
            <span className="text-xs font-normal tabular-nums text-fg-3">{count}</span>
          </h2>
          <p className="truncate text-xs text-fg-3">{hint}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ColumnEmpty({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-line px-5 py-7 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-hover text-fg-3 [&_svg]:size-[18px]">{icon}</span>
      <p className="max-w-[260px] text-[13px] leading-relaxed text-fg-3">{text}</p>
      {action}
    </div>
  );
}
