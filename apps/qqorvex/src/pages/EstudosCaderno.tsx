import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, CardHeader, EmptyState, Input, Textarea } from "@qqorvex/ui";
import {
  useNotebooks,
  useTopics,
  useCreateTopic,
  useSummaries,
  useCreateSummary,
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
  FlashcardReviewCard,
  QuizTakingForm,
  RelatedLibraryItemsPanel,
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
  const { topics } = useTopics(supabase, notebookId);
  const createTopic = useCreateTopic(supabase, notebookId);
  const { summaries } = useSummaries(supabase, notebookId);
  const createSummary = useCreateSummary(supabase, notebookId);
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

  const notebook = notebooks.find((n) => n.id === notebookId);
  usePageMeta(
    notebook
      ? { title: notebook.name, subtitle: `Caderno · ${summaries.length} ${summaries.length === 1 ? "nota" : "notas"}` }
      : null,
  );

  const [topicTitle, setTopicTitle] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryContent, setSummaryContent] = useState("");
  const [flashcardFront, setFlashcardFront] = useState("");
  const [flashcardBack, setFlashcardBack] = useState("");
  const [doubtDescription, setDoubtDescription] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [isWritingSummary, setIsWritingSummary] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const dueFlashcards = flashcards.filter((f) => f.next_review_date <= today);

  // Mais recentes no topo, como na lista de notas do design.
  const orderedSummaries = [...summaries].reverse();
  const selectedSummary = summaries.find((s) => s.id === selectedSummaryId) ?? orderedSummaries[0] ?? null;
  const showSummaryForm = isWritingSummary || selectedSummary === null;
  const selectedTopic = selectedSummary?.topic_id ? topics.find((t) => t.id === selectedSummary.topic_id) : undefined;
  const paragraphs = selectedSummary ? selectedSummary.content.split(/\n\s*\n/).filter((p) => p.trim()) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
      {/* Coluna esquerda: voltar + lista de notas (resumos) */}
      <div className="qv-card p-[14px] flex flex-col gap-1.5">
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
              }}
              className={`flex flex-col gap-[3px] p-2.5 rounded-[10px] text-left transition-colors ${
                isActive ? "bg-[rgba(67,185,210,.10)]" : "hover:bg-[rgba(255,255,255,.04)]"
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
          onClick={() => setIsWritingSummary(true)}
          disabled={showSummaryForm}
        >
          + Novo resumo
        </Button>
      </div>

      <div className="flex flex-col gap-5 min-w-0">
        {/* Conteúdo da nota selecionada, ou formulário de novo resumo */}
        <div className="qv-card px-8 py-7 flex flex-col gap-[18px]">
          {showSummaryForm ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!summaryTitle.trim()) return;
                createSummary.mutate(
                  { title: summaryTitle.trim(), content: summaryContent },
                  {
                    onSuccess: (created) => {
                      setSelectedSummaryId(created.id);
                      setIsWritingSummary(false);
                    },
                  },
                );
                setSummaryTitle("");
                setSummaryContent("");
              }}
              className="flex flex-col gap-[18px]"
            >
              <span className="font-display text-[26px] font-semibold">Novo resumo</span>
              {summaries.length === 0 && (
                <EmptyState>Este caderno ainda não tem resumos. Escreva o primeiro para começar a estudar.</EmptyState>
              )}
              <Input label="Título do resumo" value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} />
              <Textarea
                label="Conteúdo"
                value={summaryContent}
                onChange={(e) => setSummaryContent(e.target.value)}
                rows={8}
              />
              <div className="qv-row-top pt-4 flex gap-2.5">
                <Button type="submit" variant="primary" size="sm">
                  Salvar resumo
                </Button>
                {summaries.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsWritingSummary(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
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
                <div className="flex flex-col gap-3.5 text-[15px] leading-[1.75] text-text-secondary max-w-[70ch]">
                  {paragraphs.length === 0 ? (
                    <p className="m-0 text-text-muted">Resumo sem conteúdo.</p>
                  ) : (
                    paragraphs.map((paragraph, index) => (
                      <p key={index} className="m-0 whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))
                  )}
                </div>
                <div className="qv-row-top pt-4 flex gap-2.5">
                  <Button type="button" variant="quiet" size="sm" onClick={() => setIsWritingSummary(true)}>
                    Novo resumo
                  </Button>
                </div>
              </>
            )
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <Card>
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

          <Card>
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

          <Card>
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

          <Card>
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

          <Card>
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

          <Card>
            <RelatedLibraryItemsPanel client={supabase} notebookId={notebookId} />
          </Card>

          <Card className="xl:col-span-2">
            <AttachDocumentPanel client={supabase} relatedModule="estudos" relatedEntityId={notebookId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
