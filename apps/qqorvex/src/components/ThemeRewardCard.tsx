import { LEVEL_THEMES, VIP_THEME, type AppSkin } from "../app/ThemeContext";

export type ThemeRewardDefinition = (typeof LEVEL_THEMES)[number] | typeof VIP_THEME;

export function ThemeRewardCard({
  theme,
  requirement,
  unlocked,
  active,
  busy,
  checking = false,
  lockedMessage,
  onChoose,
}: {
  theme: ThemeRewardDefinition;
  requirement: string;
  unlocked: boolean;
  active: boolean;
  busy: boolean;
  checking?: boolean;
  lockedMessage: string;
  onChoose: (skin: AppSkin) => void;
}) {
  const isVip = theme.id === VIP_THEME.id;

  return (
    <article className={`qv-level-theme-card ${isVip ? "qv-level-theme-card--vip" : ""} ${active ? "qv-level-theme-card--active" : ""}`}>
      <div className="qv-level-theme-preview" style={{ backgroundColor: theme.preview.canvas, borderColor: theme.preview.panel }} aria-hidden="true">
        <div className="qv-level-theme-preview__topline">
          <span style={{ backgroundColor: theme.preview.accent }} />
          <span style={{ backgroundColor: theme.preview.glow, opacity: 0.72 }} />
        </div>
        <div className="qv-level-theme-preview__surface" style={{ backgroundColor: theme.preview.panel }}>
          <span style={{ width: "42%", backgroundColor: theme.preview.accent }} />
          <span style={{ width: "76%", backgroundColor: theme.preview.glow, opacity: 0.52 }} />
          <span style={{ width: "58%", backgroundColor: theme.preview.glow, opacity: 0.28 }} />
        </div>
        <span className="qv-level-theme-preview__orb" style={{ backgroundColor: theme.preview.accent, boxShadow: `0 0 22px ${theme.preview.accent}` }} />
      </div>
      <div className="qv-level-theme-card-heading">
        <div className="min-w-0">
          <span className="qv-level-theme-level">{requirement}</span>
          <h3>{theme.name}</h3>
        </div>
        <span className={`qv-level-theme-status ${active ? "qv-level-theme-status--active" : unlocked ? "qv-level-theme-status--unlocked" : ""}`}>
          {active ? "Em uso" : checking ? "Verificando" : unlocked ? "Desbloqueado" : isVip ? "VIP" : "Bloqueado"}
        </span>
      </div>
      <p className="qv-level-theme-essence">{theme.essence}</p>
      <p className="qv-level-theme-description">{theme.description}</p>
      <button
        type="button"
        className={`qv-level-theme-action ${active ? "qv-level-theme-action--active" : ""}`}
        disabled={!unlocked || active || busy || checking}
        aria-pressed={active}
        onClick={() => onChoose(theme.id)}
      >
        {active ? "Tema aplicado" : checking ? "Verificando assinatura…" : unlocked ? busy ? "Aplicando…" : "Usar este tema" : lockedMessage}
      </button>
    </article>
  );
}
