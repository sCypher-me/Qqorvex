import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardHeader, ChipTabs, EmptyState, Input, Modal, Notice, PlusIcon, SectionTitle, Skeleton } from "@qqorvex/ui";
import { NewNotebookForm, NotebookCard, useCreateNotebook, useDeleteNotebook, useEstudosOverview, useNotebooks, useUpdateNotebook } from "@qqorvex/module-estudos";
import { useAuth } from "@qqorvex/auth";
import { billingLimitMessage } from "@qqorvex/database";
import { supabase } from "../app/supabase";
import { usePageMeta } from "../app/shell/PageMeta";

type NotebookFilter = "todos" | "ativo" | "pausado" | "concluido" | "favoritos";
const statusTabs: { value: NotebookFilter; label: string }[] = [
  { value: "todos", label: "Todos" }, { value: "ativo", label: "Ativos" }, { value: "pausado", label: "Pausados" },
  { value: "concluido", label: "Concluídos" }, { value: "favoritos", label: "Favoritos" },
];

function Metric({ label, value, hint, tone }: { label: string; value: number | string; hint: string; tone: "cyan" | "gold" | "green" }) {
  const color = tone === "gold" ? "text-vex-gold-bright" : tone === "green" ? "text-success" : "text-vex-cyan-bright";
  return <div className="editorial-knowledge-stat px-4 py-4 flex flex-col gap-2 min-w-0"><span className="qv-eyebrow">{label}</span><span className={`font-display text-[27px] font-semibold ${color}`}>{value}</span><span className="text-xs text-text-muted truncate">{hint}</span></div>;
}

export function EstudosPage() {
  const { session } = useAuth();
  const userId = session!.user.id;
  usePageMeta({ title: "Estudos", subtitle: "Organize conhecimento, revise no tempo certo e avance com intenção." });
  const { notebooks, isLoading, error } = useNotebooks(supabase);
  const { dueFlashcards, upcomingAssessments, isLoading: overviewLoading } = useEstudosOverview(supabase);
  const createNotebook = useCreateNotebook(supabase, userId);
  const deleteNotebook = useDeleteNotebook(supabase);
  const updateNotebook = useUpdateNotebook(supabase);
  const [filter, setFilter] = useState<NotebookFilter>("todos");
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredNotebooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return notebooks.filter((notebook) => {
      const matchesFilter = filter === "todos" || (filter === "favoritos" ? notebook.is_favorite : notebook.status === filter);
      const haystack = `${notebook.name} ${notebook.area ?? ""} ${notebook.description ?? ""} ${notebook.institution ?? ""} ${notebook.instructor ?? ""} ${notebook.tags.join(" ")}`.toLocaleLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    }).sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [filter, notebooks, search]);
  const activeCount = notebooks.filter((notebook) => notebook.status === "ativo").length;
  const favoriteCount = notebooks.filter((notebook) => notebook.is_favorite).length;
  const nextAssessment = upcomingAssessments[0];
  const nextAssessmentNotebook = nextAssessment ? notebooks.find((notebook) => notebook.id === nextAssessment.notebook_id) : undefined;

  return <div className="qv-page editorial-module-page flex flex-col gap-6 pb-8">
    <section className="editorial-module-hero">
      <div className="relative flex flex-col gap-5 max-w-[760px]">
        <div className="flex items-center gap-2 text-vex-gold-bright"><span className="w-2 h-2 rounded-full bg-vex-gold-bright" aria-hidden="true" /><span className="qv-eyebrow">Estudos · sua jornada</span></div>
        <div className="flex flex-col gap-2"><h1 className="font-display text-[clamp(28px,4vw,44px)] leading-[1.08] font-semibold m-0">Aprenda com mais clareza.</h1><p className="text-[15px] leading-relaxed text-text-secondary max-w-[620px] m-0">Seus cadernos reúnem resumos, revisões, quizzes e próximos marcos em um só lugar. Escolha um foco e continue de onde parou.</p></div>
        <div className="flex flex-wrap gap-2.5"><Button type="button" variant="primary" onClick={() => setIsCreating(true)}><PlusIcon size={16} aria-hidden="true" /> Novo caderno</Button>{notebooks.length > 0 && <Link to={`/estudos/${notebooks.find((notebook) => notebook.status === "ativo")?.id ?? notebooks[0]!.id}`} className="qv-btn qv-btn-secondary">Continuar estudando</Link>}</div>
      </div>
    </section>

    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Metric label="Cadernos ativos" value={activeCount} hint={`${notebooks.length} no total · ${favoriteCount} favoritos`} tone="cyan" />
      <Metric label="Revisões pendentes" value={overviewLoading ? "—" : dueFlashcards.length} hint={dueFlashcards.length ? "Prontas para sua próxima sessão" : "Nada vencido por enquanto"} tone="gold" />
      <Metric label="Próximas avaliações" value={overviewLoading ? "—" : upcomingAssessments.length} hint="Dentro dos próximos 7 dias" tone="green" />
      <Metric label="Sistema" value="SM-2" hint="Revisão espaçada ativa" tone="cyan" />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start">
      <Card variant="milestone" className="min-h-[188px]"><CardHeader title="Próximo passo" meta="foco recomendado" />
        {dueFlashcards.length > 0 ? <div className="flex flex-col gap-3"><div className="flex items-start gap-3"><span className="w-9 h-9 rounded-full bg-[var(--qv-chip-gold)] text-vex-gold-bright flex items-center justify-center font-mono">↻</span><div className="flex flex-col gap-1 min-w-0"><span className="font-semibold text-text-primary">Faça uma rodada de revisão</span><span className="text-sm text-text-secondary">{dueFlashcards.length} {dueFlashcards.length === 1 ? "flashcard aguarda" : "flashcards aguardam"} você hoje.</span></div></div>{notebooks[0] && <Link to={`/estudos/${notebooks[0].id}`} className="text-sm text-vex-cyan hover:text-vex-cyan-bright">Abrir um caderno para revisar →</Link>}</div>
        : nextAssessment ? <div className="flex flex-col gap-3"><div className="flex items-start gap-3"><span className="w-9 h-9 rounded-full bg-[var(--qv-chip-cyan)] text-vex-cyan-bright flex items-center justify-center font-mono">!</span><div className="flex flex-col gap-1 min-w-0"><span className="font-semibold text-text-primary">{nextAssessment.name}</span><span className="text-sm text-text-secondary">Avaliação em {nextAssessment.assessment_date ? nextAssessment.assessment_date.split("-").reverse().join("/") : "breve"}{nextAssessmentNotebook ? ` · ${nextAssessmentNotebook.name}` : ""}</span></div></div>{nextAssessmentNotebook && <Link to={`/estudos/${nextAssessmentNotebook.id}`} className="text-sm text-vex-cyan hover:text-vex-cyan-bright">Preparar este caderno →</Link>}</div>
        : <div className="flex flex-col gap-2"><span className="font-semibold text-text-primary">Tudo em dia por aqui.</span><span className="text-sm text-text-secondary">Crie um caderno ou registre uma sessão para construir seu próximo ritmo de estudo.</span></div>}
      </Card>
      <Card className="min-h-[188px]"><CardHeader title="Como usar Estudos" meta="3 movimentos" /><ol className="flex flex-col gap-3 m-0 p-0 list-none">{[["01", "Capture", "Crie um caderno e escreva o que quer dominar."], ["02", "Consolide", "Transforme resumos em flashcards e quizzes."], ["03", "Retome", "Volte ao conteúdo no momento certo."]].map(([number, title, description]) => <li key={number} className="flex gap-3 items-start"><span className="font-mono text-[11px] text-vex-cyan mt-0.5">{number}</span><span className="text-[13px] leading-relaxed"><strong className="text-text-primary">{title}.</strong> <span className="text-text-secondary">{description}</span></span></li>)}</ol></Card>
    </section>

    <section className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end"><div className="flex flex-col gap-1.5 flex-1"><SectionTitle meta={`${filteredNotebooks.length} exibidos`}>Seus cadernos</SectionTitle><span className="text-sm text-text-muted">Cada caderno é um espaço vivo para uma frente de aprendizado.</span></div><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar caderno..." aria-label="Buscar caderno" className="lg:max-w-[260px]" /></div>
      <ChipTabs options={statusTabs} value={filter} onChange={setFilter} />
      {error && <Notice tone="error" title="Não foi possível carregar seus cadernos">Tente atualizar a página. O restante da tela continua disponível.</Notice>}
      {updateNotebook.error && <Notice tone="error" title="Não foi possível atualizar o caderno">Tente novamente em instantes.</Notice>}
      {isLoading ? <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[190px] w-full rounded-2xl" />)}</div> : filteredNotebooks.length === 0 ? <Card className="items-center justify-center min-h-[180px] text-center"><span className="w-11 h-11 rounded-full bg-[var(--qv-chip-cyan)] text-vex-cyan-bright flex items-center justify-center font-display text-xl">⌁</span><span className="font-semibold text-text-primary">{notebooks.length === 0 ? "Seu primeiro caderno começa aqui" : "Nenhum caderno encontrado"}</span><EmptyState>{notebooks.length === 0 ? "Dê um nome ao assunto que você quer aprender e construa seu espaço de estudo." : "Tente outra busca ou limpe o filtro atual."}</EmptyState>{notebooks.length === 0 && <Button type="button" variant="primary" size="sm" onClick={() => setIsCreating(true)}>Criar primeiro caderno</Button>}</Card> : <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">{filteredNotebooks.map((notebook) => <NotebookCard key={notebook.id} notebook={notebook} onDelete={() => deleteNotebook.mutate(notebook.id)} onToggleFavorite={() => updateNotebook.mutate({ notebookId: notebook.id, input: { isFavorite: !notebook.is_favorite } })} />)}</div>}
    </section>

    <Modal isOpen={isCreating} onClose={() => !createNotebook.isPending && setIsCreating(false)} title="Novo caderno" size="lg"><p className="text-sm text-text-secondary m-0">Defina o que você vai estudar, por que isso importa e quando pretende avançar. O contexto pode ser editado depois.</p><NewNotebookForm isSubmitting={createNotebook.isPending} onCancel={() => setIsCreating(false)} onSave={(input) => createNotebook.mutate(input, { onSuccess: () => setIsCreating(false) })} />{createNotebook.error && <Notice tone="error" title="Não foi possível criar o caderno">{billingLimitMessage(createNotebook.error) ?? "Seus dados continuam no formulário. Confira a conexão e tente novamente."}</Notice>}</Modal>
  </div>;
}
