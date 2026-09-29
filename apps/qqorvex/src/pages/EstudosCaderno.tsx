import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CalendarPlusIcon,
  CardsThreeIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  ExamIcon,
  NotePencilIcon,
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  QuestionIcon,
  SparkleIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  FlashcardManager,
  NOTEBOOK_STATUS,
  NOTEBOOK_TYPE_LABEL,
  NewNotebookForm,
  QuizTakingForm,
  RelatedLibraryItemsPanel,
  ReviewSession,
  StudySummaryEditor,
  StudyTimerButton,
  SummaryMarkdown,
  getLocalDateKey,
  notebookColor,
  useAssessments,
  useCreateAssessment,
  useCreateErrorDoubt,
  useCreateEventForAssessment,
  useCreateFlashcard,
  useCreateQuizAttempt,
  useCreateStudySession,
  useCreateSummary,
  useCreateTopic,
  useDeleteAssessment,
  useDeleteErrorDoubt,
  useDeleteFlashcard,
  useDeleteNotebook,
  useDeleteStudySession,
  useDeleteSummary,
  useDeleteTopic,
  useErrorsDoubts,
  useFlashcards,
  useNotebooks,
  useQuizAttempts,
  useQuizQuestions,
  useQuizzes,
  useResolveErrorDoubt,
  useReviewFlashcard,
  useStudySessions,
  useSummaries,
  useTopics,
  useUpdateFlashcard,
  useUpdateNotebook,
  useUpdateSummary,
  type Quiz,
} from "@qqorvex/module-estudos";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Notice,
  PageContainer,
  PageHeader,
  Segmented,
  Skeleton,
  Tabs,
  Textarea,
  cx,
  useToast,
} from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";
import { useVexLauncher } from "../vex/VexLauncher";
import { formatMinutes } from "./Estudos";

type Tab = "resumos" | "cartoes" | "quizzes" | "duvidas" | "avaliacoes" | "materiais";
const TABS: Tab[] = ["resumos", "cartoes", "quizzes", "duvidas", "avaliacoes", "materiais"];

function formatDate(value: string): string {
  const date = value.length > 10 ? new Date(value) : (() => {
    const [y = 0, m = 1, d = 1] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(dateKey: string): number {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  const today = new Date();
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
}

function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-fg">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ─────────────── Resumos ─────────────── */

function SummariesTab({ notebookId, notebookName }: { notebookId: string; notebookName: string }) {
  const { toast } = useToast();
  const openVex = useVexLauncher();
  const { summaries, isLoading } = useSummaries(supabase, notebookId);
  const { topics } = useTopics(supabase, notebookId);
  const createSummary = useCreateSummary(supabase, notebookId);
  const updateSummary = useUpdateSummary(supabase, notebookId);
  const deleteSummary = useDeleteSummary(supabase, notebookId);
  const createTopic = useCreateTopic(supabase, notebookId);
  const deleteTopic = useDeleteTopic(supabase, notebookId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"read" | "create" | "edit">("read");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [newTopic, setNewTopic] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const visible = topicFilter ? summaries.filter((summary) => summary.topic_id === topicFilter) : summaries;
  const selected = summaries.find((summary) => summary.id === selectedId) ?? visible[0] ?? null;
  const topicName = new Map(topics.map((topic) => [topic.id, topic.title]));
  const editing = mode === "create" || mode === "edit" || (!isLoading && summaries.length === 0);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-20">
        <Button variant="secondary" fullWidth leadingIcon={<NotePencilIcon size={16} />} onClick={() => setMode("create")}>
          Novo resumo
        </Button>
        <Panel>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : summaries.length === 0 ? (
            <p className="px-4 py-5 text-center text-[13px] text-fg-3">Nenhum resumo ainda.</p>
          ) : (
            <ul className="max-h-[44dvh] overflow-y-auto p-1.5 lg:max-h-[calc(100dvh-340px)]">
              {visible.map((summary) => {
                const active = mode === "read" && selected?.id === summary.id;
                return (
                  <li key={summary.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(summary.id);
                        setMode("read");
                      }}
                      aria-current={active ? "true" : undefined}
                      className={cx("flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors", active ? "bg-selected" : "hover:bg-hover")}
                    >
                      <span className={cx("truncate text-[13.5px]", active ? "font-medium text-fg" : "text-fg-2")}>{summary.title}</span>
                      <span className="truncate text-[11.5px] text-fg-4">
                        {[summary.topic_id ? topicName.get(summary.topic_id) : null, formatDate(summary.updated_at)].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-fg-3">Nenhum resumo neste tópico.</li>}
            </ul>
          )}
        </Panel>
        <Panel title="Tópicos">
          <div className="flex flex-col gap-2 p-3">
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setTopicFilter("")} className={cx("rounded-full border px-2.5 py-1 text-xs transition-colors", !topicFilter ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line text-fg-3 hover:text-fg")}>
                  Todos
                </button>
                {topics.map((topic) => (
                  <span key={topic.id} className={cx("group inline-flex items-center rounded-full border text-xs transition-colors", topicFilter === topic.id ? "border-gold-line bg-gold-soft text-gold-fg" : "border-line text-fg-3 hover:text-fg")}>
                    <button type="button" onClick={() => setTopicFilter(topicFilter === topic.id ? "" : topic.id)} className="py-1 pl-2.5 pr-1.5">
                      {topic.title}
                    </button>
                    <button type="button" aria-label={`Remover tópico ${topic.title}`} onClick={() => deleteTopic.mutate(topic.id)} className="mr-1 hidden rounded-full p-0.5 hover:bg-hover group-hover:block">
                      <XIcon size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!newTopic.trim()) return;
                createTopic.mutate({ title: newTopic.trim() }, { onSuccess: () => setNewTopic("") });
              }}
            >
              <input value={newTopic} onChange={(event) => setNewTopic(event.target.value)} placeholder="Novo tópico + Enter" aria-label="Novo tópico" data-size="sm" className="q-input" />
            </form>
          </div>
        </Panel>
      </aside>

      <Panel className="min-w-0">
        <div className="px-5 py-5 sm:px-8 sm:py-7">
          {editing ? (
            <>
              {summaries.length === 0 && mode !== "edit" && <p className="mb-4 text-[13px] text-fg-3">Escreva o primeiro resumo deste caderno — ou peça um à Vex.</p>}
              <StudySummaryEditor
                key={mode === "edit" ? selected?.id : "new"}
                mode={mode === "edit" ? "edit" : "create"}
                initialTitle={mode === "edit" ? selected?.title : ""}
                initialContent={mode === "edit" ? selected?.content : ""}
                initialTopicId={mode === "edit" ? selected?.topic_id : topicFilter}
                topics={topics}
                isSaving={createSummary.isPending || updateSummary.isPending}
                onCancel={summaries.length ? () => setMode("read") : undefined}
                onSave={(input) => {
                  if (mode === "edit" && selected) {
                    updateSummary.mutate({ summaryId: selected.id, input }, { onSuccess: () => setMode("read"), onError: () => toast({ title: "Não foi possível salvar", tone: "danger" }) });
                    return;
                  }
                  createSummary.mutate(input, {
                    onSuccess: (created) => {
                      setSelectedId(created.id);
                      setMode("read");
                    },
                    onError: () => toast({ title: "Não foi possível salvar", description: "Seu texto continua aberto.", tone: "danger" }),
                  });
                }}
              />
            </>
          ) : selected ? (
            <article>
              <div className="flex items-start gap-3">
                <h2 className="min-w-0 flex-1 font-display text-[24px] font-semibold leading-tight text-fg">{selected.title}</h2>
                <DropdownMenu
                  label="Ações do resumo"
                  items={[
                    { label: "Editar", icon: <PencilSimpleIcon />, onSelect: () => setMode("edit") },
                    { label: "Criar cartões com a Vex", icon: <SparkleIcon />, onSelect: () => openVex(`Leia o resumo "${selected.title}" do caderno "${notebookName}" e sugira 5 flashcards (pergunta e resposta curtas) para eu revisar.`) },
                    "separator",
                    { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => setConfirmDelete(true) },
                  ]}
                  trigger={(props) => (
                    <IconButton {...props} label="Ações do resumo">
                      <DotsThreeIcon weight="bold" />
                    </IconButton>
                  )}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-3">
                {selected.topic_id && topicName.get(selected.topic_id) && <Badge>{topicName.get(selected.topic_id)}</Badge>}
                {selected.origin === "vex" && <Badge tone="ai">Gerado pela Vex</Badge>}
                <span>Atualizado em {formatDateTime(selected.updated_at)}</span>
              </div>
              <div className="mt-6 max-w-[72ch]">
                <SummaryMarkdown content={selected.content} />
              </div>
              <div className="mt-8 flex gap-2 border-t border-line-soft pt-4">
                <Button variant="secondary" size="sm" leadingIcon={<PencilSimpleIcon size={15} />} onClick={() => setMode("edit")}>
                  Editar
                </Button>
              </div>
            </article>
          ) : null}
        </div>
      </Panel>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir resumo?"
        description={selected ? `“${selected.title}” será apagado. Cartões criados a partir dele continuam.` : undefined}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (selected) deleteSummary.mutate(selected.id, { onSuccess: () => setSelectedId(null) });
        }}
      />
    </div>
  );
}

/* ─────────────── Quizzes ─────────────── */

function QuizRow({ quiz, onTake }: { quiz: Quiz; onTake: () => void }) {
  const { questions } = useQuizQuestions(supabase, quiz.id);
  const { attempts } = useQuizAttempts(supabase, quiz.id);
  const best = attempts.reduce((max, attempt) => Math.max(max, attempt.score), -1);
  const pct = best >= 0 && questions.length ? Math.round((best / questions.length) * 100) : null;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ai-soft text-ai-fg">
        <ExamIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-fg">{quiz.title}</p>
        <p className="text-xs text-fg-3">
          {questions.length} perguntas · {attempts.length ? `${attempts.length} ${attempts.length === 1 ? "tentativa" : "tentativas"}` : "ainda não respondido"}
        </p>
      </div>
      {pct !== null && <Badge tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger"}>melhor {pct}%</Badge>}
      <Button size="sm" variant={attempts.length ? "secondary" : "primary"} onClick={onTake} disabled={questions.length === 0}>
        {attempts.length ? "Refazer" : "Responder"}
      </Button>
    </li>
  );
}

function QuizModal({ quiz, userId, onClose }: { quiz: Quiz | null; userId: string; onClose: () => void }) {
  const { questions, isLoading } = useQuizQuestions(supabase, quiz?.id ?? "none");
  const createAttempt = useCreateQuizAttempt(supabase, userId);
  return (
    <Modal isOpen={quiz !== null} onClose={onClose} title={quiz?.title ?? "Quiz"} size="lg" icon={<ExamIcon />}>
      {quiz && (isLoading ? <Skeleton className="h-48 w-full" /> : <QuizTakingForm key={quiz.id} questions={questions} onClose={onClose} onSubmit={({ answers, score }) => createAttempt.mutate({ quizId: quiz.id, answers, score })} />)}
    </Modal>
  );
}

function QuizzesTab({ notebookId, notebookName, userId }: { notebookId: string; notebookName: string; userId: string }) {
  const openVex = useVexLauncher();
  const { quizzes, isLoading } = useQuizzes(supabase, notebookId);
  const [taking, setTaking] = useState<Quiz | null>(null);
  const generate = () => openVex(`Gere um quiz de 5 perguntas a partir dos resumos do caderno "${notebookName}".`);
  return (
    <>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={<ExamIcon />}
          title="Nenhum quiz ainda"
          description="A Vex cria quizzes de múltipla escolha a partir dos seus resumos. Responda, veja a correção e acompanhe sua melhor nota."
          action={
            <Button variant="ai" leadingIcon={<SparkleIcon size={15} weight="fill" />} onClick={generate}>
              Gerar quiz com a Vex
            </Button>
          }
        />
      ) : (
        <Panel
          title={`${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"}`}
          action={
            <Button size="sm" variant="ai" leadingIcon={<SparkleIcon size={14} weight="fill" />} onClick={generate}>
              Gerar novo
            </Button>
          }
        >
          <ul className="divide-y divide-line-soft">
            {quizzes.map((quiz) => (
              <QuizRow key={quiz.id} quiz={quiz} onTake={() => setTaking(quiz)} />
            ))}
          </ul>
        </Panel>
      )}
      <QuizModal quiz={taking} userId={userId} onClose={() => setTaking(null)} />
    </>
  );
}

/* ─────────────── Dúvidas ─────────────── */

function DoubtsTab({ notebookId, notebookName }: { notebookId: string; notebookName: string }) {
  const openVex = useVexLauncher();
  const { errorsDoubts, isLoading } = useErrorsDoubts(supabase, notebookId);
  const create = useCreateErrorDoubt(supabase, notebookId);
  const resolve = useResolveErrorDoubt(supabase, notebookId);
  const remove = useDeleteErrorDoubt(supabase, notebookId);
  const [text, setText] = useState("");
  const [view, setView] = useState<"abertas" | "resolvidas">("abertas");
  const visible = errorsDoubts.filter((item) => (view === "abertas" ? !item.is_resolved : item.is_resolved));
  const openCount = errorsDoubts.filter((item) => !item.is_resolved).length;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          create.mutate(text.trim(), { onSuccess: () => setText("") });
        }}
        className="flex gap-2"
      >
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Anote um erro que cometeu ou uma dúvida para tirar depois" aria-label="Nova dúvida ou erro" className="q-input flex-1" />
        <Button type="submit" disabled={!text.trim()} loading={create.isPending}>
          Anotar
        </Button>
      </form>
      <Segmented
        label="Filtrar dúvidas"
        size="sm"
        value={view}
        onChange={setView}
        className="self-start"
        options={[
          { value: "abertas", label: `Abertas${openCount ? ` · ${openCount}` : ""}` },
          { value: "resolvidas", label: "Resolvidas" },
        ]}
      />
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : visible.length === 0 ? (
        <EmptyState size="sm" icon={<QuestionIcon />} title={view === "abertas" ? "Nenhuma dúvida aberta" : "Nada resolvido ainda"} description={view === "abertas" ? "Anotar erros e dúvidas enquanto estuda ajuda a revisar o que realmente importa." : undefined} />
      ) : (
        <Panel>
          <ul className="divide-y divide-line-soft">
            {visible.map((item) => (
              <li key={item.id} className="group flex items-start gap-3 px-4 py-3">
                <Checkbox className="mt-0.5" checked={item.is_resolved} onChange={(event) => resolve.mutate({ id: item.id, isResolved: event.target.checked })} aria-label={item.is_resolved ? "Reabrir" : "Marcar como resolvida"} />
                <p className={cx("min-w-0 flex-1 whitespace-pre-wrap text-[13.5px]", item.is_resolved ? "text-fg-4 line-through" : "text-fg")}>{item.description}</p>
                {!item.is_resolved && (
                  <Button size="xs" variant="ai" leadingIcon={<SparkleIcon size={12} weight="fill" />} onClick={() => openVex(`Estou estudando "${notebookName}" e tenho esta dúvida: ${item.description}. Pode me explicar de forma clara, com um exemplo?`)}>
                    Tirar com a Vex
                  </Button>
                )}
                <IconButton label="Excluir" size="sm" variant="danger" onClick={() => remove.mutate(item.id)} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                  <TrashIcon />
                </IconButton>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ─────────────── Avaliações ─────────────── */

function AssessmentsTab({ notebookId, userId }: { notebookId: string; userId: string }) {
  const { toast } = useToast();
  const { assessments, isLoading } = useAssessments(supabase, notebookId);
  const create = useCreateAssessment(supabase, notebookId);
  const remove = useDeleteAssessment(supabase, notebookId);
  const toAgenda = useCreateEventForAssessment(supabase, userId);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const today = getLocalDateKey();
  const upcoming = assessments.filter((item) => !item.assessment_date || item.assessment_date >= today);
  const past = assessments.filter((item) => item.assessment_date && item.assessment_date < today);

  const row = (assessment: (typeof assessments)[number], isPast: boolean) => {
    const days = assessment.assessment_date ? daysUntil(assessment.assessment_date) : null;
    return (
      <li key={assessment.id} className={cx("group flex items-start gap-3 px-4 py-3", isPast && "opacity-60")}>
        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-canvas/50 leading-none">
          {assessment.assessment_date ? (
            <>
              <span className="text-[15px] font-semibold tabular-nums text-fg">{Number(assessment.assessment_date.slice(8, 10))}</span>
              <span className="mt-0.5 text-[10px] uppercase text-fg-3">{new Date(`${assessment.assessment_date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
            </>
          ) : (
            <ExamIcon size={16} className="text-fg-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-fg">{assessment.name}</p>
          {assessment.expected_content && <p className="mt-0.5 whitespace-pre-wrap text-xs text-fg-3">{assessment.expected_content}</p>}
        </div>
        {days !== null && !isPast && <Badge tone={days <= 3 ? "warning" : "neutral"}>{days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`}</Badge>}
        <DropdownMenu
          label={`Ações para ${assessment.name}`}
          items={[
            ...(assessment.assessment_date && !isPast
              ? [{ label: "Adicionar à Agenda", icon: <CalendarPlusIcon />, onSelect: () => toAgenda.mutate(assessment, { onSuccess: () => toast({ title: "Avaliação na Agenda", tone: "success" }), onError: () => toast({ title: "Não foi possível adicionar à Agenda", tone: "danger" }) }) }]
              : []),
            { label: "Excluir", icon: <TrashIcon />, danger: true, onSelect: () => remove.mutate(assessment.id) },
          ]}
          trigger={(props) => (
            <IconButton {...props} label={`Ações para ${assessment.name}`} size="sm">
              <DotsThreeIcon weight="bold" />
            </IconButton>
          )}
        />
      </li>
    );
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : assessments.length === 0 ? (
          <EmptyState icon={<ExamIcon />} title="Nenhuma avaliação" description="Cadastre provas, trabalhos e entregas para acompanhar a contagem regressiva e levar para a Agenda." />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Panel title="Próximas">
                <ul className="divide-y divide-line-soft">{upcoming.map((item) => row(item, false))}</ul>
              </Panel>
            )}
            {past.length > 0 && (
              <Panel title="Anteriores">
                <ul className="divide-y divide-line-soft">{past.map((item) => row(item, true))}</ul>
              </Panel>
            )}
          </>
        )}
      </div>
      <Panel title="Nova avaliação">
        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            create.mutate(
              { name: name.trim(), assessmentDate: date || undefined, expectedContent: content.trim() || undefined },
              {
                onSuccess: () => {
                  setName("");
                  setDate("");
                  setContent("");
                },
              },
            );
          }}
        >
          <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Prova 1" required />
          <Input label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Textarea label="Conteúdo (opcional)" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Capítulos, temas, peso…" rows={3} />
          <Button type="submit" disabled={!name.trim()} loading={create.isPending}>
            Adicionar
          </Button>
        </form>
      </Panel>
    </div>
  );
}

/* ─────────────── Página ─────────────── */

export function EstudosCadernoPage() {
  const { notebookId = "" } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const openVex = useVexLauncher();
  const { userId } = useAccount();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get("aba") as Tab) ? (params.get("aba") as Tab) : "resumos";
  const setTab = (next: Tab) => setParams((current) => {
    const copy = new URLSearchParams(current);
    if (next === "resumos") copy.delete("aba");
    else copy.set("aba", next);
    return copy;
  }, { replace: true });

  const { notebooks, isLoading } = useNotebooks(supabase);
  const notebook = notebooks.find((item) => item.id === notebookId);
  const updateNotebook = useUpdateNotebook(supabase);
  const deleteNotebook = useDeleteNotebook(supabase);
  const { summaries } = useSummaries(supabase, notebookId);
  const { flashcards } = useFlashcards(supabase, notebookId);
  const createFlashcard = useCreateFlashcard(supabase, notebookId);
  const updateFlashcard = useUpdateFlashcard(supabase, notebookId);
  const deleteFlashcard = useDeleteFlashcard(supabase, notebookId);
  const review = useReviewFlashcard(supabase);
  const { errorsDoubts } = useErrorsDoubts(supabase, notebookId);
  const { quizzes } = useQuizzes(supabase, notebookId);
  const { assessments } = useAssessments(supabase, notebookId);
  const { studySessions } = useStudySessions(supabase, notebookId);
  const createSession = useCreateStudySession(supabase, notebookId);
  const deleteSession = useDeleteStudySession(supabase, notebookId);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sessionDraft, setSessionDraft] = useState<{ minutes: number; note: string; startedAt?: number } | null>(null);

  usePageMeta(notebook ? { title: notebook.name, subtitle: "Estudos" } : null);

  const today = getLocalDateKey();
  const due = useMemo(() => flashcards.filter((card) => card.next_review_date <= today), [flashcards, today]);
  const openDoubts = errorsDoubts.filter((item) => !item.is_resolved).length;
  const totalMinutes = studySessions.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
  const nextAssessment = assessments.find((item) => item.assessment_date && item.assessment_date >= today);

  useEffect(() => {
    if (!isLoading && notebooks.length > 0 && !notebook) navigate("/conhecimento/estudos", { replace: true });
  }, [isLoading, navigate, notebook, notebooks.length]);

  if (!notebook) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    );
  }

  const color = notebookColor(notebook.id);
  const context = [NOTEBOOK_TYPE_LABEL[notebook.notebook_type], notebook.area, notebook.institution, notebook.instructor].filter(Boolean).join(" · ");

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link to="/conhecimento/estudos" className="inline-flex items-center gap-1 hover:text-fg">
            <ArrowLeftIcon size={12} /> Estudos
          </Link>
        }
        icon={<span className="font-display text-[17px] font-semibold" style={{ color }}>{notebook.name.charAt(0).toUpperCase()}</span>}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {notebook.name}
            {notebook.status !== "ativo" && <Badge tone={NOTEBOOK_STATUS[notebook.status].tone}>{NOTEBOOK_STATUS[notebook.status].label}</Badge>}
          </span>
        }
        description={notebook.description || context}
        actions={
          <>
            <StudyTimerButton notebookId={notebook.id} notebookName={notebook.name} onFinish={(minutes, startedAt) => setSessionDraft({ minutes, note: "", startedAt })} />
            {due.length > 0 && (
              <Button leadingIcon={<CardsThreeIcon size={16} />} onClick={() => setReviewing(true)}>
                Revisar {due.length}
              </Button>
            )}
            <DropdownMenu
              label="Ações do caderno"
              items={[
                { label: notebook.is_favorite ? "Remover dos favoritos" : "Favoritar", icon: <StarIcon weight={notebook.is_favorite ? "fill" : "regular"} />, onSelect: () => updateNotebook.mutate({ notebookId, input: { isFavorite: !notebook.is_favorite } }) },
                { label: "Editar caderno", icon: <PencilSimpleIcon />, onSelect: () => setEditing(true) },
                { label: "Registrar sessão manualmente", icon: <PlusIcon />, onSelect: () => setSessionDraft({ minutes: 30, note: "" }) },
                "separator",
                notebook.status === "ativo" ? { label: "Pausar", icon: <PauseIcon />, onSelect: () => updateNotebook.mutate({ notebookId, input: { status: "pausado" } }) } : { label: "Reativar", icon: <PlayIcon />, onSelect: () => updateNotebook.mutate({ notebookId, input: { status: "ativo" } }) },
                ...(notebook.status !== "concluido" ? [{ label: "Marcar como concluído", icon: <CheckCircleIcon />, onSelect: () => updateNotebook.mutate({ notebookId, input: { status: "concluido" } }) }] : []),
                ...(notebook.status !== "arquivado" ? [{ label: "Arquivar", icon: <ArchiveIcon />, onSelect: () => updateNotebook.mutate({ notebookId, input: { status: "arquivado" } }) }] : []),
                { label: "Excluir caderno", icon: <TrashIcon />, danger: true, onSelect: () => setConfirmDelete(true) },
              ]}
              trigger={(props) => (
                <IconButton {...props} label="Ações do caderno" variant="secondary" size="lg">
                  <DotsThreeIcon weight="bold" />
                </IconButton>
              )}
            />
          </>
        }
      >
        <Tabs<Tab>
          label="Seções do caderno"
          value={tab}
          onChange={setTab}
          options={[
            { value: "resumos", label: "Resumos", count: summaries.length || null },
            { value: "cartoes", label: "Cartões", count: flashcards.length || null },
            { value: "quizzes", label: "Quizzes", count: quizzes.length || null },
            { value: "duvidas", label: "Dúvidas", count: openDoubts || null },
            { value: "avaliacoes", label: "Avaliações", count: assessments.length || null },
            { value: "materiais", label: "Materiais" },
          ]}
        />
      </PageHeader>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {tab === "resumos" && <SummariesTab notebookId={notebookId} notebookName={notebook.name} />}
          {tab === "cartoes" && (
            <div className="flex flex-col gap-4">
              {due.length > 0 && (
                <Notice
                  tone="info"
                  compact
                  actions={
                    <Button size="sm" onClick={() => setReviewing(true)}>
                      Revisar agora
                    </Button>
                  }
                >
                  {due.length} {due.length === 1 ? "cartão vence" : "cartões vencem"} hoje neste caderno.
                </Notice>
              )}
              <FlashcardManager
                flashcards={flashcards}
                creating={createFlashcard.isPending}
                updating={updateFlashcard.isPending}
                onCreate={(front, back) => createFlashcard.mutateAsync({ front, back })}
                onUpdate={(flashcardId, front, back) => updateFlashcard.mutateAsync({ flashcardId, front, back })}
                onDelete={(flashcardId) => deleteFlashcard.mutate(flashcardId)}
              />
            </div>
          )}
          {tab === "quizzes" && userId && <QuizzesTab notebookId={notebookId} notebookName={notebook.name} userId={userId} />}
          {tab === "duvidas" && <DoubtsTab notebookId={notebookId} notebookName={notebook.name} />}
          {tab === "avaliacoes" && userId && <AssessmentsTab notebookId={notebookId} userId={userId} />}
          {tab === "materiais" && (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <RelatedLibraryItemsPanel client={supabase} notebookId={notebookId} />
              <section className="rounded-xl border border-line bg-surface p-4">
                <AttachDocumentPanel client={supabase} relatedModule="estudos" relatedEntityId={notebookId} />
              </section>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Progresso">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-line-soft">
              {[
                ["Resumos", summaries.length],
                ["Cartões", flashcards.length],
                ["Para revisar", due.length],
                ["Dúvidas abertas", openDoubts],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-4 py-3">
                  <dt className="text-xs text-fg-3">{label}</dt>
                  <dd className="mt-0.5 font-display text-[20px] font-semibold tabular-nums text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {nextAssessment?.assessment_date && (
            <button type="button" onClick={() => setTab("avaliacoes")} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left hover:border-line-strong">
              <ExamIcon size={20} className="shrink-0 text-gold-fg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-fg">{nextAssessment.name}</span>
                <span className="block text-xs text-fg-3">{formatDate(nextAssessment.assessment_date)}</span>
              </span>
              <Badge tone={daysUntil(nextAssessment.assessment_date) <= 3 ? "warning" : "neutral"}>{daysUntil(nextAssessment.assessment_date) === 0 ? "hoje" : `${daysUntil(nextAssessment.assessment_date)} d`}</Badge>
            </button>
          )}
          <Panel title="Sessões" action={<span className="text-xs text-fg-3">{formatMinutes(totalMinutes)}</span>}>
            {studySessions.length === 0 ? (
              <p className="px-4 py-4 text-[13px] leading-relaxed text-fg-3">Use “Iniciar sessão” para cronometrar seu estudo. O tempo aparece aqui e no resumo semanal.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {studySessions.slice(0, 6).map((session) => (
                  <li key={session.id} className="group flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-fg">{session.note || "Sessão de estudo"}</p>
                      <p className="text-[11.5px] text-fg-4">{formatDateTime(session.occurred_at)}</p>
                    </div>
                    <span className="text-xs tabular-nums text-fg-2">{session.duration_minutes ? formatMinutes(session.duration_minutes) : "—"}</span>
                    <IconButton label="Excluir sessão" size="xs" variant="danger" onClick={() => deleteSession.mutate(session.id)} className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                      <TrashIcon />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Pedir à Vex">
            <div className="flex flex-col gap-1 p-2">
              {[
                ["Gerar um quiz", `Gere um quiz de 5 perguntas a partir dos resumos do caderno "${notebook.name}".`],
                ["Resumir um tema", `Quero um resumo novo no caderno "${notebook.name}". Pergunte o tema antes de criar.`],
                ["Plano de estudo", `Monte um plano de estudo semanal para o caderno "${notebook.name}"${nextAssessment?.assessment_date ? ` considerando a avaliação "${nextAssessment.name}" em ${nextAssessment.assessment_date}` : ""}.`],
              ].map(([label, prompt]) => (
                <button key={label} type="button" onClick={() => openVex(prompt)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg-2 hover:bg-hover hover:text-fg">
                  <SparkleIcon size={14} weight="fill" className="text-ai-fg" /> {label}
                </button>
              ))}
            </div>
          </Panel>
        </aside>
      </div>

      <Modal isOpen={editing} onClose={() => !updateNotebook.isPending && setEditing(false)} title="Editar caderno" size="lg">
        <NewNotebookForm key={notebook.id} initialNotebook={notebook} mode="edit" isSubmitting={updateNotebook.isPending} onCancel={() => setEditing(false)} onSave={(input) => updateNotebook.mutate({ notebookId, input }, { onSuccess: () => setEditing(false) })} />
      </Modal>

      <Modal
        isOpen={sessionDraft !== null}
        onClose={() => setSessionDraft(null)}
        title="Registrar sessão"
        description={sessionDraft?.startedAt ? `Iniciada às ${new Date(sessionDraft.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Conte o tempo que você estudou."}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSessionDraft(null)}>
              Descartar
            </Button>
            <Button
              loading={createSession.isPending}
              disabled={!sessionDraft || sessionDraft.minutes < 1}
              onClick={() => {
                if (!sessionDraft) return;
                createSession.mutate(
                  { durationMinutes: sessionDraft.minutes, note: sessionDraft.note.trim() || undefined, occurredAt: sessionDraft.startedAt ? new Date(sessionDraft.startedAt).toISOString() : undefined },
                  { onSuccess: () => { setSessionDraft(null); toast({ title: "Sessão registrada", description: formatMinutes(sessionDraft.minutes), tone: "success" }); } },
                );
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        {sessionDraft && (
          <div className="flex flex-col gap-3">
            <Input label="Minutos" type="number" min={1} max={720} value={sessionDraft.minutes} onChange={(event) => setSessionDraft({ ...sessionDraft, minutes: Math.max(0, Number(event.target.value) || 0) })} />
            <Textarea label="O que você estudou? (opcional)" value={sessionDraft.note} onChange={(event) => setSessionDraft({ ...sessionDraft, note: event.target.value })} rows={2} placeholder="Ex.: capítulo 3, exercícios 1 a 10" />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir caderno?"
        description={`“${notebook.name}” e todos os resumos, cartões, quizzes e avaliações serão apagados. Para só tirar da lista, arquive.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteNotebook.mutate(notebookId, { onSuccess: () => navigate("/conhecimento/estudos") });
        }}
      />

      <ReviewSession isOpen={reviewing} onClose={() => setReviewing(false)} cards={due} onGrade={(flashcard, grade) => review.mutateAsync({ flashcard, grade })} />
    </PageContainer>
  );
}
