import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Native dialog supplies modal semantics, focus containment, Escape and return-to-focus behavior. */
export function Modal({ isOpen, onClose, children, title, ariaLabel, size = "sm" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      requestAnimationFrame(() => {
        const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? dialog).focus();
      });
    } else if (!isOpen && dialog.open) {
      dialog.close();
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      previouslyFocused.current?.focus();
    },
    [],
  );

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`${isOpen ? "" : "hidden"} qv-dialog qv-native-dialog outline-none`}
      data-size={size}
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? ariaLabel : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      {title && (
        <div className="flex items-start gap-4 border-b border-border/70 pb-4">
          <h2 id={titleId} className="font-display text-[21px] font-semibold leading-tight flex-1 m-0">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="qv-icon-btn" aria-label="Fechar">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      {children}
    </dialog>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  impact?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      {description && <p className="text-sm leading-relaxed text-text-secondary m-0">{description}</p>}
      {impact && (
        <div className="qv-well px-3.5 py-3 flex flex-col gap-1.5">
          <span className="qv-eyebrow">Impacto</span>
          <span className="text-[13px] leading-normal">{impact}</span>
        </div>
      )}
      <div className="flex gap-2.5 justify-end flex-wrap">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
