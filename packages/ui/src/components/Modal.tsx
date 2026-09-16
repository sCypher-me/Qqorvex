import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal centralizado (docs/decisions/design-system-componentes-v1.md) — decidido via
 * brainstorming visual sobre 3 posições (centralizado, bottom sheet, painel lateral).
 * Casca genérica via `children`; `ConfirmDialog` abaixo é a conveniência pro caso mais comum
 * (confirmar exclusão), reaproveitando o `Button` já existente em vez de duplicar estilo.
 */
export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-2 border border-border border-l-2 border-l-brand-cyan rounded-card shadow-card p-4">
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `true` (padrão) usa o botão `destructive` — ex.: excluir. `false` usa `primary` pra confirmações neutras. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <p className="font-sans font-bold text-sm text-text-primary mb-1.5">{title}</p>
      {description && <p className="font-sans text-xs text-text-secondary-warm mb-3">{description}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="chip" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
