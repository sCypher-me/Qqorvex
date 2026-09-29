import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Campo do Design System — rótulo acima, campo rebaixado e foco nítido. `hint` aparece abaixo;
 * `error` substitui o hint e marca o campo inválido. A descrição é associada ao controle por id.
 * Sem `label`, o campo é renderizado sozinho (use `aria-label`).
 */
function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  descriptionId,
  className = "",
  children,
}: {
  label?: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  descriptionId?: string;
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
        <span id={descriptionId} className="text-xs text-error">{error}</span>
      ) : (
        hint && <span id={descriptionId} className="text-xs text-text-muted">{hint}</span>
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

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldExtras {
  /** Ícone/botão sobreposto à direita do campo (ex.: alternar mostrar/ocultar senha) — fica dentro do campo, não empurra o layout. */
  trailingAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, wrapperClassName, id, className = "", trailingAdornment, ref, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;
  const describedBy = [props["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  const input = (
    <input
      {...props}
      ref={ref}
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={`qv-field ${trailingAdornment ? "pr-11" : ""} ${className}`}
    />
  );
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} descriptionId={descriptionId} className={wrapperClassName}>
      {trailingAdornment ? (
        <div className="relative flex items-center">
          {input}
          <div className="absolute right-1.5">{trailingAdornment}</div>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldExtras {}

export function Select({ label, hint, error, wrapperClassName, id, className = "", ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = hint || error ? `${selectId}-description` : undefined;
  const describedBy = [props["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} error={error} descriptionId={descriptionId} className={wrapperClassName}>
      <select {...props} id={selectId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`qv-field ${className}`} />
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldExtras {}

export function Textarea({ label, hint, error, wrapperClassName, id, className = "", ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = hint || error ? `${textareaId}-description` : undefined;
  const describedBy = [props["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldShell label={label} htmlFor={textareaId} hint={hint} error={error} descriptionId={descriptionId} className={wrapperClassName}>
      <textarea {...props} id={textareaId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`qv-field ${className}`} />
    </FieldShell>
  );
}
