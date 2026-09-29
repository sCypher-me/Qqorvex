/** Check/X desenhado — substitui os caracteres ✓/✕ de texto (checklist de senha, confirmação, disponibilidade de usuário). */
export function StatusIcon({ ok, className = "" }: { ok: boolean; className?: string }) {
  return ok ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M4 12l5 5L20 6" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
