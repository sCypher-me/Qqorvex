import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Persistent accessible name; icon-only controls must never be unnamed. */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, type = "button", className = "", children, ...props }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={`qv-icon-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
