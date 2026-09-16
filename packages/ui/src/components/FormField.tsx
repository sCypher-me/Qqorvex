import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * "Assinatura da marca" (docs/decisions/design-system-componentes-v1.md) — barra lateral cinza
 * que vira Gold em foco via `focus-within`, sem precisar de estado em JS. Reaproveita
 * `rounded-card` (mesmo raio do Card) para conectar a mesma linguagem visual entre os dois.
 */
function FieldShell({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="group flex rounded-card overflow-hidden bg-surface-2 border border-border">
      <span className="w-[3px] bg-border group-focus-within:bg-brand-gold shrink-0 transition-colors" />
      <div className="flex-1 px-3.5 py-2 min-w-0">
        <label
          htmlFor={htmlFor}
          className="block font-display text-[10px] uppercase tracking-wide text-warm-muted group-focus-within:text-brand-gold mb-0.5 transition-colors"
        >
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

const fieldClass = "w-full bg-transparent outline-none font-sans text-sm text-text-primary";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={inputId}>
      <input id={inputId} className={`${fieldClass} ${className}`} {...props} />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, id, className = "", ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={selectId}>
      <select id={selectId} className={`${fieldClass} ${className}`} {...props} />
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function Textarea({ label, id, className = "", ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={textareaId}>
      <textarea id={textareaId} className={`${fieldClass} resize-y ${className}`} {...props} />
    </FieldShell>
  );
}
