import { cx } from "../cx";

/**
 * Símbolo Qqorvex redesenhado em vetor (a partir do "Symbol Official"): losango externo, losango
 * interno, eixos e três nós. Em SVG com `currentColor`, acompanha tema e skin sem arquivos extras.
 */
export function BrandSymbol({ size = 24, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cx("shrink-0 text-gold", className)}
    >
      <g stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M50 12 L77 50 L50 88 L23 50 Z" />
        <path d="M50 33 L62.5 50 L50 67 L37.5 50 Z" />
        <path d="M50 4 V96" />
        <path d="M4 50 H96" />
      </g>
      <circle cx="50" cy="12" r="4.4" fill="currentColor" />
      <circle cx="50" cy="50" r="5.6" fill="currentColor" />
      <circle cx="50" cy="88" r="4.4" fill="currentColor" />
    </svg>
  );
}

/** Wordmark "Qqorvex." em texto (Outfit), com o ponto quadrado dourado da marca. */
export function Wordmark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span className={cx("inline-flex items-baseline font-display font-bold leading-none tracking-[-0.035em] text-fg", className)} style={{ fontSize: size }} aria-label="Qqorvex">
      <span aria-hidden="true">Qqorvex</span>
      <span aria-hidden="true" className="ml-[0.06em] inline-block bg-gold" style={{ width: size * 0.2, height: size * 0.2 }} />
    </span>
  );
}

/** Marca da Vex (IA): foto da personagem em círculo com anel teal. */
export function VexAvatar({ size = 32, className, status }: { size?: number; className?: string; status?: "idle" | "thinking" | "offline" }) {
  return (
    <span className={cx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <img src="/brand/vex-avatar.png" alt="" width={size} height={size} className="h-full w-full rounded-full object-cover ring-1 ring-ai-line" />
      {status === "thinking" && <span aria-hidden="true" className="absolute -inset-0.5 animate-pulse-soft rounded-full ring-2 ring-ai" />}
      {status === "offline" && <span aria-hidden="true" className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-fg-4" />}
    </span>
  );
}
