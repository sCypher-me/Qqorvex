import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Input, Textarea } from "@qqorvex/ui";
import {
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
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-sm text-text-primary">
          {quiz.title} — {attempts.length} tentativa(s)
          {bestScore >= 0 ? `, melhor: ${bestScore}/${questions.length}` : ""}
        </span>
        <Button type="button" variant="chip" onClick={() => setIsTaking((v) => !v)}>
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

  const [topicTitle, setTopicTitle] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryContent, setSummaryContent] = useState("");
  const [flashcardFront, setFlashcardFront] = useState("");
  const [flashcardBack, setFlashcardBack] = useState("");
  const [doubtDescription, setDoubtDescription] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const dueFlashcards = flashcards.filter((f) => f.next_review_date <= today);

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text-primary">Caderno</h1>
        <Link to="/estudos" className="text-sm text-text-secondary-warm hover:text-text-primary">
          Voltar para Estudos
        </Link>
      </div>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Tópicos</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!topicTitle.trim()) return;
            createTopic.mutate({ title: topicTitle.trim() });
            setTopicTitle("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Input label="Novo tópico" value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} />
          </div>
          <Button type="submit" variant="primary">
            Adicionar
          </Button>
        </form>
        <ul className="flex flex-col gap-1">
          {topics.map((topic) => (
            <li key={topic.id} className="font-sans text-sm text-text-primary">
              {topic.title}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Resumos</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!summaryTitle.trim()) return;
            createSummary.mutate({ title: summaryTitle.trim(), content: summaryContent });
            setSummaryTitle("");
            setSummaryContent("");
          }}
          className="flex flex-col gap-2"
        >
          <Input label="Título do resumo" value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} />
          <Textarea label="Conteúdo" value={summaryContent} onChange={(e) => setSummaryContent(e.target.value)} rows={3} />
          <Button type="submit" variant="primary" className="self-start">
            Salvar resumo
          </Button>
        </form>
        <ul className="flex flex-col gap-1">
          {summaries.map((summary) => (
            <li key={summary.id} className="font-sans text-sm text-text-primary">
              {summary.title}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Flashcards para revisar ({dueFlashcards.length})
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!flashcardFront.trim() || !flashcardBack.trim()) return;
            createFlashcard.mutate({ front: flashcardFront.trim(), back: flashcardBack.trim() });
            setFlashcardFront("");
            setFlashcardBack("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Input label="Frente" value={flashcardFront} onChange={(e) => setFlashcardFront(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input label="Verso" value={flashcardBack} onChange={(e) => setFlashcardBack(e.target.value)} />
          </div>
          <Button type="submit" variant="primary">
            Criar
          </Button>
        </form>
        <div className="flex flex-col gap-2">
          {dueFlashcards.map((flashcard) => (
            <FlashcardReviewCard
              key={flashcard.id}
              flashcard={flashcard}
              onGrade={(grade) => reviewFlashcard.mutate({ flashcard, grade })}
            />
          ))}
        </div>
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Quizzes</h2>
        <p className="font-sans text-xs text-text-secondary-warm">
          Peça pra Vex gerar um Quiz a partir dos Resumos deste Caderno.
        </p>
        {quizzes.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary-warm">Nenhum Quiz gerado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {quizzes.map((quiz) => (
              <QuizListItem key={quiz.id} client={supabase} userId={userId} quiz={quiz} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Erros & Dúvidas</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!doubtDescription.trim()) return;
            createErrorDoubt.mutate(doubtDescription.trim());
            setDoubtDescription("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Input label="Registrar dúvida ou erro" value={doubtDescription} onChange={(e) => setDoubtDescription(e.target.value)} />
          </div>
          <Button type="submit" variant="primary">
            Registrar
          </Button>
        </form>
        <ul className="flex flex-col gap-1">
          {errorsDoubts.map((item) => (
            <li key={item.id} className="flex items-center gap-2 font-sans text-sm text-text-primary">
              <input
                type="checkbox"
                checked={item.is_resolved}
                onChange={(e) => resolveErrorDoubt.mutate({ id: item.id, isResolved: e.target.checked })}
              />
              <span className={item.is_resolved ? "line-through text-text-secondary-warm" : ""}>
                {item.description}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="w-full max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-text-primary">Avaliações</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!assessmentName.trim()) return;
            createAssessment.mutate({ name: assessmentName.trim(), assessmentDate: assessmentDate || undefined });
            setAssessmentName("");
            setAssessmentDate("");
          }}
          className="flex gap-2 items-end"
        >
          <div className="flex-1">
            <Input label="Nome da avaliação" value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} />
          </div>
          <Input label="Data" type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} />
          <Button type="submit" variant="primary">
            Adicionar
          </Button>
        </form>
        <ul className="flex flex-col gap-2">
          {assessments.map((assessment) => (
            <li key={assessment.id} className="flex items-center justify-between gap-2 font-sans text-sm text-text-primary">
              <span>
                {assessment.name}
                {assessment.assessment_date ? ` — ${assessment.assessment_date}` : ""}
              </span>
              <Button
                type="button"
                variant="chip"
                onClick={() => createEventForAssessment.mutate(assessment)}
                disabled={!assessment.assessment_date || createEventForAssessment.isPending}
              >
                Criar evento na Agenda
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="w-full max-w-2xl">
        <RelatedLibraryItemsPanel client={supabase} notebookId={notebookId} />
      </Card>

      <Card className="w-full max-w-2xl">
        <AttachDocumentPanel client={supabase} relatedModule="estudos" relatedEntityId={notebookId} />
      </Card>
    </main>
  );
}
