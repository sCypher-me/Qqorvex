import type { ComponentType } from "react";
import { CalendarBlankIcon, FileTextIcon, GraphIcon, KanbanIcon, type IconProps } from "@phosphor-icons/react";

export interface PageTypeMeta {
  label: string;
  icon: ComponentType<IconProps>;
}

const META: Record<string, PageTypeMeta> = {
  nota: { label: "Nota", icon: FileTextIcon },
  projeto: { label: "Projeto", icon: KanbanIcon },
  mapa_mental: { label: "Mapa mental", icon: GraphIcon },
  nota_do_dia: { label: "Nota do dia", icon: CalendarBlankIcon },
};

/** Rótulo e ícone de cada tipo de página (tipos desconhecidos viram "Nota"). */
export function pageTypeMeta(pageType: string | null | undefined): PageTypeMeta {
  return META[pageType ?? "nota"] ?? META.nota!;
}

export const CREATABLE_PAGE_TYPES = ["nota", "projeto", "mapa_mental"] as const;
