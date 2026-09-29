import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { cx } from "../cx";

/**
 * Campos de formulário. Rótulo acima, dica abaixo; `error` substitui a dica e marca o campo
 * como inválido. A descrição fica associada ao controle por `aria-describedby`. Sem `label`,
 * o campo é renderizado sozinho — nesse caso use `aria-label`.
 */
export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  /** Marca visual de obrigatório (o `required` do controle continua sendo a regra). */
  required?: boolean;
  /** Conteúdo à direita do rótulo (ex.: contador, link "Esqueci a senha"). */
  labelAside?: ReactNode;
  descriptionId?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, labelAside, descriptionId, className, children }: FieldProps) {
  if (!label && !hint && !error) return <>{children}</>;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {(label || labelAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg-2">
              {label}
              {required && <span aria-hidden="true" className="ml-0.5 text-gold-fg">*</span>}
            </label>
          )}
          {labelAside && <span className="text-xs text-fg-3">{labelAside}</span>}
        </div>
      )}
      {children}
      {error ? (
        <span id={descriptionId} role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : (
        hint && (
          <span id={descriptionId} className="text-xs leading-snug text-fg-3">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

interface FieldExtras {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  labelAside?: ReactNode;
  /** Classe do contêiner (rótulo + campo); `className` vai no próprio campo. */
  wrapperClassName?: string;
  fieldSize?: "sm" | "md" | "lg";
}

function useFieldIds(id: string | undefined, hasDescription: boolean, describedBy: string | undefined) {
  const generated = useId();
  const controlId = id ?? generated;
  const descriptionId = hasDescription ? `${controlId}-description` : undefined;
  return { controlId, descriptionId, describedBy: [describedBy, descriptionId].filter(Boolean).join(" ") || undefined };
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, FieldExtras {
  leadingIcon?: ReactNode;
  /** Ícone/botão dentro do campo, à direita (ex.: mostrar/ocultar senha). */
  trailingAdornment?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, labelAside, wrapperClassName, fieldSize = "md", id, className, leadingIcon, trailingAdornment, ref, required, ...props }: InputProps) {
  const { controlId, descriptionId, describedBy } = useFieldIds(id, Boolean(hint || error), props["aria-describedby"]);
  const input = (
    <input
      {...props}
      ref={ref}
      id={controlId}
      required={required}
      data-size={fieldSize}
      aria-invalid={error ? true : props["aria-invalid"]}
      aria-describedby={describedBy}
      className={cx("q-input", leadingIcon && "pl-9!", trailingAdornment && "pr-10!", className)}
    />
  );
  return (
    <Field label={label} htmlFor={controlId} hint={hint} error={error} required={required} labelAside={labelAside} descriptionId={descriptionId} className={wrapperClassName}>
      {leadingIcon || trailingAdornment ? (
        <div className="relative flex min-w-0 items-center">
          {leadingIcon && <span className="pointer-events-none absolute left-3 flex text-fg-3 [&_svg]:size-4">{leadingIcon}</span>}
          {input}
          {trailingAdornment && <span className="absolute right-1.5 flex items-center">{trailingAdornment}</span>}
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, FieldExtras {
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ label, hint, error, labelAside, wrapperClassName, fieldSize = "md", id, className, required, ref, ...props }: SelectProps) {
  const { controlId, descriptionId, describedBy } = useFieldIds(id, Boolean(hint || error), props["aria-describedby"]);
  return (
    <Field label={label} htmlFor={controlId} hint={hint} error={error} required={required} labelAside={labelAside} descriptionId={descriptionId} className={wrapperClassName}>
      <select
        {...props}
        ref={ref}
        id={controlId}
        required={required}
        data-size={fieldSize}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={cx("q-input", className)}
      />
    </Field>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, Omit<FieldExtras, "fieldSize"> {
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, hint, error, labelAside, wrapperClassName, id, className, required, ref, ...props }: TextareaProps) {
  const { controlId, descriptionId, describedBy } = useFieldIds(id, Boolean(hint || error), props["aria-describedby"]);
  return (
    <Field label={label} htmlFor={controlId} hint={hint} error={error} required={required} labelAside={labelAside} descriptionId={descriptionId} className={wrapperClassName}>
      <textarea
        {...props}
        ref={ref}
        id={controlId}
        required={required}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={cx("q-input", className)}
      />
    </Field>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  /** Visual redondo — para concluir tarefas/hábitos. */
  round?: boolean;
  size?: "sm" | "md";
}

/** Checkbox nativo (acessível) com aparência própria. */
export function Checkbox({ label, description, indeterminate = false, round = false, size = "md", className, id, checked, disabled, ...props }: CheckboxProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const box = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  const control = (
    <span className={cx("relative inline-flex shrink-0", box)}>
      <input
        {...props}
        id={controlId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        ref={(element) => {
          if (element) element.indeterminate = indeterminate;
        }}
        className={cx(
          "peer absolute inset-0 m-0 appearance-none border border-line-strong bg-field transition-[background-color,border-color] duration-150",
          round ? "rounded-full" : "rounded-[5px]",
          "checked:border-gold checked:bg-gold indeterminate:border-gold indeterminate:bg-gold",
          "hover:border-fg-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <CheckIcon weight="bold" aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto hidden size-[70%] text-on-gold peer-checked:block peer-indeterminate:hidden" />
      <MinusIcon weight="bold" aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto hidden size-[70%] text-on-gold peer-indeterminate:block" />
    </span>
  );
  if (!label && !description) return <span className={className}>{control}</span>;
  return (
    <label htmlFor={controlId} className={cx("flex min-w-0 cursor-pointer items-start gap-2.5", disabled && "cursor-not-allowed opacity-60", className)}>
      <span className="mt-[1px]">{control}</span>
      <span className="min-w-0">
        {label && <span className="block text-[13.5px] leading-snug text-fg">{label}</span>}
        {description && <span className="mt-0.5 block text-xs leading-snug text-fg-3">{description}</span>}
      </span>
    </label>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Nome acessível quando não há rótulo visível. */
  label?: string;
  size?: "sm" | "md";
  id?: string;
}

export function Switch({ checked, onChange, disabled, label, size = "md", id }: SwitchProps) {
  const track = size === "sm" ? "h-[18px] w-[30px]" : "h-[22px] w-[38px]";
  const thumb = size === "sm" ? "h-3.5 w-3.5" : "h-[18px] w-[18px]";
  const translate = size === "sm" ? "translate-x-3" : "translate-x-4";
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q-focus)] disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-gold" : "bg-line-strong",
        track,
      )}
    >
      <span className={cx("block rounded-full bg-white shadow-sm transition-transform duration-150 ease-q", thumb, checked && translate)} />
    </button>
  );
}

/** Linha de configuração: rótulo + descrição à esquerda, controle à direita. */
export function SettingRow({ title, description, control, className }: { title: ReactNode; description?: ReactNode; control: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-w-0 items-center justify-between gap-4 py-3", className)}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-fg">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-snug text-fg-3">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
