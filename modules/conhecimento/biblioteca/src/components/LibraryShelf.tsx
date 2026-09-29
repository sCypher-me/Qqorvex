import { useState } from "react";
import { BooksIcon, FilmSlateIcon, GameControllerIcon, HeadphonesIcon, MonitorPlayIcon, NewspaperIcon, StarIcon, TelevisionSimpleIcon, type IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";
import { categoryColor } from "@qqorvex/design-system";
import { Badge, ProgressBar, cx, type BadgeTone } from "@qqorvex/ui";
import { computeProgressPercent, LIBRARY_ITEM_TYPE_LABELS } from "../service";
import type { LibraryItem, LibraryItemStatus, LibraryItemType } from "../types";

export const STATUS_META: Record<LibraryItemStatus, { label: string; tone: BadgeTone }> = {
  quero_consumir: { label: "Na fila", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "info" },
  concluido: { label: "Concluído", tone: "success" },
  pausado: { label: "Pausado", tone: "warning" },
  abandonado: { label: "Abandonado", tone: "danger" },
};

const TYPE_ICON: Partial<Record<LibraryItemType, ComponentType<IconProps>>> = {
  book: BooksIcon,
  comic: BooksIcon,
  manga: BooksIcon,
  movie: FilmSlateIcon,
  series: TelevisionSimpleIcon,
  anime: TelevisionSimpleIcon,
  podcast: HeadphonesIcon,
  podcast_episode: HeadphonesIcon,
  video: MonitorPlayIcon,
  course: MonitorPlayIcon,
  article: NewspaperIcon,
  web_content: NewspaperIcon,
  academic_paper: NewspaperIcon,
  game: GameControllerIcon,
};

export function libraryTypeIcon(type: LibraryItemType): ComponentType<IconProps> {
  return TYPE_ICON[type] ?? BooksIcon;
}

/** "12 de 320 páginas" ou "45%"; null quando não há progresso registrado. */
export function progressText(item: LibraryItem): string | null {
  const percent = computeProgressPercent(item);
  if (percent === null || item.progress_current === null) return null;
  if (item.progress_mode === "numerico" && item.progress_total) return `${item.progress_current} de ${item.progress_total}${item.progress_unit ? ` ${item.progress_unit}` : ""}`;
  return `${percent}%`;
}

/** Capa do item; sem imagem, um bloco com a cor do item, ícone do tipo e o título. A largura vem de `className`. */
export function LibraryCover({ item, className, showTitle = true }: { item: LibraryItem; className?: string; showTitle?: boolean }) {
  const [broken, setBroken] = useState(false);
  const Icon = libraryTypeIcon(item.item_type);
  const color = categoryColor(item.id);
  if (item.cover_url && !broken) {
    return <img src={item.cover_url} alt="" loading="lazy" onError={() => setBroken(true)} className={cx("aspect-[2/3] rounded-lg object-cover ring-1 ring-line", className ?? "w-full")} />;
  }
  return (
    <div
      aria-hidden="true"
      className={cx("relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-lg p-2.5 ring-1 ring-line", className ?? "w-full")}
      style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 34%, var(--q-raised)), var(--q-surface) 85%)` }}
    >
      <Icon size={18} style={{ color }} />
      {showTitle && <span className="line-clamp-4 font-display text-[13px] font-semibold leading-snug text-fg">{item.title}</span>}
    </div>
  );
}

export function RatingStars({ value, size = 13 }: { value: number | null; size?: number }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-px" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} size={size} weight={star <= value ? "fill" : "regular"} className={star <= value ? "text-gold-fg" : "text-fg-4"} />
      ))}
    </span>
  );
}

/** Cartão da estante (grade): capa, título, criador/ano e o estado do consumo. */
export function LibraryCard({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const percent = computeProgressPercent(item);
  return (
    <button type="button" onClick={onOpen} className="group flex min-w-0 flex-col gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-hover">
      <div className="relative">
        <LibraryCover item={item} className="w-full transition-transform duration-200 group-hover:-translate-y-0.5" />
        {item.is_favorite && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-canvas/80 backdrop-blur-sm">
            <StarIcon size={13} weight="fill" className="text-gold-fg" />
          </span>
        )}
      </div>
      {item.status === "em_andamento" && percent !== null && <ProgressBar value={percent} height={3} className="-mt-0.5" label={`Progresso de ${item.title}`} />}
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-fg">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-fg-3">{[item.subtitle, item.year].filter(Boolean).join(" · ") || LIBRARY_ITEM_TYPE_LABELS[item.item_type]}</p>
        <div className="mt-1.5 flex min-h-5 items-center gap-1.5">
          {item.status === "concluido" && item.rating ? <RatingStars value={item.rating} size={12} /> : item.status !== "quero_consumir" && <Badge tone={STATUS_META[item.status].tone}>{STATUS_META[item.status].label}</Badge>}
        </div>
      </div>
    </button>
  );
}

/** Linha da estante (lista). */
export function LibraryRow({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const Icon = libraryTypeIcon(item.item_type);
  const progress = progressText(item);
  const percent = computeProgressPercent(item);
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover">
        <LibraryCover item={item} showTitle={false} className="w-9 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-fg">
            {item.title}
            {item.is_favorite && <StarIcon size={12} weight="fill" className="shrink-0 text-gold-fg" />}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-3">
            <Icon size={12} className="shrink-0" /> {[LIBRARY_ITEM_TYPE_LABELS[item.item_type], item.subtitle, item.year].filter(Boolean).join(" · ")}
          </p>
        </div>
        {item.status === "em_andamento" && percent !== null && (
          <div className="hidden w-36 shrink-0 sm:block">
            <ProgressBar value={percent} height={4} label={`Progresso de ${item.title}`} />
            <p className="mt-1 text-right text-[11px] text-fg-4">{progress}</p>
          </div>
        )}
        {item.status === "concluido" && item.rating ? <RatingStars value={item.rating} /> : <Badge tone={STATUS_META[item.status].tone}>{STATUS_META[item.status].label}</Badge>}
      </button>
    </li>
  );
}
