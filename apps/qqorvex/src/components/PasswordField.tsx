import { useState, type InputHTMLAttributes } from "react";
import { Input } from "@qqorvex/ui";
import { getPasswordChecklist, MAX_PASSWORD_LENGTH } from "@qqorvex/auth";

/** Olho aberto/fechado em SVG simples — sem ícone lib só por isso. */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "onBlur"> {
  onBlur?: () => void;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Mostra a checklist de requisitos abaixo (cadastro/redefinição) — login não precisa. */
  showChecklist?: boolean;
  wrapperClassName?: string;
  className?: string;
}

/** Mostrar/ocultar não muda cursor, não perde foco, não quebra autofill — é só o `type` do input alternando. */
export function PasswordField({ label, value, onChange, onBlur, showChecklist, wrapperClassName, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          setTouched(true);
          onBlur?.();
        }}
        maxLength={MAX_PASSWORD_LENGTH}
        wrapperClassName={wrapperClassName}
        className={className}
        trailingAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
            className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent text-text-muted hover:text-text-secondary cursor-pointer"
          >
            <EyeIcon open={visible} />
          </button>
        }
        {...props}
      />
      {showChecklist && (touched || value.length > 0) && (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {getPasswordChecklist(value).map((rule) => (
            <li key={rule.id} className={`text-xs flex items-center gap-1.5 ${rule.met ? "text-success" : "text-text-muted"}`}>
              <span aria-hidden="true">{rule.met ? "✓" : "✕"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
