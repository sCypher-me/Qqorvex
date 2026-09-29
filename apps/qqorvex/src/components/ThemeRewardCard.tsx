import { CheckIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cx } from "@qqorvex/ui";
import type { AppSkin } from "../app/ThemeContext";

export interface ThemeRewardDefinition {
  id: AppSkin;
  name: string;
  essence: string;
  preview: { canvas: string; panel: string; accent: string; glow: string };
}

/** Miniatura da cor de destaque: fundo, painel e a cor de ação do tema. */
function SkinPreview({ preview }: { preview: ThemeRewardDefinition["preview"] }) {
  return (
    <div className="relative h-20 overflow-hidden rounded-lg border border-black/10" style={{ backgroundColor: preview.canvas }} aria-hidden="true">
      <div className="absolute left-2.5 top-2.5 flex gap-1">
        <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: preview.accent }} />
        <span className="h-1.5 w-3 rounded-full opacity-60" style={{ backgroundColor: preview.glow }} />
      </div>
      <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1.5 rounded-md p-2" style={{ backgroundColor: preview.panel }}>
        <span className="h-1.5 w-2/5 rounded-full" style={{ backgroundColor: preview.accent }} />
        <span className="h-1.5 w-3/4 rounded-full opacity-50" style={{ backgroundColor: preview.glow }} />
      </div>
      <span className="absolute right-3 top-2.5 h-5 w-5 rounded-full" style={{ backgroundColor: preview.accent, boxShadow: `0 0 18px ${preview.accent}` }} />
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
        <SkinPreview preview={theme.preview} />
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
