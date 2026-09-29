import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "../ThemeContext";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={`inline-flex h-10 shrink-0 items-center justify-center bg-transparent text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${compact ? "w-10 rounded-[10px] border border-border px-0 hover:border-brand-primary desktop:w-auto desktop:gap-3 desktop:rounded-none desktop:border-transparent desktop:px-1" : "gap-2 px-1 desktop:gap-3"}`}
    >
      {compact ? (
        <>
          <span className="grid place-items-center desktop:hidden">{dark ? <SunIcon size={19} aria-hidden="true" /> : <MoonIcon size={19} aria-hidden="true" />}</span>
          <span className="hidden items-center gap-3 desktop:inline-flex" aria-hidden="true">
            <SunIcon size={19} />
            <span className="relative inline-flex h-[23px] w-[43px] items-center rounded-full bg-brand-primary p-[3px]">
              <span className={`h-[17px] w-[17px] rounded-full bg-white transition-transform motion-reduce:transition-none ${dark ? "translate-x-[20px]" : "translate-x-0"}`} />
            </span>
            <MoonIcon size={19} />
          </span>
        </>
      ) : (
        <>
          <SunIcon size={19} aria-hidden="true" />
          <span className="relative inline-flex h-[23px] w-[43px] items-center rounded-full bg-brand-primary p-[3px]" aria-hidden="true">
            <span className={`h-[17px] w-[17px] rounded-full bg-white transition-transform motion-reduce:transition-none ${dark ? "translate-x-[20px]" : "translate-x-0"}`} />
          </span>
          <MoonIcon size={19} aria-hidden="true" />
        </>
      )}
      {!compact && <span className="hidden sm:inline">{dark ? "Escuro" : "Claro"}</span>}
    </button>
  );
}
