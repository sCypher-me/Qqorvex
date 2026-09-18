import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Título opcional com botão de fechar (✕) no topo. */
  title?: string;
  /** Nome acessível do diálogo quando não há `title` visível (ex.: `ConfirmDialog`, que mostra o título como conteúdo). */
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "max-w-[460px]", md: "max-w-[520px]", lg: "max-w-[720px]" };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal centralizado (Design System v1.0) — fundo escurecido com desfoque, painel de vidro 20px.
 * Esc fecha. `ConfirmDialog` abaixo é a conveniência pro caso mais comum (confirmar exclusão).
 * Foco: entra no diálogo ao abrir, fica preso nele (Tab não escapa pro fundo) e volta pro elemento
 * que abriu o modal ao fechar — sem isso, quem navega só por teclado/leitor de tela perde o lugar.
 */
export function Modal({ isOpen, onClose, children, title, ariaLabel, size = "sm" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialogRef.current)?.focus();

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? ariaLabel : undefined}
    >
      <div className="qv-backdrop absolute inset-0" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`qv-dialog relative w-full ${sizeClasses[size]} p-[26px] flex flex-col gap-4 max-h-[calc(100vh-48px)] overflow-auto outline-none`}
      >
        {title && (
          <div className="flex items-center gap-3">
            <span id={titleId} className="font-display text-[21px] font-semibold flex-1">
              {title}
            </span>
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
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel={title}>
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
