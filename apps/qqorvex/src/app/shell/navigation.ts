import type { Icon } from "@phosphor-icons/react";
import {
  BooksIcon,
  BrainIcon,
  CalendarBlankIcon,
  ChecksIcon,
  CompassIcon,
  CrownIcon,
  FilesIcon,
  GearSixIcon,
  GraduationCapIcon,
  HeartIcon,
  LightningIcon,
  NotebookIcon,
  PlantIcon,
  SparkleIcon,
  SunHorizonIcon,
  TargetIcon,
  TrophyIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react";

/**
 * Arquitetura de informação do Qqorvex: Hoje + 4 áreas + Vex.
 *
 *   Hoje          — o painel do dia (agrega todas as áreas)
 *   Planejar      — Tarefas · Agenda · Metas & Hábitos
 *   Conhecimento  — Estudos · Notas · Biblioteca
 *   Vida          — Finanças · Documentos · Pessoal
 *   Vex           — assistente (tela cheia; também disponível como painel lateral)
 *
 * Perfil, Conquistas, Assinatura e Configurações ficam no menu da conta. Este arquivo é a fonte
 * única de rotas, rótulos e ícones: sidebar, navegação mobile, paleta de comandos, breadcrumbs
 * e título da aba derivam daqui.
 */

export interface NavSection {
  key: string;
  label: string;
  to: string;
  icon: Icon;
  description: string;
}

export interface NavArea {
  key: "planejar" | "conhecimento" | "vida";
  label: string;
  to: string;
  icon: Icon;
  description: string;
  sections: NavSection[];
}

export const HOME = { key: "hoje", label: "Hoje", to: "/", icon: SunHorizonIcon, description: "Seu dia em um só lugar" } as const;
export const VEX = { key: "vex", label: "Vex", to: "/vex", icon: SparkleIcon, description: "Sua assistente pessoal" } as const;

export const AREAS: NavArea[] = [
  {
    key: "planejar",
    label: "Planejar",
    to: "/planejar",
    icon: CompassIcon,
    description: "Tarefas, agenda, metas e hábitos",
    sections: [
      { key: "tarefas", label: "Tarefas", to: "/planejar/tarefas", icon: ChecksIcon, description: "Listas, quadro e prioridades" },
      { key: "agenda", label: "Agenda", to: "/planejar/agenda", icon: CalendarBlankIcon, description: "Eventos, reuniões e recorrências" },
      { key: "metas", label: "Metas & Hábitos", to: "/planejar/metas", icon: TargetIcon, description: "Objetivos, hábitos e rotinas" },
    ],
  },
  {
    key: "conhecimento",
    label: "Conhecimento",
    to: "/conhecimento",
    icon: BrainIcon,
    description: "Estudos, notas e biblioteca",
    sections: [
      { key: "estudos", label: "Estudos", to: "/conhecimento/estudos", icon: GraduationCapIcon, description: "Cadernos, flashcards e revisões" },
      { key: "notas", label: "Notas", to: "/conhecimento/notas", icon: NotebookIcon, description: "Páginas, conexões e bases" },
      { key: "biblioteca", label: "Biblioteca", to: "/conhecimento/biblioteca", icon: BooksIcon, description: "Livros, filmes, séries e mais" },
    ],
  },
  {
    key: "vida",
    label: "Vida",
    to: "/vida",
    icon: PlantIcon,
    description: "Finanças, documentos e vida pessoal",
    sections: [
      { key: "financas", label: "Finanças", to: "/vida/financas", icon: WalletIcon, description: "Saldo, gastos, orçamento e cartões" },
      { key: "documentos", label: "Documentos", to: "/vida/documentos", icon: FilesIcon, description: "Arquivos, garantias e vencimentos" },
      { key: "pessoal", label: "Pessoal", to: "/vida/pessoal", icon: HeartIcon, description: "Bem-estar, planos e vida prática" },
    ],
  },
];

export interface AccountLink {
  key: string;
  label: string;
  to: string;
  icon: Icon;
  ownerOnly?: boolean;
}

export const ACCOUNT_LINKS: AccountLink[] = [
  { key: "perfil", label: "Perfil", to: "/configuracoes/perfil", icon: UserCircleIcon },
  { key: "conquistas", label: "Conquistas", to: "/conquistas", icon: TrophyIcon },
  { key: "assinatura", label: "Plano e assinatura", to: "/assinatura", icon: LightningIcon },
  { key: "configuracoes", label: "Configurações", to: "/configuracoes", icon: GearSixIcon },
  { key: "manager", label: "Central do Dono", to: "/manager", icon: CrownIcon, ownerOnly: true },
];

/** Rotas antigas → novas (links salvos, notificações push e deep links continuam funcionando). */
export const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/tarefas", to: "/planejar/tarefas" },
  { from: "/agenda", to: "/planejar/agenda" },
  { from: "/metas-habitos", to: "/planejar/metas" },
  { from: "/estudos", to: "/conhecimento/estudos" },
  { from: "/segundo-cerebro", to: "/conhecimento/notas" },
  { from: "/biblioteca", to: "/conhecimento/biblioteca" },
  { from: "/documentos", to: "/vida/documentos" },
  { from: "/financas", to: "/vida/financas" },
  { from: "/vida-pessoal", to: "/vida/pessoal" },
  { from: "/gamificacao", to: "/conquistas" },
  { from: "/seguranca", to: "/configuracoes/seguranca" },
  { from: "/perfil", to: "/configuracoes/perfil" },
];

/** Módulo de origem de um item da Hoje (`HojeItem.source`) → rota e rótulo. */
export const MODULE_ROUTES: Record<string, { label: string; to: string }> = {
  tarefas: { label: "Tarefas", to: "/planejar/tarefas" },
  agenda: { label: "Agenda", to: "/planejar/agenda" },
  "metas-habitos": { label: "Metas & Hábitos", to: "/planejar/metas" },
  estudos: { label: "Estudos", to: "/conhecimento/estudos" },
  "segundo-cerebro": { label: "Notas", to: "/conhecimento/notas" },
  biblioteca: { label: "Biblioteca", to: "/conhecimento/biblioteca" },
  documentos: { label: "Documentos", to: "/vida/documentos" },
  financas: { label: "Finanças", to: "/vida/financas" },
  "vida-pessoal": { label: "Pessoal", to: "/vida/pessoal" },
};

export interface RouteContext {
  area: NavArea | null;
  section: NavSection | null;
  title: string;
  /** Trilha para o breadcrumb (área → seção). */
  trail: Array<{ label: string; to: string }>;
}

const ACCOUNT_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/conquistas", title: "Conquistas" },
  { prefix: "/assinatura", title: "Plano e assinatura" },
  { prefix: "/configuracoes", title: "Configurações" },
  { prefix: "/manager", title: "Central do Dono" },
  { prefix: "/vex", title: "Vex" },
];

export function getRouteContext(pathname: string): RouteContext {
  if (pathname === "/") return { area: null, section: null, title: "Hoje", trail: [{ label: "Hoje", to: "/" }] };
  for (const area of AREAS) {
    if (pathname === area.to || pathname.startsWith(`${area.to}/`)) {
      const section = area.sections.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ?? null;
      return {
        area,
        section,
        title: section?.label ?? area.label,
        trail: [{ label: area.label, to: area.to }, ...(section ? [{ label: section.label, to: section.to }] : [])],
      };
    }
  }
  const account = ACCOUNT_TITLES.find((entry) => pathname.startsWith(entry.prefix));
  const title = account?.title ?? "Qqorvex";
  return { area: null, section: null, title, trail: [{ label: title, to: pathname }] };
}
