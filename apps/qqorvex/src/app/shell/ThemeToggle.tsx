import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { IconButton } from "@qqorvex/ui";
import { useTheme } from "../ThemeContext";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <IconButton label={dark ? "Usar tema claro" : "Usar tema escuro"} onClick={toggleTheme} className={className}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
