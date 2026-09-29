import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@phosphor-icons/react";
import { cx } from "../cx";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Nome acessível quando não há título visível. */
  ariaLabel?: string;
  size?: ModalSize;
  /** Rodapé fixo (ações). */
  footer?: ReactNode;
  /** Ícone ao lado do título. */
  icon?: ReactNode;
  /** Remove o padding do corpo (conteúdo controla o próprio espaçamento). */
  flush?: boolean;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const widths: Record<ModalSize, string> = {
  sm: "sm:max-w-[440px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[760px]",
  xl: "sm:max-w-[1000px]",
};

/** Mantém `<dialog>` nativo em sincronia com `isOpen`: foco preso, Esc e retorno do foco. */
function useNativeDialog(isOpen: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      requestAnimationFrame(() => {
        const preferred = dialog.querySelector<HTMLElement>("[data-autofocus]") ?? dialog.querySelector<HTMLElement>(`[data-dialog-body] ${FOCUSABLE}`);
        (preferred ?? dialog).focus();
      });
    } else if (!isOpen && dialog.open) {
      dialog.close();
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (dialogRef.current?.open) dialogRef.current.close();
      previouslyFocused.current?.focus();
    },
    [],
  );

  return dialogRef;
}

function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>, onClose: () => void) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) onClose();
}

/** Diálogo modal. No celular vira folha inferior. */
export function Modal({ isOpen, onClose, children, title, description, ariaLabel, size = "sm", footer, icon, flush = false, className }: ModalProps) {
  const dialogRef = useNativeDialog(isOpen);
  const titleId = useId();
  const descriptionId = useId();

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => closeOnBackdrop(event, onClose)}
      className={cx(
        "q-dialog fixed m-auto w-full max-w-[calc(100vw-24px)] overflow-hidden border border-line bg-overlay p-0 text-fg shadow-lg outline-none",
        "max-h-[calc(100dvh-32px)] rounded-2xl",
        "max-sm:mb-0 max-sm:max-w-full max-sm:rounded-b-none max-sm:border-b-0",
        widths[size],
        !isOpen && "hidden",
        className,
      )}
    >
      {isOpen && (
        <div className="flex max-h-[calc(100dvh-32px)] flex-col">
          {title && (
            <header className="flex items-start gap-3 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
              {icon && <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-fg [&_svg]:size-5">{icon}</span>}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-[19px] font-semibold leading-tight tracking-[-0.01em]">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-fg-3">
                    {description}
                  </p>
                )}
              </div>
              <IconButton label="Fechar" size="sm" onClick={onClose} className="-mr-1.5 -mt-0.5">
                <XIcon />
              </IconButton>
            </header>
          )}
          {children !== null && children !== undefined && children !== false ? (
            <div data-dialog-body className={cx("min-h-0 flex-1 overflow-y-auto", !flush && "flex flex-col gap-4 px-5 py-4 sm:px-6", !title && !flush && "pt-5 sm:pt-6")}>
              {children}
            </div>
          ) : (
            <div className="h-3" />
          )}
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Largura no desktop. */
  width?: number;
  actions?: ReactNode;
}

/** Painel lateral (detalhes de um item). No celular ocupa a tela inteira. */
export function Sheet({ isOpen, onClose, title, description, ariaLabel, children, footer, width = 480, actions }: SheetProps) {
  const dialogRef = useNativeDialog(isOpen);
  const titleId = useId();

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => closeOnBackdrop(event, onClose)}
      style={{ ["--sheet-w" as string]: `${width}px` }}
      className={cx(
        "q-dialog q-sheet fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-full border-l border-line bg-overlay p-0 text-fg shadow-lg outline-none sm:w-[min(var(--sheet-w),calc(100vw-48px))]",
        !isOpen && "hidden",
      )}
    >
      {isOpen && (
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-3 border-b border-line px-5 py-4 pt-[max(16px,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="font-display text-[18px] font-semibold leading-tight">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-[13px] text-fg-3">{description}</p>}
            </div>
            {actions}
            <IconButton label="Fechar" size="sm" onClick={onClose}>
              <XIcon />
            </IconButton>
          </header>
          <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</footer>}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  /** O que vai acontecer (efeito concreto da ação). */
  impact?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  impact,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {impact ? (
        <div className="rounded-lg border border-line bg-canvas/60 px-3.5 py-3 text-[13px] leading-relaxed text-fg-2">{impact}</div>
      ) : null}
    </Modal>
  );
}
