import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Input } from "@qqorvex/ui";
import { getPasswordChecklist, getPasswordStrength, MAX_PASSWORD_LENGTH, type PasswordStrengthLevel } from "@qqorvex/auth";
import { StatusIcon } from "./StatusIcon";

const STRENGTH_LABEL: Record<PasswordStrengthLevel, string> = {
  fraca: "Fraca",
  media: "Média",
  forte: "Forte",
  "muito-forte": "Muito forte",
};

const STRENGTH_COLOR: Record<PasswordStrengthLevel, string> = {
  fraca: "var(--q-danger)",
  media: "var(--q-warning)",
  forte: "var(--q-gold)",
  "muito-forte": "var(--q-success)",
};

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "onBlur"> {
  onBlur?: () => void;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Mostra a checklist de requisitos abaixo (cadastro/redefinição) — login não precisa. */
  showChecklist?: boolean;
  fieldSize?: "sm" | "md" | "lg";
  wrapperClassName?: string;
  className?: string;
}

/** Mostrar/ocultar não muda cursor, não perde foco, não quebra autofill — é só o `type` do input alternando. */
export function PasswordField({ label, value, onChange, onBlur, showChecklist, fieldSize = "md", wrapperClassName, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const strength = getPasswordStrength(value);

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
        fieldSize={fieldSize}
        wrapperClassName={wrapperClassName}
        className={className}
        trailingAdornment={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-fg-3 hover:bg-hover hover:text-fg"
          >
            {visible ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        }
        {...props}
      />
      {showChecklist && (touched || value.length > 0) && (
        <div className="flex flex-col gap-2.5" aria-live="polite">
          {value.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-selected">
                <div
                  className="h-full rounded-full transition-[width,background-color] duration-300"
                  style={{ width: `${strength.percent}%`, background: STRENGTH_COLOR[strength.level] }}
                />
              </div>
              <span className="text-[11px] font-medium shrink-0 transition-colors duration-300" style={{ color: STRENGTH_COLOR[strength.level] }}>
                {STRENGTH_LABEL[strength.level]}
              </span>
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {getPasswordChecklist(value).map((rule) => (
              <li
                key={rule.id}
                className={`text-xs flex items-center gap-1.5 transition-colors duration-150 ${rule.met ? "text-success" : "text-fg-3"}`}
              >
                <StatusIcon ok={rule.met} />
                {rule.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
