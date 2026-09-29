import { useEffect, useState } from "react";
import { CheckIcon, DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useAuth } from "@qqorvex/auth";
import { useGamificationStats } from "@qqorvex/module-gamificacao";
import { Notice, cx } from "@qqorvex/ui";
import { useAccount } from "../app/account";
import { LEVEL_THEMES, VIP_THEME, useTheme, type AppSkin, type ThemePreference } from "../app/ThemeContext";
import { ThemeRewardCard, type ThemeRewardDefinition } from "../components/ThemeRewardCard";
import { SettingsCard, SettingsHeader } from "./shared";

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
  const level = progress?.level ?? 1;

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

  function chooseSkin(next: AppSkin) {
    const reward = LEVEL_THEMES.find((item) => item.id === next);
    if ((reward && level < reward.level) || (next === VIP_THEME.id && !isPlus) || next === skin) return;
    setSkin(next);
    void persist({ skin: next });
  }

  // A cor VIP só vale enquanto o Plus estiver ativo.
  useEffect(() => {
    if (planLoading || isPlus || skin !== VIP_THEME.id) return;
    setSkin("default");
    void persist({ skin: "default" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoading, isPlus, skin]);

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

      <SettingsCard
        title="Cor de destaque"
        description="Muda botões, seleções e destaques. Novas cores chegam a cada 10 níveis; a Coroa Vex acompanha o Plus."
        aside={<span className="text-xs text-fg-3">{saving ? "Salvando…" : `Você está no nível ${level}`}</span>}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <ThemeRewardCard theme={DEFAULT_SKIN} requirement="Sempre disponível" unlocked active={skin === "default"} busy={false} lockedMessage="" onChoose={() => chooseSkin("default")} />
          {LEVEL_THEMES.map((theme) => (
            <ThemeRewardCard
              key={theme.id}
              theme={theme}
              requirement={`Nível ${theme.level}`}
              unlocked={level >= theme.level}
              active={skin === theme.id}
              busy={false}
              lockedMessage={`Libera no nível ${theme.level}`}
              onChoose={chooseSkin}
            />
          ))}
          <ThemeRewardCard theme={VIP_THEME} requirement="Exclusivo do Plus" unlocked={isPlus} active={skin === VIP_THEME.id} busy={false} checking={planLoading} lockedMessage="Assine o Plus para usar" onChoose={chooseSkin} />
        </div>
      </SettingsCard>
    </div>
  );
}
