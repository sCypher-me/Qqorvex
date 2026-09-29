export type CrystalCoreState = "idle" | "processing" | "success" | "warning" | "error";

/** Abstractive Vex presence used outside the Assistant Studio; the character itself stays in chat. */
export function CrystalCore({ size = "md", state = "idle" }: { size?: "sm" | "md" | "lg"; state?: CrystalCoreState }) {
  return (
    <span className={`qv-crystal-core qv-crystal-core--${size}`} data-state={state} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" focusable="false">
        <path d="M16 2.75 27.75 16 16 29.25 4.25 16 16 2.75Z" stroke="currentColor" strokeWidth="1.3" />
        <path d="m16 2.75-4.1 13.1L16 29.25l4.1-13.4L16 2.75Z" stroke="currentColor" strokeWidth="1.1" opacity=".72" />
        <path d="M4.25 16h23.5M11.9 15.85 16 10l4.1 5.85L16 22l-4.1-6.15Z" stroke="currentColor" strokeWidth="1.1" opacity=".78" />
        <circle cx="16" cy="16" r="1.65" fill="currentColor" />
      </svg>
    </span>
  );
}
