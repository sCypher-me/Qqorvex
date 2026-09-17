import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Campo do Design System v1.0 — rótulo acima (12px, texto secundário), campo rebaixado com
 * brilho cyan no foco. `hint` aparece abaixo; `error` substitui o hint e marca o campo inválido.
 * Sem `label`, o campo é renderizado sozinho (use `aria-label`).
 */
function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  className = "",
  children,
}: {
  label?: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!label && !hint && !error) return <>{children}</>;
  return (
    <div className={`flex flex-col gap-[7px] min-w-0 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className={`qv-field-label ${error ? "text-error" : ""}`}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : (
        hint && <span className="text-xs text-text-muted">{hint}</span>
      )}
    </div>
  );
}

interface FieldExtras {
  label?: string;
  hint?: string;
  error?: string | null;
  /** Classe do contêiner (rótulo + campo); `className` vai no próprio campo. */
  wrapperClassName?: string;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldExtras {}

export function Input({ label, hint, error, wrapperClassName, id, className = "", ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} className={wrapperClassName}>
      <input id={inputId} aria-invalid={error ? true : undefined} className={`qv-field ${className}`} {...props} />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldExtras {}

export function Select({ label, hint, error, wrapperClassName, id, className = "", ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} error={error} className={wrapperClassName}>
      <select id={selectId} aria-invalid={error ? true : undefined} className={`qv-field ${className}`} {...props} />
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldExtras {}

export function Textarea({ label, hint, error, wrapperClassName, id, className = "", ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <FieldShell label={label} htmlFor={textareaId} hint={hint} error={error} className={wrapperClassName}>
      <textarea id={textareaId} aria-invalid={error ? true : undefined} className={`qv-field ${className}`} {...props} />
    </FieldShell>
  );
}
