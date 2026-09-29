import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";

/**
 * Metadados de rota usados no título do documento e por páginas de detalhe (caderno, página do
 * Segundo Cérebro). A top bar do shell mantém uma hierarquia própria de saudação e data.
 */
export interface PageMetaValue {
  title: string;
  subtitle?: string;
}

const ROUTE_META: { path: string; meta: PageMetaValue }[] = [
  { path: "/", meta: { title: "Hoje", subtitle: "Tudo que pede sua atenção agora" } },
  { path: "/gamificacao", meta: { title: "Gamificação", subtitle: "Nível, XP e badges" } },
  { path: "/manager", meta: { title: "Central do Dono", subtitle: "Controle privado do Qqorvex" } },
  { path: "/tarefas", meta: { title: "Tarefas", subtitle: "Kanban e listas" } },
  { path: "/agenda", meta: { title: "Agenda", subtitle: "Eventos, reuniões e recorrências" } },
  { path: "/metas-habitos", meta: { title: "Metas & Hábitos", subtitle: "Progresso recorrente" } },
  { path: "/estudos", meta: { title: "Estudos", subtitle: "Cadernos e revisões espaçadas" } },
  { path: "/estudos/:notebookId", meta: { title: "Caderno", subtitle: "Estudos" } },
  { path: "/segundo-cerebro", meta: { title: "Segundo Cérebro", subtitle: "Notas, grafo e bases" } },
  { path: "/segundo-cerebro/:pageId", meta: { title: "Página", subtitle: "Segundo Cérebro" } },
  { path: "/biblioteca", meta: { title: "Biblioteca", subtitle: "Livros, filmes, séries e jogos" } },
  { path: "/documentos", meta: { title: "Documentos", subtitle: "Arquivos e vencimentos" } },
  { path: "/financas", meta: { title: "Finanças", subtitle: "Contas, gastos e orçamento" } },
  { path: "/vida-pessoal", meta: { title: "Vida Pessoal", subtitle: "Planejamento, bem-estar e vida prática" } },
  { path: "/perfil", meta: { title: "Perfil", subtitle: "Identidade, badges e preferências" } },
  { path: "/assinatura", meta: { title: "Planos e assinatura", subtitle: "Free e Qqorvex Plus" } },
  { path: "/vex", meta: { title: "Vex", subtitle: "Conversa com contexto das suas telas" } },
];

export function getRouteMeta(pathname: string): PageMetaValue {
  const found = ROUTE_META.find((entry) => matchPath({ path: entry.path, end: true }, pathname));
  return found?.meta ?? { title: "Qqorvex" };
}

interface PageMetaContextValue {
  override: PageMetaValue | null;
  setOverride: (meta: PageMetaValue | null) => void;
}

const PageMetaContext = createContext<PageMetaContextValue | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageMetaValue | null>(null);
  const location = useLocation();

  useEffect(() => {
    setOverride(null);
  }, [location.pathname]);

  const effectiveTitle = (override ?? getRouteMeta(location.pathname)).title;

  /**
   * `<title>` do navegador nunca mudava entre rotas (React Router não recarrega a página, então
   * ficava travado no título fixo do `index.html`) — quebra o histórico/abas do navegador e, mais
   * importante, é como leitores de tela percebem que a "página" trocou numa SPA sem reload real.
   * O texto já existe pronto em `ROUTE_META`/`usePageMeta()`; basta espelhar o título efetivo aqui.
   */
  useEffect(() => {
    document.title = `${effectiveTitle} · Qqorvex`;
  }, [effectiveTitle]);

  return <PageMetaContext.Provider value={{ override, setOverride }}>{children}</PageMetaContext.Provider>;
}

/** Meta efetiva da rota: override da página, senão o padrão definido em `ROUTE_META`. */
export function useCurrentPageMeta(): PageMetaValue {
  const context = useContext(PageMetaContext);
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  return context?.override ?? routeMeta;
}

/**
 * Sobrescreve título/subtítulo do cabeçalho enquanto a página estiver montada. Passe `null`
 * enquanto os dados carregam para manter o padrão da rota.
 */
export function usePageMeta(meta: PageMetaValue | null) {
  const context = useContext(PageMetaContext);
  const title = meta?.title;
  const subtitle = meta?.subtitle;
  useEffect(() => {
    if (!context || !title) return;
    context.setOverride({ title, subtitle });
    return () => context.setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle]);
}
