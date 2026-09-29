import type { ReactNode } from "react";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { cx } from "../cx";

export interface EmptyStateProps {
  /** Texto simples (uso compacto dentro de listas). */
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /** Ilustração/uso em área grande (página vazia) vs. dentro de um card. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Estado vazio. Sempre explica o que aparece aqui e como começar — nunca só "nada aqui".
 * Com apenas `children`, renderiza uma linha de texto discreta.
 */
export function EmptyState({ children, title, description, icon, action, size = "md", className }: EmptyStateProps) {
  if (!title && !icon && !action) {
    return <p className={cx("text-[13px] leading-relaxed text-fg-3", className)}>{children ?? description}</p>;
  }
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        size === "sm" && "gap-2 px-4 py-6",
        size === "md" && "gap-3 px-6 py-10",
        size === "lg" && "gap-3.5 px-6 py-16",
        className,
      )}
    >
      {icon && (
        <span
          className={cx(
            "flex items-center justify-center rounded-xl border border-line bg-raised text-fg-3",
            size === "sm" ? "h-9 w-9 [&_svg]:size-[18px]" : "h-12 w-12 [&_svg]:size-6",
          )}
        >
          {icon}
        </span>
      )}
      <div className="max-w-[360px]">
        {title && <p className={cx("font-medium text-fg", size === "lg" ? "font-display text-[17px]" : "text-[14px]")}>{title}</p>}
        {(description || children) && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description ?? children}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export interface NoticeProps {
  tone?: "error" | "danger" | "warning" | "success" | "info";
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Sem ícone e com menos padding, para uso dentro de formulários. */
  compact?: boolean;
}

const noticeStyles = {
  error: { box: "border-danger/30 bg-danger-soft", icon: "text-danger", Icon: WarningCircleIcon },
  danger: { box: "border-danger/30 bg-danger-soft", icon: "text-danger", Icon: WarningCircleIcon },
  warning: { box: "border-warning/30 bg-warning-soft", icon: "text-warning", Icon: WarningIcon },
  success: { box: "border-success/30 bg-success-soft", icon: "text-success", Icon: CheckCircleIcon },
  info: { box: "border-info/30 bg-info-soft", icon: "text-info", Icon: InfoIcon },
};

/** Aviso em linha: o que aconteceu, o que continua funcionando e o que fazer. */
export function Notice({ tone = "error", title, children, actions, className, compact = false }: NoticeProps) {
  const style = noticeStyles[tone];
  const Icon = style.Icon;
  const assertive = tone === "error" || tone === "danger";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={cx("flex items-start gap-3 rounded-xl border", compact ? "px-3 py-2.5" : "px-4 py-3.5", style.box, className)}
    >
      {!compact && <Icon weight="fill" aria-hidden="true" className={cx("mt-px size-[18px] shrink-0", style.icon)} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-[13.5px] font-semibold leading-snug text-fg">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed text-fg-2">{children}</div>}
        {actions && <div className="mt-1.5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
