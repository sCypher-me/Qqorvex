import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { matchPath, useLocation } from "react-router-dom";

/**
 * Título/subtítulo exibidos no cabeçalho fixo do shell (o design não repete o título dentro da
 * página). Cada rota tem um padrão em `ROUTE_META`; páginas de detalhe (caderno, página do
 * Segundo Cérebro) sobrescrevem com `usePageMeta()` quando o nome real carrega.
 */
export interface PageMetaValue {
  title: string;
  subtitle?: string;
}

const ROUTE_META: { path: string; meta: PageMetaValue }[] = [
  { path: "/", meta: { title: "Hoje", subtitle: "Tudo que pede sua atenção agora" } },
  { path: "/gamificacao", meta: { title: "Gamificação", subtitle: "Nível, XP e badges" } },
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
  { path: "/perfil", meta: { title: "Perfil", subtitle: "Sua conta, badges e preferências" } },
  { path: "/seguranca", meta: { title: "Segurança", subtitle: "Sessões, 2FA, passkeys e integrações" } },
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

  return <PageMetaContext.Provider value={{ override, setOverride }}>{children}</PageMetaContext.Provider>;
}

/** Meta efetiva para o cabeçalho: override da página, senão o padrão da rota. */
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
