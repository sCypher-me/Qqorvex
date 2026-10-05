import { useState } from "react";
import { CheckIcon, CrownIcon, DesktopIcon, MoonIcon, SparkleIcon, SunIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import { useGamificationStats } from "@qqorvex/module-gamificacao";
import { Notice, cx } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { LEVEL_THEMES, VIP_THEME, useTheme, type AppSkin, type ThemePreference } from "../app/ThemeContext";
import { SkinPreview, ThemeRewardCard, type ThemeRewardDefinition } from "../components/ThemeRewardCard";
import { SettingsCard, SettingsHeader } from "./shared";
import { normalizeVexStyle, VEX_STYLE_OPTIONS, type VexStyle } from "@qqorvex/vex";

const DEFAULT_SKIN: ThemeRewardDefinition = {
  id: "default",
  name: "Ouro",
  essence: "O original do Qqorvex",
  preview: { canvas: "#100f0e", panel: "#1e1c19", accent: "#d4a056", glow: "#f1d7a8" },
};

const MODES: Array<{ value: ThemePreference; label: string; hint: string; icon: typeof SunIcon }> = [
  { value: "dark", label: "Escuro", hint: "Tinta: confortável à noite", icon: MoonIcon },
  { value: "light", label: "Claro", hint: "Papel creme para o dia", icon: SunIcon },
  { value: "system", label: "Automático", hint: "Segue o seu dispositivo", icon: DesktopIcon },
];

function ModePreview({ mode }: { mode: ThemePreference }) {
  const pane = (light: boolean) => (
    <div className={cx("flex h-full flex-1 flex-col gap-1.5 p-2.5", light ? "bg-[#f6f2ea]" : "bg-[#100f0e]")}>
      <span className={cx("h-1.5 w-8 rounded-full", light ? "bg-[#2a2520]/70" : "bg-[#f3ede3]/80")} />
      <span className={cx("h-6 rounded-md border", light ? "border-[#e4dccd] bg-white" : "border-[#2c2925] bg-[#1e1c19]")} />
      <span className="h-1.5 w-6 rounded-full bg-[#d4a056]" />
    </div>
  );
  return (
    <div className="flex h-[76px] overflow-hidden rounded-lg border border-line" aria-hidden="true">
      {mode === "system" ? (
        <>
          {pane(true)}
          {pane(false)}
        </>
      ) : (
        pane(mode === "light")
      )}
    </div>
  );
}

/** Modo claro/escuro/automático e cor de destaque (liberadas por nível; Coroa Vex com o Plus). */
export function AppearanceSettings() {
  const { client, session } = useAuth();
  const { isPlus, planLoading } = useAccount();
  const { progress } = useGamificationStats(client, session!.user.id);
  const { preference, setPreference, skin, setSkin } = useTheme();
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [vexStyle, setVexStyle] = useState<VexStyle>(() => {
    const saved = session!.user.user_metadata.qqorvex_preferences;
    return normalizeVexStyle(saved && typeof saved === "object" ? (saved as Record<string, unknown>).vex_style : undefined);
  });
  const level = progress?.level ?? 1;
  const selectedTheme = skin === VIP_THEME.id ? VIP_THEME : LEVEL_THEMES.find((theme) => theme.id === skin) ?? DEFAULT_SKIN;
  const previousUnlock = [...LEVEL_THEMES].reverse().find((theme) => theme.level <= level)?.level ?? 0;
  const nextUnlock = LEVEL_THEMES.find((theme) => theme.level > level);
  const unlockProgress = nextUnlock ? Math.min(100, ((level - previousUnlock) / (nextUnlock.level - previousUnlock)) * 100) : 100;

  async function persist(patch: Record<string, unknown>) {
    const saved = session!.user.user_metadata.qqorvex_preferences;
    const current = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
    setSaving(true);
    try {
      const { error } = await client.auth.updateUser({ data: { qqorvex_preferences: { ...current, ...patch } } });
      setSyncError(Boolean(error));
    } catch {
      setSyncError(true);
    } finally {
      setSaving(false);
    }
  }

  function chooseMode(mode: ThemePreference) {
    if (mode === preference) return;
    setPreference(mode);
    void persist({ theme: mode });
  }

  function chooseVexStyle(style: VexStyle) {
    if (style === vexStyle) return;
    setVexStyle(style);
    void persist({ vex_style: style });
  }

  function chooseSkin(next: AppSkin) {
    const reward = LEVEL_THEMES.find((item) => item.id === next);
    if ((reward && level < reward.level) || (next === VIP_THEME.id && !isPlus) || next === skin) return;
    setSkin(next);
    void persist({ skin: next });
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Aparência" description="Escolha como o Qqorvex aparece para você. A preferência acompanha sua conta em outros dispositivos." />
      {syncError && <Notice tone="info" compact>Aplicado neste dispositivo, mas não sincronizou com a conta. Tente de novo quando estiver online.</Notice>}

      <SettingsCard title="Modo" description="Claro, escuro ou seguindo o sistema.">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Modo de cor">
          {MODES.map(({ value, label, hint, icon: Icon }) => {
            const selected = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseMode(value)}
                className={cx("flex flex-col gap-2.5 rounded-xl border p-2.5 text-left transition-colors", selected ? "border-gold-line bg-gold-soft ring-1 ring-gold-line" : "border-line hover:border-line-strong hover:bg-hover")}
              >
                <ModePreview mode={value} />
                <span className="flex items-center gap-2 px-0.5">
                  <Icon size={16} className={selected ? "text-gold-fg" : "text-fg-3"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-fg">{label}</span>
                    <span className="block truncate text-xs text-fg-3">{hint}</span>
                  </span>
                  {selected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-on-gold">
                      <CheckIcon size={12} weight="bold" />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Jeito da Vex" description="Escolha como ela escreve. Você pode mudar isso quando quiser.">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Estilo de conversa da Vex">
          {VEX_STYLE_OPTIONS.map((option) => {
            const selected = vexStyle === option.value;
            return (
              <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => chooseVexStyle(option.value)} className={cx("flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors", selected ? "border-gold-line bg-gold-soft ring-1 ring-gold-line" : "border-line hover:border-line-strong hover:bg-hover")}>
                <SparkleIcon size={18} className={selected ? "mt-0.5 shrink-0 text-gold-fg" : "mt-0.5 shrink-0 text-fg-3"} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium text-fg">{option.label}</span><span className="mt-1 block text-xs leading-relaxed text-fg-3">{option.description}</span></span>
                {selected && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold text-on-gold"><CheckIcon size={12} weight="bold" /></span>}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Temas visuais"
        description="Temas de nível mudam a cor de destaque; a Coroa Vex transforma superfícies, navegação e atmosfera para assinantes Plus."
        aside={<span className="text-xs text-fg-3">{saving ? "Salvando…" : `Você está no nível ${level}`}</span>}
      >
        <div className="flex flex-col gap-5">
          <div data-vip-theme-current={skin === VIP_THEME.id ? "" : undefined} className="grid gap-4 rounded-xl border border-gold-line bg-gold-soft/40 p-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:items-center sm:p-4">
            <SkinPreview preview={selectedTheme.preview} featured skin={selectedTheme.id} />
            <div className="flex min-w-0 flex-col items-start gap-2 px-1 py-1 sm:px-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold-fg">{skin === VIP_THEME.id ? <CrownIcon size={13} weight="fill" /> : <CheckIcon size={13} weight="bold" />}{skin === VIP_THEME.id ? "COROA VEX · PLUS" : "TEMA ATUAL"}</span>
              <h3 className="m-0 font-display text-xl font-semibold text-fg">{selectedTheme.name}</h3>
              <p className="m-0 max-w-md text-[13px] leading-relaxed text-fg-3">{selectedTheme.essence}</p>
              {nextUnlock ? (
                <div className="mt-1 w-full max-w-xs">
                  <div className="mb-1.5 flex justify-between gap-2 text-[11px] text-fg-3"><span>Próximo: {nextUnlock.name}</span><span>Nível {nextUnlock.level}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Progresso até o tema ${nextUnlock.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(unlockProgress)}><div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${unlockProgress}%` }} /></div>
                </div>
              ) : <p className="m-0 mt-1 text-xs text-fg-3">Todas as cores de nível estão liberadas.</p>}
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-sm font-semibold text-fg">Trocar tema</h3>
              <p className="m-0 text-xs text-fg-3">Temas de nível mudam o acento; Coroa Vex transforma o visual completo.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skin !== "default" && <ThemeRewardCard theme={DEFAULT_SKIN} requirement="Sempre disponível" unlocked active={false} busy={false} lockedMessage="" onChoose={() => chooseSkin("default")} />}
          {LEVEL_THEMES.map((theme) => (
            <ThemeRewardCard
              key={theme.id}
              theme={theme}
              requirement={`Nível ${theme.level}`}
              unlocked={level >= theme.level}
              active={false}
              busy={false}
              lockedMessage={`Libera no nível ${theme.level}`}
              onChoose={chooseSkin}
            />
          ))}
          {skin !== VIP_THEME.id && <ThemeRewardCard theme={VIP_THEME} requirement="Exclusivo do Plus" unlocked={isPlus} active={false} busy={false} checking={planLoading} lockedMessage="Assine o Plus para usar" onChoose={chooseSkin} />}
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
