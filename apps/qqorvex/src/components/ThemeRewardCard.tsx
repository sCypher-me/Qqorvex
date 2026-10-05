import { CheckIcon, CrownIcon, LockSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { cx } from "@qqorvex/ui";
import type { AppSkin } from "../app/ThemeContext";

export interface ThemeRewardDefinition {
  id: AppSkin;
  name: string;
  essence: string;
  preview: { canvas: string; panel: string; accent: string; glow: string };
}

/** Prévia do tema desbloqueável; Coroa Vex apresenta uma composição própria de Plus. */
export function SkinPreview({ preview, featured = false, skin = "default" }: { preview: ThemeRewardDefinition["preview"]; featured?: boolean; skin?: AppSkin }) {
  if (skin === "vip") {
    return (
      <div
        className={cx("relative overflow-hidden border border-white/10", featured ? "h-32 rounded-xl sm:h-36" : "h-20 rounded-lg")}
        style={{
          backgroundColor: preview.canvas,
          backgroundImage: "radial-gradient(ellipse at 72% 0%, rgb(141 97 190 / .3), transparent 62%), linear-gradient(130deg, rgb(220 181 106 / .12), transparent 50%)",
        }}
        aria-hidden="true"
      >
        <div className={cx("absolute inset-y-0 left-0 flex flex-col items-center border-r border-white/10 bg-black/20", featured ? "w-10 gap-2 py-3" : "w-7 gap-1.5 py-2")}>
          <span className={cx("grid place-items-center rounded-lg bg-white/5 text-[#e6c987]", featured ? "h-6 w-6" : "h-4 w-4")}>
            <CrownIcon size={featured ? 14 : 10} weight="fill" />
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c09ef5]" />
          <span className="h-1 w-1 rounded-full bg-white/30" />
          {featured && <span className="mt-auto text-[#e6c987]/70"><SparkleIcon size={13} weight="fill" /></span>}
        </div>
        <div className={cx("absolute flex flex-col", featured ? "inset-y-3 left-14 right-3 gap-2" : "inset-y-2 left-9 right-2 gap-1")}>
          <div className="flex items-center justify-between gap-2">
            <span className={cx("font-semibold uppercase tracking-[0.14em] text-[#e8d9ff]", featured ? "text-[9px]" : "text-[6px]")}>Coroa Vex · Plus</span>
            <span className={cx("rounded-full bg-[#dcb670]/15 text-[#e6c987]", featured ? "px-1.5 py-0.5 text-[7px]" : "px-1 py-px text-[5px]")}>EDIÇÃO ESPECIAL</span>
          </div>
          <div className={cx("flex min-h-0 flex-1 gap-1.5", featured && "gap-2")}>
            <span className="flex min-w-0 flex-[1.35] flex-col justify-between rounded-md border border-white/10 bg-white/[0.07] p-1.5">
              <span className={cx("font-medium text-white/80", featured ? "text-[8px]" : "text-[6px]")}>Seu espaço, elevado.</span>
              <span className={cx("block rounded-full bg-[#c5a467]", featured ? "h-1.5 w-2/5" : "h-1 w-2/5")} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-between rounded-md border border-[#dcb670]/20 bg-[#dcb670]/[0.07] p-1.5">
              <span className={cx("font-medium text-[#e6c987]", featured ? "text-[7px]" : "text-[5px]")}>PLUS</span>
              <span className={cx("block rounded-full bg-white/35", featured ? "h-1.5 w-3/4" : "h-1 w-3/4")} />
            </span>
          </div>
        </div>
        {featured && <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#a978e9]/20 blur-2xl" />}
      </div>
    );
  }

  return (
    <div className={cx("relative overflow-hidden border border-black/10", featured ? "h-32 rounded-xl sm:h-36" : "h-20 rounded-lg")} style={{ backgroundColor: preview.canvas }} aria-hidden="true">
      <div className={cx("absolute flex gap-1", featured ? "left-4 top-4" : "left-2.5 top-2.5")}>
        <span className={cx("rounded-full", featured ? "h-2 w-10" : "h-1.5 w-6")} style={{ backgroundColor: preview.accent }} />
        <span className={cx("rounded-full opacity-60", featured ? "h-2 w-5" : "h-1.5 w-3")} style={{ backgroundColor: preview.glow }} />
      </div>
      <div className={cx("absolute flex flex-col rounded-md", featured ? "inset-x-4 bottom-4 gap-2 p-3" : "inset-x-2.5 bottom-2.5 gap-1.5 p-2")} style={{ backgroundColor: preview.panel }}>
        <span className={cx("rounded-full", featured ? "h-2 w-2/5" : "h-1.5 w-2/5")} style={{ backgroundColor: preview.accent }} />
        <span className={cx("rounded-full opacity-50", featured ? "h-2 w-3/4" : "h-1.5 w-3/4")} style={{ backgroundColor: preview.glow }} />
      </div>
      <span className={cx("absolute rounded-full", featured ? "right-5 top-4 h-8 w-8" : "right-3 top-2.5 h-5 w-5")} style={{ backgroundColor: preview.accent, boxShadow: `0 0 18px ${preview.accent}` }} />
    </div>
  );
}

export function ThemeRewardCard({
  theme,
  requirement,
  unlocked,
  active,
  busy,
  checking = false,
  lockedMessage,
  onChoose,
}: {
  theme: ThemeRewardDefinition;
  requirement: string;
  unlocked: boolean;
  active: boolean;
  busy: boolean;
  checking?: boolean;
  lockedMessage: string;
  onChoose: (skin: AppSkin) => void;
}) {
  const disabled = !unlocked || active || busy || checking;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={() => onChoose(theme.id)}
      title={!unlocked ? lockedMessage : undefined}
      className={cx(
        "group flex min-w-0 flex-col gap-3 rounded-xl border bg-surface p-3 text-left transition-[border-color,background-color] duration-150",
        active ? "border-gold-line ring-1 ring-gold-line" : unlocked ? "border-line hover:border-line-strong hover:bg-raised" : "border-line-soft",
        disabled && !active && "cursor-default",
      )}
    >
      <div className={cx(!unlocked && "opacity-55 grayscale-[35%]")}>
        <SkinPreview preview={theme.preview} skin={theme.id} />
      </div>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-fg">{theme.name}</p>
          <p className="truncate text-xs text-fg-3">{theme.essence}</p>
        </div>
        {active ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-on-gold" aria-label="Em uso">
            <CheckIcon size={12} weight="bold" />
          </span>
        ) : !unlocked ? (
          <LockSimpleIcon size={15} className="mt-0.5 shrink-0 text-fg-4" aria-label="Bloqueado" />
        ) : null}
      </div>
      <p className={cx("text-[11px] font-medium", active ? "text-gold-fg" : unlocked ? "text-fg-3" : "text-fg-4")}>
        {active ? "Em uso" : checking ? "Verificando assinatura…" : unlocked ? (busy ? "Aplicando…" : "Toque para usar") : requirement}
      </p>
    </button>
  );
}
