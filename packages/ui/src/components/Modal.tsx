import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Título opcional com botão de fechar (✕) no topo. */
  title?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "max-w-[460px]", md: "max-w-[520px]", lg: "max-w-[720px]" };

/**
 * Modal centralizado (Design System v1.0) — fundo escurecido com desfoque, painel de vidro 20px.
 * Esc fecha. `ConfirmDialog` abaixo é a conveniência pro caso mais comum (confirmar exclusão).
 */
export function Modal({ isOpen, onClose, children, title, size = "sm" }: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div className="qv-backdrop absolute inset-0" onClick={onClose} />
      <div className={`qv-dialog relative w-full ${sizeClasses[size]} p-[26px] flex flex-col gap-4 max-h-[calc(100vh-48px)] overflow-auto`}>
        {title && (
          <div className="flex items-center gap-3">
            <span className="font-display text-[21px] font-semibold flex-1">{title}</span>
            <button type="button" onClick={onClose} className="qv-icon-btn" aria-label="Fechar">
              ✕
            </button>
          </div>
        )}
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
  /** Caixa "Impacto" — o que muda em outras telas se a ação for confirmada. */
  impact?: string;
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
  impact,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <span className="font-display text-[21px] font-semibold">{title}</span>
      {description && <p className="text-sm leading-relaxed text-text-secondary">{description}</p>}
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
