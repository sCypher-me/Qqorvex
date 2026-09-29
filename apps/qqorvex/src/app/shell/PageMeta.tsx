import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getRouteContext } from "./navigation";

/**
 * Título da rota atual (aba do navegador e leitores de tela). Páginas de detalhe (caderno,
 * nota) sobrescrevem com `usePageMeta({ title })` enquanto estão montadas.
 */
export interface PageMetaValue {
  title: string;
  subtitle?: string;
}

interface PageMetaContextValue {
  override: PageMetaValue | null;
  setOverride: (meta: PageMetaValue | null) => void;
}

const PageMetaContext = createContext<PageMetaContextValue | null>(null);

export function getRouteMeta(pathname: string): PageMetaValue {
  return { title: getRouteContext(pathname).title };
}

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageMetaValue | null>(null);
  const location = useLocation();

  useEffect(() => {
    setOverride(null);
  }, [location.pathname]);

  const effectiveTitle = (override ?? getRouteMeta(location.pathname)).title;
  useEffect(() => {
    document.title = `${effectiveTitle} · Qqorvex`;
  }, [effectiveTitle]);

  return <PageMetaContext.Provider value={{ override, setOverride }}>{children}</PageMetaContext.Provider>;
}

export function useCurrentPageMeta(): PageMetaValue {
  const context = useContext(PageMetaContext);
  const location = useLocation();
  return context?.override ?? getRouteMeta(location.pathname);
}

/** Sobrescreve o título enquanto a página estiver montada (`null` mantém o padrão da rota). */
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
