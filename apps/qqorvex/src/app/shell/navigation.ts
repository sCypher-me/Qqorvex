import type { SidebarSection } from "@qqorvex/ui";

/**
 * Navegação principal (Design System v1.0) — sem ícones, seções agrupando os módulos.
 * "Manager" só aparece pro Dono (`profiles.role === 'dono'`) — RLS/SECURITY DEFINER no banco já
 * protegem os dados mesmo se alguém forçar a URL, isso aqui é só não oferecer o link à toa.
 */
export function getNavSections(isOwner: boolean): SidebarSection[] {
  return [
    {
      title: "Principal",
      items: [
        { label: "Hoje", to: "/" },
        { label: "Gamificação", to: "/gamificacao" },
        ...(isOwner ? [{ label: "Manager", to: "/manager" }] : []),
      ],
    },
  {
    title: "Organização",
    items: [
      { label: "Tarefas", to: "/tarefas" },
      { label: "Agenda", to: "/agenda" },
      { label: "Metas & Hábitos", to: "/metas-habitos" },
    ],
  },
  {
    title: "Conhecimento",
    items: [
      { label: "Estudos", to: "/estudos", matchChildren: true },
      { label: "Segundo Cérebro", to: "/segundo-cerebro", matchChildren: true },
      { label: "Biblioteca", to: "/biblioteca" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Documentos", to: "/documentos" },
      { label: "Finanças", to: "/financas" },
    ],
  },
  {
    title: "Pessoal",
    items: [
      { label: "Vida Pessoal", to: "/vida-pessoal" },
      { label: "Perfil", to: "/perfil" },
      { label: "Segurança", to: "/seguranca" },
    ],
  },
  ];
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
  vexAvatar: "/brand/vex-avatar-512.png",
  vexCutout: "/brand/vex-cutout.png",
};
