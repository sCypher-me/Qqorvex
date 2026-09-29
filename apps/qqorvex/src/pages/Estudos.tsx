import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheckIcon, CardsThreeIcon, CheckCircleIcon, GraduationCapIcon, MagnifyingGlassIcon, PlusIcon, TimerIcon } from "@phosphor-icons/react";
import {
  NewNotebookForm,
  NotebookCard,
  ReviewSession,
  notebookColor,
  useCreateNotebook,
  useDeleteNotebook,
  useEstudosOverview,
  useNotebookStats,
  useNotebooks,
  useReviewFlashcard,
  useStudyWeek,
  useUpdateNotebook,
  type Notebook,
} from "@qqorvex/module-estudos";
import { billingLimitMessage } from "@qqorvex/database";
import { Badge, BarChart, Button, ConfirmDialog, EmptyState, Modal, Notice, PageContainer, PageHeader, Skeleton, Tabs, useToast } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type Filter = "ativos" | "todos" | "favoritos" | "pausados" | "concluidos" | "arquivados";

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function daysUntil(dateKey: string): number {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  const today = new Date();
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

function countdownLabel(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function EstudosPage() {
  const { userId } = useAccount();
  usePageMeta({ title: "Estudos" });
  const { toast } = useToast();
  const { notebooks, isLoading, error } = useNotebooks(supabase);
  const { stats } = useNotebookStats(supabase);
  const { dueFlashcards, upcomingAssessments, isLoading: overviewLoading } = useEstudosOverview(supabase, 30);
  const week = useStudyWeek(supabase);
  const createNotebook = useCreateNotebook(supabase, userId ?? "");
  const updateNotebook = useUpdateNotebook(supabase);
  const deleteNotebook = useDeleteNotebook(supabase);
  const review = useReviewFlashcard(supabase);

  const [filter, setFilter] = useState<Filter>("ativos");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Notebook | null>(null);
  const [deleting, setDeleting] = useState<Notebook | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const nameById = useMemo(() => new Map(notebooks.map((notebook) => [notebook.id, notebook.name])), [notebooks]);
  const counts = useMemo(
    () => ({
      ativos: notebooks.filter((notebook) => notebook.status === "ativo").length,
      todos: notebooks.filter((notebook) => notebook.status !== "arquivado").length,
      favoritos: notebooks.filter((notebook) => notebook.is_favorite).length,
      pausados: notebooks.filter((notebook) => notebook.status === "pausado").length,
      concluidos: notebooks.filter((notebook) => notebook.status === "concluido").length,
      arquivados: notebooks.filter((notebook) => notebook.status === "arquivado").length,
    }),
    [notebooks],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return notebooks
      .filter((notebook) => {
        if (filter === "ativos" && notebook.status !== "ativo") return false;
        if (filter === "todos" && notebook.status === "arquivado") return false;
        if (filter === "favoritos" && !notebook.is_favorite) return false;
        if (filter === "pausados" && notebook.status !== "pausado") return false;
        if (filter === "concluidos" && notebook.status !== "concluido") return false;
        if (filter === "arquivados" && notebook.status !== "arquivado") return false;
        if (!term) return true;
        return `${notebook.name} ${notebook.area ?? ""} ${notebook.description ?? ""} ${notebook.institution ?? ""} ${notebook.tags.join(" ")}`.toLocaleLowerCase("pt-BR").includes(term);
      })
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || (stats[b.id]?.due ?? 0) - (stats[a.id]?.due ?? 0) || b.updated_at.localeCompare(a.updated_at));
  }, [filter, notebooks, search, stats]);

  const dueNotebooks = new Set(dueFlashcards.map((card) => card.notebook_id)).size;
  const maxMinutes = Math.max(...week.days.map((day) => day.minutes));

  const description = isLoading
    ? "Carregando seus cadernos…"
    : [`${counts.ativos} ${counts.ativos === 1 ? "caderno ativo" : "cadernos ativos"}`, dueFlashcards.length ? `${dueFlashcards.length} ${dueFlashcards.length === 1 ? "cartão" : "cartões"} para revisar` : "revisões em dia", upcomingAssessments[0]?.assessment_date ? `próxima avaliação ${countdownLabel(daysUntil(upcomingAssessments[0].assessment_date))}` : null]
        .filter(Boolean)
        .join(" · ");

  return (
    <PageContainer>
      <PageHeader
        title="Estudos"
        description={description}
        actions={
          <>
            {dueFlashcards.length > 0 && (
              <Button leadingIcon={<CardsThreeIcon size={16} />} onClick={() => setReviewing(true)}>
                Revisar agora
              </Button>
            )}
            <Button variant={dueFlashcards.length > 0 ? "secondary" : "primary"} leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setCreating(true)}>
              Novo caderno
            </Button>
          </>
        }
      />

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <section className="flex flex-col rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-fg-2">
            <CardsThreeIcon size={17} className="text-gold-fg" /> Revisão de hoje
          </div>
          {overviewLoading ? (
            <Skeleton className="mt-4 h-16 w-2/3" />
          ) : dueFlashcards.length > 0 ? (
            <>
              <p className="mt-3 font-display text-[40px] font-semibold leading-none tabular-nums text-fg">{dueFlashcards.length}</p>
              <p className="mt-1.5 text-[13px] text-fg-3">
                {dueFlashcards.length === 1 ? "cartão vencido" : "cartões vencidos"} em {dueNotebooks} {dueNotebooks === 1 ? "caderno" : "cadernos"} · cerca de {Math.max(1, Math.round(dueFlashcards.length * 0.4))} min
              </p>
              <div className="min-h-4 flex-1" />
              <Button className="self-start" size="sm" onClick={() => setReviewing(true)}>
                Começar revisão
              </Button>
            </>
          ) : (
            <div className="mt-3 flex flex-1 flex-col">
              <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
                <CheckCircleIcon size={20} weight="fill" className="text-success" /> Tudo revisado
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-3">Nenhum cartão vence hoje. Crie cartões nos seus cadernos para fixar o que estuda.</p>
            </div>
          )}
        </section>

        <section className="flex flex-col rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-fg-2">
            <CalendarCheckIcon size={17} className="text-gold-fg" /> Próximas avaliações
          </div>
          {overviewLoading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : upcomingAssessments.length === 0 ? (
            <p className="mt-3 text-[13px] leading-relaxed text-fg-3">Nenhuma prova ou entrega nos próximos 30 dias. Cadastre avaliações dentro de cada caderno.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {upcomingAssessments.slice(0, 4).map((assessment) => {
                const days = assessment.assessment_date ? daysUntil(assessment.assessment_date) : null;
                return (
                  <li key={assessment.id}>
                    <Link to={`/conhecimento/estudos/${assessment.notebook_id}?aba=avaliacoes`} className="group flex items-center gap-2.5">
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: notebookColor(assessment.notebook_id) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-fg group-hover:underline">{assessment.name}</span>
                        <span className="block truncate text-xs text-fg-3">{nameById.get(assessment.notebook_id) ?? "Caderno"}</span>
                      </span>
                      {days !== null && <Badge tone={days <= 3 ? "warning" : "neutral"}>{countdownLabel(days)}</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-fg-2">
            <TimerIcon size={17} className="text-gold-fg" /> Últimos 7 dias
          </div>
          <p className="mt-3 font-display text-[26px] font-semibold leading-none tabular-nums text-fg">{formatMinutes(week.total)}</p>
          <p className="mt-1.5 text-[13px] text-fg-3">{week.sessions.length ? `${week.sessions.length} ${week.sessions.length === 1 ? "sessão registrada" : "sessões registradas"}` : "Use “Iniciar sessão” num caderno para medir seu tempo."}</p>
          {maxMinutes > 0 && (
            <BarChart
              label="Minutos de estudo por dia nos últimos 7 dias"
              height={96}
              integer
              highlightIndex={6}
              className="mt-3"
              series={[{ key: "min", label: "Minutos", color: "var(--q-gold)" }]}
              data={week.days.map((day) => {
                const [y = 0, m = 1, d = 1] = day.date.split("-").map(Number);
                const date = new Date(y, m - 1, d);
                return { label: WEEKDAY[date.getDay()]!, fullLabel: date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }), values: { min: day.minutes } };
              })}
              format={(value) => formatMinutes(value)}
              axisFormat={(value) => `${value}`}
            />
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Tabs<Filter>
            label="Filtrar cadernos"
            value={filter}
            onChange={setFilter}
            className="min-w-0 flex-1"
            options={[
              { value: "ativos", label: "Ativos", count: counts.ativos },
              { value: "todos", label: "Todos", count: counts.todos },
              { value: "favoritos", label: "Favoritos", count: counts.favoritos || null },
              ...(counts.pausados ? [{ value: "pausados" as const, label: "Pausados", count: counts.pausados }] : []),
              ...(counts.concluidos ? [{ value: "concluidos" as const, label: "Concluídos", count: counts.concluidos }] : []),
              ...(counts.arquivados ? [{ value: "arquivados" as const, label: "Arquivados", count: counts.arquivados }] : []),
            ]}
          />
          {notebooks.length > 3 && (
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cadernos" aria-label="Buscar cadernos" data-size="sm" className="q-input pl-8!" />
            </div>
          )}
        </div>

        {error && <Notice title="Não foi possível carregar seus cadernos">Tente atualizar a página.</Notice>}

        {isLoading ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<GraduationCapIcon />}
            title={notebooks.length === 0 ? "Seu primeiro caderno começa aqui" : "Nenhum caderno neste filtro"}
            description={notebooks.length === 0 ? "Um caderno reúne resumos, cartões de revisão, quizzes e avaliações de um assunto." : "Mude o filtro ou a busca para ver outros cadernos."}
            action={
              notebooks.length === 0 ? (
                <Button leadingIcon={<PlusIcon size={16} weight="bold" />} onClick={() => setCreating(true)}>
                  Criar caderno
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {visible.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                stats={stats[notebook.id]}
                onToggleFavorite={() => updateNotebook.mutate({ notebookId: notebook.id, input: { isFavorite: !notebook.is_favorite } })}
                onEdit={() => setEditing(notebook)}
                onSetStatus={(status) => updateNotebook.mutate({ notebookId: notebook.id, input: { status } }, { onSuccess: () => toast({ title: "Caderno atualizado", tone: "success" }) })}
                onDelete={() => setDeleting(notebook)}
              />
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={creating} onClose={() => !createNotebook.isPending && setCreating(false)} title="Novo caderno" description="Um espaço para um assunto, curso ou prova. Tudo pode ser editado depois." size="lg" icon={<GraduationCapIcon />}>
        <NewNotebookForm isSubmitting={createNotebook.isPending} onCancel={() => setCreating(false)} onSave={(input) => createNotebook.mutate(input, { onSuccess: () => setCreating(false) })} />
        {createNotebook.error && (
          <Notice compact className="mt-3">
            {billingLimitMessage(createNotebook.error) ?? "Não foi possível criar o caderno. Seus dados continuam no formulário."}
          </Notice>
        )}
      </Modal>

      <Modal isOpen={editing !== null} onClose={() => !updateNotebook.isPending && setEditing(null)} title="Editar caderno" size="lg" icon={<GraduationCapIcon />}>
        {editing && <NewNotebookForm key={editing.id} initialNotebook={editing} mode="edit" isSubmitting={updateNotebook.isPending} onCancel={() => setEditing(null)} onSave={(input) => updateNotebook.mutate({ notebookId: editing.id, input }, { onSuccess: () => setEditing(null) })} />}
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Excluir caderno?"
        description={deleting ? `“${deleting.name}” e todos os resumos, cartões, quizzes e avaliações dele serão apagados. Se quiser só tirar da lista, arquive.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) deleteNotebook.mutate(target.id, { onSuccess: () => toast({ title: "Caderno excluído", tone: "success" }) });
        }}
      />

      <ReviewSession isOpen={reviewing} onClose={() => setReviewing(false)} cards={dueFlashcards} notebookName={(id) => nameById.get(id)} onGrade={(flashcard, grade) => review.mutateAsync({ flashcard, grade })} />
    </PageContainer>
  );
}
