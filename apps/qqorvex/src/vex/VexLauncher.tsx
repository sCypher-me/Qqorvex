import { createContext, useContext } from "react";

/**
 * Abre a Vex (painel no desktop, tela cheia no celular), opcionalmente já com uma pergunta.
 * Fornecido pelo shell; páginas usam para botões "Pedir à Vex".
 */
export const VexLauncherContext = createContext<(prompt?: string) => void>(() => undefined);

export function useVexLauncher() {
  return useContext(VexLauncherContext);
}
