import type { SidebarSection } from "@qqorvex/ui";

/**
 * Navegação principal — seções agrupam destinos pela intenção de uso.
 * "Manager" só aparece pro Dono (`profiles.role === 'dono'`) — RLS/SECURITY DEFINER no banco já
 * protegem os dados mesmo se alguém forçar a URL, isso aqui é só não oferecer o link à toa.
 */
export function getNavSections(isOwner: boolean): SidebarSection[] {
  return [
    {
      title: "Rotina",
      items: [
        { label: "Hoje", to: "/" },
        { label: "Tarefas", to: "/tarefas" },
        { label: "Agenda", to: "/agenda" },
        { label: "Metas & Hábitos", to: "/metas-habitos" },
      ],
    },
    {
      title: "Desenvolvimento",
      items: [
        { label: "Estudos", to: "/estudos", matchChildren: true },
        { label: "Gamificação", to: "/gamificacao" },
        { label: "Segundo Cérebro", to: "/segundo-cerebro", matchChildren: true },
        { label: "Biblioteca", to: "/biblioteca" },
        { label: "Documentos", to: "/documentos" },
      ],
    },
    {
      title: "Pessoal",
      items: [
        { label: "Finanças", to: "/financas" },
        { label: "Vida Pessoal", to: "/vida-pessoal" },
        { label: "Perfil", to: "/perfil" },
        ...(isOwner ? [{ label: "Central do Dono", to: "/manager" }] : []),
      ],
    },
  ];
}

/** Seção da navegação correspondente à rota atual; usada como contexto no cabeçalho global. */
export function getNavSectionForPath(pathname: string): string {
  return getNavSections(true).find((section) =>
    section.items.some((item) => pathname === item.to || (item.matchChildren && pathname.startsWith(`${item.to}/`))),
  )?.title ?? "Workspace";
}

/** Rótulo legível do módulo de origem de um item da Hoje (`HojeItem.source`). */
export const MODULE_LABELS: Record<string, string> = {
  tarefas: "Tarefas",
  agenda: "Agenda",
  "metas-habitos": "Metas",
  estudos: "Estudos",
  "segundo-cerebro": "Segundo Cérebro",
  biblioteca: "Biblioteca",
  documentos: "Documentos",
  financas: "Finanças",
  "vida-pessoal": "Vida Pessoal",
};

export const BRAND_ASSETS = {
  symbol: "/brand/symbol.png",
  wordmark: "/brand/wordmark.png",
  vexAvatar: "/brand/chat.jpg",
  vexPattern: "/brand/vex-pattern.png",
};
