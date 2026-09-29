import { useState, type ReactNode } from "react";
import { useAuth } from "@qqorvex/auth";
import { Button, ChipTabs, EmptyState, Input, SkeletonCards } from "@qqorvex/ui";
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
  useCheckinHistory,
  usePomodoroSessions,
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
import { completedPomodoroMinutesThisWeek, countCompletedPomodorosToday, localDateKey } from "@qqorvex/module-vida-pessoal";
import { supabase } from "../app/supabase";

type Bloco = "planejamento" | "bem-estar" | "pratica";
type Coluna = "planos" | "projetos" | "ideias";

const BLOCO_OPTIONS: { value: Bloco; label: string }[] = [
  { value: "planejamento", label: "Planejamento" },
  { value: "bem-estar", label: "Bem-estar" },
  { value: "pratica", label: "Vida Prática" },
];

const BLOCO_META: Record<Bloco, { eyebrow: string; title: string; description: string }> = {
  planejamento: {
    eyebrow: "Direção pessoal",
    title: "Planeje sem perder o que importa",
    description: "Transforme intenções em planos, projetos e ideias que continuam acessíveis quando a rotina apertar.",
  },
  "bem-estar": {
    eyebrow: "Ritual de presença",
    title: "Cuide do seu ritmo",
    description: "Um check-in curto para perceber como você está e um foco protegido para fazer a próxima coisa com calma.",
  },
  pratica: {
    eyebrow: "Vida em ordem",
    title: "Resolva o que sustenta o seu dia",
    description: "Contatos úteis, veículos, bens, compras e listas reunidos em um espaço prático e fácil de revisar.",
  },
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
  const [formAberto, setFormAberto] = useState<Coluna | null>(null);
  const [buscaPlanejamento, setBuscaPlanejamento] = useState("");

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
  const blocoMeta = BLOCO_META[bloco];
  const termoPlanejamento = buscaPlanejamento.trim().toLocaleLowerCase("pt-BR");
  const filtrarPorBusca = <T extends { title: string; description?: string | null }>(items: T[]) =>
    termoPlanejamento
      ? items.filter((item) => `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(termoPlanejamento))
      : items;
  const visiblePlans = filtrarPorBusca(plans);
  const visibleProjects = filtrarPorBusca(projects);
  const visibleIdeas = filtrarPorBusca(ideas);

  return (
    <div className=" editorial-module-page flex flex-col gap-6 pb-8">
      <section className="qv-hero editorial-module-hero" aria-labelledby="personal-page-title">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-gold-fg">{blocoMeta.eyebrow}</p>
            <h1 id="personal-page-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-4xl">Vida pessoal</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-2">{blocoMeta.description}</p>
          </div>
          <div className="hidden rounded-full border border-line bg-canvas/50 px-3 py-2 text-xs text-fg-2 sm:block">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />{blocoMeta.title}
          </div>
        </div>
        <div className="relative mt-6 border-t border-line pt-4">
          <ChipTabs options={BLOCO_OPTIONS} value={bloco} onChange={(next) => { setBloco(next); setFormAberto(null); }} />
        </div>
      </section>

      {bloco === "planejamento" && (
        <div className="flex flex-col gap-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Resumo do planejamento">
            {[
              ["Planos", plans.length, "visões de futuro", "bg-gold"],
              ["Projetos", projects.length, "frentes em movimento", "bg-gold"],
              ["Ideias", ideas.length, "possibilidades guardadas", "bg-[#9584ff]"],
            ].map(([label, value, hint, color]) => (
              <div key={label} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 min-w-0 p-4 sm:p-5">
                <div className={`mb-4 h-1 w-8 rounded-full ${color}`} />
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-fg-3">{label}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-fg">{value}</p>
                <p className="mt-1 text-xs text-fg-3">{hint}</p>
              </div>
            ))}
          </section>
          <div className="max-w-xl">
            <Input
              aria-label="Buscar em planos, projetos e ideias"
              placeholder="Buscar planos, projetos e ideias..."
              value={buscaPlanejamento}
              onChange={(event) => setBuscaPlanejamento(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
          <PlanningColumn
            title="Planos"
            count={visiblePlans.length}
            totalCount={plans.length}
            isLoading={plansLoading}
            emptyText={termoPlanejamento ? "Nenhum plano corresponde à busca." : "Nenhum plano ainda."}
            formOpen={formAberto === "planos"}
            onOpenForm={() => setFormAberto("planos")}
            form={
              <NewPlanForm
                onCreate={async (input) => {
                  await createPlan.mutateAsync(input);
                  fecharForm();
                }}
                onCancel={fecharForm}
              />
            }
          >
            {visiblePlans.map((plan) => (
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
            count={visibleProjects.length}
            totalCount={projects.length}
            isLoading={projectsLoading}
            emptyText={termoPlanejamento ? "Nenhum projeto corresponde à busca." : "Nenhum projeto ainda."}
            formOpen={formAberto === "projetos"}
            onOpenForm={() => setFormAberto("projetos")}
            form={
              <NewProjectForm
                onCreate={async (input) => {
                  await createProject.mutateAsync(input);
                  fecharForm();
                }}
                onCancel={fecharForm}
              />
            }
          >
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                client={supabase}
                project={project}
                userId={userId}
                onChangeStatus={(status) => updateProjectStatus.mutate({ projectId: project.id, status })}
                onDelete={() => deleteProject.mutate(project.id)}
              />
            ))}
          </PlanningColumn>

          <PlanningColumn
            title="Ideias"
            count={visibleIdeas.length}
            totalCount={ideas.length}
            isLoading={ideasLoading}
            emptyText={termoPlanejamento ? "Nenhuma ideia corresponde à busca." : "Nenhuma ideia capturada ainda."}
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
            {visibleIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onDelete={() => deleteIdea.mutate(idea.id)} />
            ))}
          </PlanningColumn>
          </div>
        </div>
      )}

      {bloco === "bem-estar" && (
        <div className="flex flex-col gap-5">
          <WellbeingOverview client={supabase} userId={userId} />
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DailyCheckinForm client={supabase} userId={userId} />
            <PomodoroTimer client={supabase} userId={userId} />
          </div>
        </div>
      )}

      {bloco === "pratica" && (
        <div className="flex flex-col gap-5">
          <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Resumo da vida prática">
            <div><p className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-gold-fg">Painel prático</p><p className="mt-1 font-display text-xl font-semibold text-fg">Tudo que mantém a vida funcionando</p></div>
            <p className="max-w-md text-sm leading-relaxed text-fg-2">Use cada painel como uma pequena central: consulte, atualize e volte para a rotina.</p>
          </section>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] items-start gap-4">
          <UsefulContactsPanel client={supabase} userId={userId} />
          <VehiclesPanel client={supabase} userId={userId} />
          <AssetsPanel client={supabase} userId={userId} />
          <ImportantPurchasesPanel client={supabase} userId={userId} />
          <ShoppingListPanel client={supabase} userId={userId} />
          </div>
        </div>
      )}
    </div>
  );
}

function PlanningColumn({
  title,
  count,
  totalCount,
  isLoading,
  emptyText,
  formOpen,
  onOpenForm,
  form,
  children,
}: {
  title: string;
  count: number;
  totalCount: number;
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
        <h2 className="font-display text-[17px] font-semibold text-fg">{title}</h2>
        {!isLoading && <span className="font-mono text-xs text-fg-3">{count}{count !== totalCount ? ` / ${totalCount}` : ""}</span>}
      </div>

      {isLoading ? (
        <SkeletonCards count={2} className="h-20 w-full rounded-2xl" />
      ) : count === 0 && !formOpen ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        children
      )}

      {formOpen ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 p-4">{form}</div>
      ) : (
        <Button type="button" variant="dashed" className="w-full" onClick={onOpenForm}>
          Adicionar
        </Button>
      )}
    </section>
  );
}

function WellbeingOverview({ client, userId }: { client: typeof supabase; userId: string }) {
  const now = new Date();
  const today = localDateKey(now);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const firstDay = localDateKey(sevenDaysAgo);
  const { checkins, isLoading: checkinsLoading, error: checkinsError } = useCheckinHistory(client, userId);
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = usePomodoroSessions(client);
  const checkinToday = checkins.some((checkin) => checkin.checkin_date === today);
  const checkinDaysThisWeek = new Set(
    checkins.filter((checkin) => checkin.checkin_date >= firstDay && checkin.checkin_date <= today).map((checkin) => checkin.checkin_date),
  ).size;
  const focusSessionsToday = countCompletedPomodorosToday(sessions, now);
  const focusMinutesThisWeek = completedPomodoroMinutesThisWeek(sessions, now);

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Resumo do bem-estar">
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 flex min-w-0 items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-line bg-gold-soft text-gold-fg" aria-hidden="true">◌</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{checkinsLoading ? "Check-in" : checkinsError ? "Check-in indisponível" : checkinToday ? "Check-in feito hoje" : "Check-in ainda aberto"}</p>
          <p className="mt-1 text-xs text-fg-3">{checkinsLoading ? "Carregando seu resumo…" : checkinsError ? "Tente novamente dentro do painel." : `${checkinDaysThisWeek} de 7 dias registrados nos últimos 7 dias`}</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 flex min-w-0 items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-line bg-chip-gold text-gold-fg" aria-hidden="true">◷</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{sessionsLoading ? "Seu foco" : sessionsError ? "Foco indisponível" : `${focusSessionsToday} ${focusSessionsToday === 1 ? "sessão concluída" : "sessões concluídas"} hoje`}</p>
          <p className="mt-1 text-xs text-fg-3">{sessionsLoading ? "Carregando seu resumo…" : sessionsError ? "Tente novamente dentro do painel." : `${focusMinutesThisWeek} min de foco nesta semana`}</p>
        </div>
      </div>
    </section>
  );
}
