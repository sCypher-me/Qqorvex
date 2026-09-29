import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, CardHeader, ChipTabs, EmptyState, Input, Modal, Notice } from "@qqorvex/ui";
import {
  useNotebooks,
  useTopics,
  useCreateTopic,
  useSummaries,
  useCreateSummary,
  useUpdateSummary,
  useFlashcards,
  useCreateFlashcard,
  useReviewFlashcard,
  useErrorsDoubts,
  useCreateErrorDoubt,
  useResolveErrorDoubt,
  useAssessments,
  useCreateAssessment,
  useCreateEventForAssessment,
  useQuizzes,
  useQuizQuestions,
  useQuizAttempts,
  useCreateQuizAttempt,
  useCreateStudySession,
  useStudySessions,
  useUpdateNotebook,
  NewNotebookForm,
  FlashcardReviewCard,
  QuizTakingForm,
  RelatedLibraryItemsPanel,
  StudySummaryEditor,
  SummaryMarkdown,
  getLocalDateKey,
} from "@qqorvex/module-estudos";
import { AttachDocumentPanel } from "@qqorvex/module-documentos";
import type { Quiz } from "@qqorvex/module-estudos";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { useAuth } from "@qqorvex/auth";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "16 set" a partir de um timestamp ISO. */
function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`;
}

/** "16 set 14:20" a partir de um timestamp ISO. */
function formatDayMonthTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDayMonth(iso)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "16 set 2026" a partir de uma data `YYYY-MM-DD` (sem converter fuso). */
function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

const SUMMARY_ORIGIN_LABEL: Record<string, string> = {
  vex: "Gerado pela Vex",
  material: "Do material",
};

type StudyTab = "visao-geral" | "resumos" | "revisao" | "quizzes" | "estrutura" | "planejamento" | "materiais";

const STUDY_TABS: { value: StudyTab; label: string }[] = [
  { value: "visao-geral", label: "Visão geral" },
  { value: "resumos", label: "Resumos" },
  { value: "revisao", label: "Revisão" },
  { value: "quizzes", label: "Quizzes" },
  { value: "estrutura", label: "Estrutura" },
  { value: "planejamento", label: "Planejamento" },
  { value: "materiais", label: "Materiais" },
];

/**
 * Quiz é criado só pela Vex (ferramenta `generate_quiz_by_notebook_name`) — esta tela só responde
 * e mostra o histórico de tentativas. Componente próprio porque cada quiz tem suas próprias
 * perguntas/tentativas (hooks por `quiz.id`) e seu próprio estado de "respondendo agora".
 */
function QuizListItem({ client, userId, quiz }: { client: SupabaseClient<Database>; userId: string; quiz: Quiz }) {
  const [isTaking, setIsTaking] = useState(false);
  const { questions } = useQuizQuestions(client, quiz.id);
  const { attempts } = useQuizAttempts(client, quiz.id);
  const createAttempt = useCreateQuizAttempt(client, userId);
  const bestScore = attempts.reduce((max, attempt) => Math.max(max, attempt.score), -1);

  return (
    <li className="qv-row flex flex-col gap-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-medium text-text-primary">{quiz.title}</span>
          <span className="font-mono text-[11px] text-text-muted">
            {attempts.length} {attempts.length === 1 ? "tentativa" : "tentativas"}
            {bestScore >= 0 ? ` · melhor ${bestScore}/${questions.length}` : ""}
          </span>
        </div>
        <Button type="button" variant={isTaking ? "ghost" : "quiet"} size="xs" onClick={() => setIsTaking((v) => !v)}>
          {isTaking ? "Fechar" : "Responder"}
        </Button>
      </div>
      {isTaking && questions.length > 0 && (
        <QuizTakingForm
          questions={questions}
          onSubmit={({ answers, score }) => createAttempt.mutate({ quizId: quiz.id, answers, score })}
          onClose={() => setIsTaking(false)}
        />
      )}
    </li>
  );
}

export function EstudosCadernoPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  if (!notebookId) return null;

  const { notebooks } = useNotebooks(supabase);
  const updateNotebook = useUpdateNotebook(supabase);
  const { topics } = useTopics(supabase, notebookId);
  const createTopic = useCreateTopic(supabase, notebookId);
  const { summaries } = useSummaries(supabase, notebookId);
  const createSummary = useCreateSummary(supabase, notebookId);
  const updateSummary = useUpdateSummary(supabase, notebookId);
  const { flashcards } = useFlashcards(supabase, notebookId);
  const createFlashcard = useCreateFlashcard(supabase, notebookId);
  const reviewFlashcard = useReviewFlashcard(supabase, notebookId);
  const { errorsDoubts } = useErrorsDoubts(supabase, notebookId);
  const createErrorDoubt = useCreateErrorDoubt(supabase, notebookId);
  const resolveErrorDoubt = useResolveErrorDoubt(supabase, notebookId);
  const { quizzes } = useQuizzes(supabase, notebookId);
  const { assessments } = useAssessments(supabase, notebookId);
  const createAssessment = useCreateAssessment(supabase, notebookId);
  const createEventForAssessment = useCreateEventForAssessment(supabase, userId);
  const { studySessions } = useStudySessions(supabase, notebookId);
  const createStudySession = useCreateStudySession(supabase, notebookId);

  const notebook = notebooks.find((n) => n.id === notebookId);
  usePageMeta(
    notebook
      ? { title: notebook.name, subtitle: `Caderno · ${summaries.length} ${summaries.length === 1 ? "nota" : "notas"}` }
      : null,
  );

  const [topicTitle, setTopicTitle] = useState("");
  const [flashcardFront, setFlashcardFront] = useState("");
  const [flashcardBack, setFlashcardBack] = useState("");
  const [doubtDescription, setDoubtDescription] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [isWritingSummary, setIsWritingSummary] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingNotebook, setIsEditingNotebook] = useState(false);
  const [activeTab, setActiveTab] = useState<StudyTab>("visao-geral");
  const [sessionMinutes, setSessionMinutes] = useState(25);
  const [sessionNote, setSessionNote] = useState("");

  const today = getLocalDateKey();
  const dueFlashcards = flashcards.filter((f) => f.next_review_date <= today);
  const openDoubts = errorsDoubts.filter((item) => !item.is_resolved).length;
  const totalStudyMinutes = studySessions.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
  const showingSummary = activeTab === "visao-geral" || activeTab === "resumos";
  const showing = (...tabs: StudyTab[]) => activeTab === "visao-geral" || tabs.includes(activeTab);

  // A consulta já traz os resumos editados mais recentemente primeiro.
  const orderedSummaries = summaries;
  const selectedSummary = summaries.find((s) => s.id === selectedSummaryId) ?? orderedSummaries[0] ?? null;
  const showSummaryForm = isWritingSummary || isEditingSummary || selectedSummary === null;
  const selectedTopic = selectedSummary?.topic_id ? topics.find((t) => t.id === selectedSummary.topic_id) : undefined;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <section className="qv-card qv-card-vex p-6 sm:p-7 flex flex-col gap-5 overflow-hidden relative">
        <div className="absolute right-[-56px] top-[-92px] h-56 w-56 rounded-full border border-vex-cyan/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
            <Link to="/estudos" className="text-vex-cyan hover:text-vex-cyan-bright">← Estudos</Link>
            <span aria-hidden="true">/</span>
            <span>{notebook?.notebook_type?.replaceAll("_", " ") ?? "Caderno"}</span>
            {notebook && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="quiet" size="xs" aria-pressed={notebook.is_favorite} onClick={() => updateNotebook.mutate({ notebookId, input: { isFavorite: !notebook.is_favorite } })}>{notebook.is_favorite ? "★ Favorito" : "☆ Favoritar"}</Button>
              <label className="sr-only" htmlFor="notebook-status">Status do caderno</label>
              <select id="notebook-status" className="qv-field min-h-[36px] w-auto py-1.5 text-xs" value={notebook.status} onChange={(event) => updateNotebook.mutate({ notebookId, input: { status: event.target.value as typeof notebook.status } })}>
                <option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="concluido">Concluído</option><option value="arquivado">Arquivado</option>
              </select>
              <Button type="button" variant="ghost" size="xs" onClick={() => setIsEditingNotebook(true)}>Editar caderno</Button>
            </div>}
          </div>
          <div className="flex flex-col gap-2 max-w-[760px]">
            <h1 className="font-display text-[clamp(26px,4vw,40px)] leading-tight font-semibold m-0">{notebook?.name ?? "Caderno de estudos"}</h1>
            <p className="text-[15px] leading-relaxed text-text-secondary m-0">{notebook?.description || "Um espaço para transformar curiosidade em domínio, no seu ritmo."}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-w-[820px]">
            {[ ["Resumos", summaries.length], ["Revisar", dueFlashcards.length], ["Tópicos", topics.length], ["Dúvidas", openDoubts], ["Minutos", totalStudyMinutes] ].map(([label, value]) => <div key={label} className="qv-well px-3 py-2.5 flex flex-col gap-1"><span className="qv-eyebrow">{label}</span><strong className="font-mono text-[17px] text-text-primary">{value}</strong></div>)}
          </div>
        </div>
        <ChipTabs options={STUDY_TABS} value={activeTab} onChange={setActiveTab} className="relative pt-1" />
      </section>

      {updateNotebook.error && <Notice tone="error" title="Não foi possível atualizar o caderno">Tente novamente em instantes.</Notice>}

      {activeTab === "visao-geral" && <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <Card variant="milestone" className="min-h-[184px]"><CardHeader title="Sua próxima ação" meta="recomendado agora" />
          {dueFlashcards.length > 0 ? <div className="flex flex-col gap-2.5"><span className="font-semibold text-text-primary">Revisar {dueFlashcards.length} {dueFlashcards.length === 1 ? "flashcard" : "flashcards"}</span><span className="text-sm leading-relaxed text-text-secondary">Uma rodada curta agora mantém o conteúdo acessível quando você precisar dele.</span><Button type="button" variant="primary" size="sm" className="self-start" onClick={() => setActiveTab("revisao")}>Começar revisão</Button></div> : <div className="flex flex-col gap-2"><span className="font-semibold text-text-primary">O caminho está livre.</span><span className="text-sm leading-relaxed text-text-secondary">Registre uma sessão, escreva um resumo ou peça um quiz para continuar construindo este caderno.</span></div>}
        </Card>
        <Card><CardHeader title="Seu ritmo de estudo" meta={`${studySessions.length} ${studySessions.length === 1 ? "sessão" : "sessões"}`} />
          <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); createStudySession.mutate({ durationMinutes: sessionMinutes, note: sessionNote.trim() || undefined }, { onSuccess: () => setSessionNote("") }); }}>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 items-end"><Input label="Minutos" type="number" min={1} max={720} value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value) || 1)} /><Input label="Nota (opcional)" value={sessionNote} onChange={(event) => setSessionNote(event.target.value)} placeholder="O que avançou?" /></div>
            <Button type="submit" variant="secondary" size="sm" className="self-start" disabled={createStudySession.isPending}>{createStudySession.isPending ? "Registrando…" : "Registrar sessão"}</Button>
          </form>
          {createStudySession.error && <p role="alert" className="m-0 text-xs text-error">Não foi possível registrar. Seus dados continuam preenchidos; tente novamente.</p>}
          {studySessions.length > 0 && <div className="qv-row-top mt-1 flex flex-col gap-2 pt-3"><span className="qv-eyebrow">Atividade recente</span>{studySessions.slice(0, 3).map((studySession) => <div key={studySession.id} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-text-secondary">{studySession.note || "Sessão de estudo"}</span><span className="shrink-0 font-mono text-text-muted">{studySession.duration_minutes ? `${studySession.duration_minutes} min` : "—"} · {formatDayMonth(studySession.occurred_at)}</span></div>)}</div>}
        </Card>
      </section>}

      <div className={showingSummary ? "grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start" : "block"}>
      {/* Coluna esquerda: voltar + lista de notas (resumos) */}
      <div className={`qv-card p-[14px] flex flex-col gap-1.5 max-h-[230px] overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100dvh-150px)] ${showingSummary ? "" : "hidden"}`}>
        <Link
          to="/estudos"
          className="text-left text-[13px] text-text-secondary hover:text-text-primary px-2 py-1.5 transition-colors"
        >
          ← Todos os cadernos
        </Link>
        {orderedSummaries.map((summary) => {
          const isActive = !showSummaryForm && selectedSummary?.id === summary.id;
          return (
            <button
              key={summary.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => {
                setSelectedSummaryId(summary.id);
                setIsWritingSummary(false);
                setIsEditingSummary(false);
              }}
              className={`flex flex-col gap-[3px] p-2.5 rounded-[10px] text-left transition-colors ${
                isActive ? "bg-chip-cyan" : "hover:bg-chip-neutral"
              }`}
            >
              <span className="text-[13px] font-medium text-text-primary">{summary.title}</span>
              <span className="font-mono text-[11px] text-text-muted">{formatDayMonth(summary.created_at)}</span>
            </button>
          );
        })}
        <Button
          type="button"
          variant="dashed"
          size="sm"
          className="mt-1"
          onClick={() => { setIsWritingSummary(true); setIsEditingSummary(false); }}
          disabled={showSummaryForm}
        >
          + Novo resumo
        </Button>
      </div>

      <div className="flex flex-col gap-5 min-w-0">
        {/* Conteúdo da nota selecionada, ou formulário de novo resumo */}
        <div className={`qv-card px-8 py-7 flex flex-col gap-[18px] ${showingSummary ? "" : "hidden"}`}>
          {showSummaryForm ? (
            <>
              <span className="font-display text-[26px] font-semibold">{isEditingSummary ? "Editar resumo" : "Novo resumo"}</span>
              {!isEditingSummary && summaries.length === 0 && <EmptyState>Este caderno ainda não tem resumos. Escreva o primeiro para começar a estudar.</EmptyState>}
              <StudySummaryEditor
                key={isEditingSummary ? selectedSummary?.id : "new-summary"}
                initialTitle={isEditingSummary ? selectedSummary?.title : ""}
                initialContent={isEditingSummary ? selectedSummary?.content : ""}
                initialTopicId={isEditingSummary ? selectedSummary?.topic_id : ""}
                topics={topics}
                mode={isEditingSummary ? "edit" : "create"}
                isSaving={createSummary.isPending || updateSummary.isPending}
                onSave={(input) => {
                  if (isEditingSummary && selectedSummary) {
                    updateSummary.mutate({ summaryId: selectedSummary.id, input }, { onSuccess: () => setIsEditingSummary(false) });
                    return;
                  }
                  createSummary.mutate(input, { onSuccess: (created) => { setSelectedSummaryId(created.id); setIsWritingSummary(false); } });
                }}
                onCancel={() => { setIsWritingSummary(false); setIsEditingSummary(false); }}
              />
              {(createSummary.error || updateSummary.error) && <p role="alert" className="m-0 text-sm text-error">Não foi possível salvar agora. Seu texto continua aberto; tente novamente.</p>}
            </>
          ) : (
            selectedSummary && (
              <>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[26px] font-semibold flex-1 min-w-0">{selectedSummary.title}</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  {selectedTopic && <span className="qv-pill qv-pill-outline">{selectedTopic.title}</span>}
                  {SUMMARY_ORIGIN_LABEL[selectedSummary.origin] && (
                    <span className="qv-pill qv-pill-outline">{SUMMARY_ORIGIN_LABEL[selectedSummary.origin]}</span>
                  )}
                  <span className="font-mono text-[11px] text-text-muted px-1 py-[3px]">
                    editado {formatDayMonthTime(selectedSummary.updated_at)}
                  </span>
                </div>
                <div className="max-w-[78ch]"><SummaryMarkdown content={selectedSummary.content} /></div>
                <div className="qv-row-top pt-4 flex gap-2.5">
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setIsEditingSummary(true); setIsWritingSummary(false); }}>
                    Editar resumo
                  </Button>
                  <Button type="button" variant="quiet" size="sm" onClick={() => setIsWritingSummary(true)}>
                    Novo resumo
                  </Button>
                </div>
              </>
            )
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <Card className={showing("revisao") ? "" : "hidden"}>
            <CardHeader title="Flashcards para revisar" meta={dueFlashcards.length} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!flashcardFront.trim() || !flashcardBack.trim()) return;
                createFlashcard.mutate({ front: flashcardFront.trim(), back: flashcardBack.trim() });
                setFlashcardFront("");
                setFlashcardBack("");
              }}
              className="flex gap-2.5 items-end flex-wrap"
            >
              <Input
                label="Frente"
                value={flashcardFront}
                onChange={(e) => setFlashcardFront(e.target.value)}
                wrapperClassName="flex-1 min-w-[140px]"
              />
              <Input
                label="Verso"
                value={flashcardBack}
                onChange={(e) => setFlashcardBack(e.target.value)}
                wrapperClassName="flex-1 min-w-[140px]"
              />
              <Button type="submit" variant="primary">
                Criar
              </Button>
            </form>
            {dueFlashcards.length === 0 ? (
              <EmptyState>Nenhum flashcard para revisar hoje.</EmptyState>
            ) : (
              <div className="flex flex-col gap-2.5">
                {dueFlashcards.map((flashcard) => (
                  <FlashcardReviewCard
                    key={flashcard.id}
                    flashcard={flashcard}
                    onGrade={(grade) => reviewFlashcard.mutate({ flashcard, grade })}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className={showing("quizzes") ? "" : "hidden"}>
            <CardHeader title="Quizzes" meta={quizzes.length} />
            <p className="text-xs text-text-muted">Peça pra Vex gerar um Quiz a partir dos Resumos deste Caderno.</p>
            {quizzes.length === 0 ? (
              <EmptyState>Nenhum Quiz gerado ainda.</EmptyState>
            ) : (
              <ul className="flex flex-col">
                {quizzes.map((quiz) => (
                  <QuizListItem key={quiz.id} client={supabase} userId={userId} quiz={quiz} />
                ))}
              </ul>
            )}
          </Card>

          <Card className={showing("estrutura") ? "" : "hidden"}>
            <CardHeader title="Tópicos" meta={topics.length} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!topicTitle.trim()) return;
                createTopic.mutate({ title: topicTitle.trim() });
                setTopicTitle("");
              }}
              className="flex gap-2.5 items-end"
            >
              <Input
                label="Novo tópico"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                wrapperClassName="flex-1"
              />
              <Button type="submit" variant="primary">
                Adicionar
              </Button>
            </form>
            {topics.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {topics.map((topic) => (
                  <span key={topic.id} className="qv-pill qv-pill-outline">
                    {topic.title}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card className={showing("estrutura") ? "" : "hidden"}>
            <CardHeader
              title="Erros & Dúvidas"
              meta={`${errorsDoubts.filter((item) => !item.is_resolved).length} abertas`}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!doubtDescription.trim()) return;
                createErrorDoubt.mutate(doubtDescription.trim());
                setDoubtDescription("");
              }}
              className="flex gap-2.5 items-end"
            >
              <Input
                label="Registrar dúvida ou erro"
                value={doubtDescription}
                onChange={(e) => setDoubtDescription(e.target.value)}
                wrapperClassName="flex-1"
              />
              <Button type="submit" variant="primary">
                Registrar
              </Button>
            </form>
            {errorsDoubts.length > 0 && (
              <ul className="flex flex-col">
                {errorsDoubts.map((item) => (
                  <li key={item.id} className="qv-row">
                    <label className="flex items-center gap-2.5 py-2.5 text-sm text-text-primary cursor-pointer">
                      <input
                        type="checkbox"
                        className="qv-check"
                        checked={item.is_resolved}
                        onChange={(e) => resolveErrorDoubt.mutate({ id: item.id, isResolved: e.target.checked })}
                      />
                      <span className={item.is_resolved ? "line-through text-text-muted" : ""}>{item.description}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={showing("planejamento") ? "" : "hidden"}>
            <CardHeader title="Avaliações" meta={assessments.length} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!assessmentName.trim()) return;
                createAssessment.mutate({ name: assessmentName.trim(), assessmentDate: assessmentDate || undefined });
                setAssessmentName("");
                setAssessmentDate("");
              }}
              className="flex gap-2.5 items-end flex-wrap"
            >
              <Input
                label="Nome da avaliação"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                wrapperClassName="flex-1 min-w-[160px]"
              />
              <Input
                label="Data"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="font-mono"
              />
              <Button type="submit" variant="primary">
                Adicionar
              </Button>
            </form>
            {assessments.length > 0 && (
              <ul className="flex flex-col">
                {assessments.map((assessment) => (
                  <li key={assessment.id} className="qv-row flex items-center justify-between gap-3 py-2.5">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium text-text-primary">{assessment.name}</span>
                      {assessment.assessment_date && (
                        <span className="font-mono text-[11px] text-text-muted">
                          {formatDateOnly(assessment.assessment_date)}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="quiet"
                      size="xs"
                      onClick={() => createEventForAssessment.mutate(assessment)}
                      disabled={!assessment.assessment_date || createEventForAssessment.isPending}
                    >
                      Criar evento na Agenda
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={showing("materiais") ? "" : "hidden"}>
            <RelatedLibraryItemsPanel client={supabase} notebookId={notebookId} />
          </Card>

          <Card className={`xl:col-span-2 ${showing("materiais") ? "" : "hidden"}`}>
            <AttachDocumentPanel client={supabase} relatedModule="estudos" relatedEntityId={notebookId} />
          </Card>
        </div>
      </div>
    </div>
    <Modal isOpen={isEditingNotebook && Boolean(notebook)} onClose={() => !updateNotebook.isPending && setIsEditingNotebook(false)} title="Editar caderno" size="lg">
      {notebook && <NewNotebookForm key={notebook.id} initialNotebook={notebook} mode="edit" isSubmitting={updateNotebook.isPending} onCancel={() => setIsEditingNotebook(false)} onSave={(input) => updateNotebook.mutate({ notebookId, input }, { onSuccess: () => setIsEditingNotebook(false) })} />}
    </Modal>
    </div>
  );
}
