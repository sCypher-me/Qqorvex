import { useRef, useState, type ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon, PlayIcon, PlusIcon } from "@phosphor-icons/react";
import { categoryColor } from "@qqorvex/design-system";
import { Button, ProgressBar, cx } from "@qqorvex/ui";
import { LIBRARY_ITEM_TYPE_LABELS, computeProgressPercent, nextProgressStep, remainingText, type LibraryFeatured, type LibraryShelf } from "../service";
import type { LibraryItem, LibraryItemType } from "../types";
import { LibraryCard, LibraryCover } from "./LibraryShelf";

/** "Continuar lendo", "Continuar assistindo"… — o verbo acompanha o tipo do item. */
const CONSUME_VERB: Partial<Record<LibraryItemType, string>> = {
  book: "lendo",
  comic: "lendo",
  manga: "lendo",
  article: "lendo",
  web_content: "lendo",
  academic_paper: "lendo",
  movie: "assistindo",
  series: "assistindo",
  anime: "assistindo",
  video: "assistindo",
  course: "estudando",
  podcast: "ouvindo",
  podcast_episode: "ouvindo",
  game: "jogando",
};

const canvasAt = (percent: number) => `color-mix(in srgb, var(--q-canvas) ${percent}%, transparent)`;

/** Escurece o fundo em direção ao texto (tema claro e escuro: usa a cor da tela). */
const FADE = {
  right: `linear-gradient(to right, ${canvasAt(30)}, ${canvasAt(75)} 45%, ${canvasAt(95)})`,
  bottom: `linear-gradient(to top, var(--q-canvas), ${canvasAt(80)} 50%, ${canvasAt(40)})`,
} as const;

/**
 * Fundo com a própria capa ampliada e desfocada (sem capa, a cor do item). Fica atrás do conteúdo
 * e escurece em direção ao texto para manter o contraste em qualquer capa.
 */
function CoverBackdrop({ item, fade }: { item: LibraryItem; fade: "right" | "bottom" }) {
  const [broken, setBroken] = useState(false);
  const color = categoryColor(item.id);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {item.cover_url && !broken ? (
        <img src={item.cover_url} alt="" onError={() => setBroken(true)} className="h-full w-full scale-125 object-cover opacity-45 blur-2xl" />
      ) : (
        <div className="h-full w-full opacity-60" style={{ background: `radial-gradient(120% 140% at 15% 20%, color-mix(in srgb, ${color} 45%, transparent), transparent 70%)` }} />
      )}
      <div className="absolute inset-0" style={{ background: FADE[fade] }} />
    </div>
  );
}

/**
 * Cartão largo das fileiras Continuar/Retomar (e do Hoje): capa, o que falta e o +1. Com `onStart`,
 * vira o convite "Comece algo da fila" (botão Começar no lugar do +1).
 */
export function ContinueShelfCard({
  item,
  onOpen,
  onStep,
  onStart,
  busy = false,
  className,
}: {
  item: LibraryItem;
  onOpen: () => void;
  onStep: () => void;
  onStart?: () => void;
  busy?: boolean;
  className?: string;
}) {
  const percent = onStart ? null : computeProgressPercent(item);
  const step = onStart ? null : nextProgressStep(item);
  const remaining = onStart ? "Comece algo da fila" : remainingText(item);
  return (
    <div className={cx("group relative flex h-[132px] w-[300px] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-surface", className)}>
      <CoverBackdrop item={item} fade="right" />
      <button type="button" onClick={onOpen} aria-label={`Abrir ${item.title}`} className="relative z-[1] flex min-w-0 flex-1 items-stretch gap-3 p-3 text-left">
        <LibraryCover item={item} showTitle={false} className="w-[72px] shrink-0 rounded-md shadow-md transition-transform duration-200 group-hover:-translate-y-0.5" />
        <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <span className="min-w-0">
            <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-fg">{item.title}</span>
            <span className="mt-0.5 block truncate text-xs text-fg-3">{[item.subtitle, LIBRARY_ITEM_TYPE_LABELS[item.item_type]].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="min-w-0 pr-12">
            {percent !== null && <ProgressBar value={percent} height={4} label={`Progresso de ${item.title}`} />}
            <span className="mt-1 block truncate text-[11.5px] text-fg-3">{remaining ?? (item.status === "pausado" ? "Pausado" : "Sem progresso registrado")}</span>
          </span>
        </span>
      </button>
      <div className="absolute bottom-3 right-3 z-[2]">
        {onStart ? (
          <Button size="xs" leadingIcon={<PlayIcon size={12} weight="fill" />} onClick={onStart} disabled={busy} aria-label={`Começar ${item.title}`}>
            Começar
          </Button>
        ) : step ? (
          <Button size="xs" variant="secondary" onClick={onStep} disabled={busy} aria-label={`${step.label} em ${item.title}`}>
            {step.label}
          </Button>
        ) : (
          <Button size="xs" variant="ghost" onClick={onOpen}>
            Registrar
          </Button>
        )}
      </div>
    </div>
  );
}

/** Destaque no topo da Biblioteca: o último em andamento ou, sem nenhum, o primeiro da fila. */
export function LibraryFeaturedBanner({
  featured,
  onOpen,
  onStep,
  onStart,
  busy = false,
}: {
  featured: LibraryFeatured;
  onOpen: () => void;
  onStep: () => void;
  onStart: () => void;
  busy?: boolean;
}) {
  const { item, kind } = featured;
  const percent = computeProgressPercent(item);
  const step = nextProgressStep(item);
  const remaining = remainingText(item);
  const verb = CONSUME_VERB[item.item_type];
  const eyebrow = kind === "continuar" ? `Continuar${verb ? ` ${verb}` : ""}` : "Comece agora";
  return (
    <section aria-label="Destaque da Biblioteca" className="relative overflow-hidden rounded-2xl border border-line bg-surface">
      <CoverBackdrop item={item} fade="right" />
      <div className="relative z-[1] flex items-center gap-4 p-4 sm:gap-6 sm:p-6">
        <button type="button" onClick={onOpen} aria-label={`Abrir ${item.title}`} className="w-24 shrink-0 sm:w-36">
          <LibraryCover item={item} className="w-full rounded-lg shadow-lg" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-gold-fg">
            {eyebrow} · {LIBRARY_ITEM_TYPE_LABELS[item.item_type]}
          </p>
          <h2 className="mt-1 line-clamp-2 font-display text-[22px] font-semibold leading-tight text-fg sm:text-[30px]">{item.title}</h2>
          <p className="mt-1 truncate text-[13px] text-fg-2">{[item.subtitle, item.year].filter(Boolean).join(" · ")}</p>
          {item.description && <p className="mt-2 hidden max-w-xl text-[13px] leading-relaxed text-fg-3 sm:line-clamp-2">{item.description}</p>}
          {kind === "continuar" && (percent !== null || remaining) && (
            <div className="mt-3 max-w-sm">
              {percent !== null && <ProgressBar value={percent} height={5} label={`Progresso de ${item.title}`} />}
              {remaining && <p className="mt-1 text-xs text-fg-3">{remaining}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {kind === "comecar" ? (
              <Button size="sm" leadingIcon={<PlayIcon size={14} weight="fill" />} onClick={onStart} disabled={busy}>
                Começar
              </Button>
            ) : step ? (
              <Button size="sm" leadingIcon={<PlusIcon size={14} weight="bold" />} onClick={onStep} disabled={busy}>
                {step.label.replace(/^\+/, "")}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={onOpen}>
              {kind === "continuar" ? "Atualizar progresso" : "Detalhes"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Fileira horizontal: rola de lado (arrastar no celular, setas no desktop). */
export function ShelfRow({ title, meta, action, children }: { title: string; meta?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (direction: 1 | -1) => {
    const element = scroller.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section aria-label={title} className="group/row flex min-w-0 flex-col gap-2.5">
      <header className="flex items-baseline gap-2">
        <h2 className="font-display text-[16px] font-semibold text-fg">{title}</h2>
        {meta && <span className="text-xs text-fg-3">{meta}</span>}
        <span className="ml-auto flex items-center gap-1 self-center">
          <span className="hidden gap-1 sm:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label={`Voltar na fileira ${title}`} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover/row:opacity-100">
              <CaretLeftIcon size={15} />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label={`Avançar na fileira ${title}`} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-3 opacity-0 transition-opacity hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover/row:opacity-100">
              <CaretRightIcon size={15} />
            </button>
          </span>
          {action}
        </span>
      </header>
      <div ref={scroller} className="q-scroll-x -mx-1 flex snap-x snap-mandatory gap-3 scroll-px-1 px-1 pb-1">
        {children}
      </div>
    </section>
  );
}

/** Todas as fileiras da página principal, na ordem de `buildLibraryShelves`. */
export function LibraryShelves({
  shelves,
  onOpen,
  onStep,
  busy = false,
}: {
  shelves: LibraryShelf[];
  onOpen: (item: LibraryItem) => void;
  onStep: (item: LibraryItem) => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-7">
      {shelves.map((shelf) => (
        <ShelfRow key={shelf.key} title={shelf.title} meta={shelf.items.length > 1 ? `${shelf.items.length}` : undefined}>
          {shelf.variant === "continue"
            ? shelf.items.map((item) => <ContinueShelfCard key={item.id} item={item} onOpen={() => onOpen(item)} onStep={() => onStep(item)} busy={busy} />)
            : shelf.items.map((item) => (
                <div key={item.id} className="w-[124px] shrink-0 snap-start sm:w-[148px]">
                  <LibraryCard item={item} onOpen={() => onOpen(item)} />
                </div>
              ))}
        </ShelfRow>
      ))}
    </div>
  );
}
