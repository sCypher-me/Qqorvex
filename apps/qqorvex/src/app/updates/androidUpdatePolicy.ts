/**
 * Quando o APK novo é baixado e instalado sem pedir nada ao usuário.
 *
 * - Download automático só fora de rede medida (dados móveis), para não gastar a franquia.
 * - Instalação automática só quando o app sai da tela (segundo plano), com a autorização de
 *   "instalar apps" já concedida, e no máximo uma tentativa automática a cada 6 h por versão —
 *   se o Android pedir confirmação, o aviso dentro do app assume e nada fica em laço.
 */

export const AUTO_INSTALL_RETRY_MS = 6 * 60 * 60 * 1000;

export interface AutoInstallAttempt {
  version: string;
  at: number;
}

export function shouldAutoDownload(input: { metered: boolean; downloaded: boolean; busy: boolean }): boolean {
  return !input.metered && !input.downloaded && !input.busy;
}

export function shouldAutoInstall(input: {
  version: string;
  downloaded: boolean;
  canInstall: boolean;
  lastAttempt: AutoInstallAttempt | null;
  now: number;
}): boolean {
  if (!input.downloaded || !input.canInstall) return false;
  const last = input.lastAttempt;
  if (last && last.version === input.version && input.now - last.at < AUTO_INSTALL_RETRY_MS) return false;
  return true;
}

/** A versão em execução é a que o app tentou instalar antes de fechar: a atualização foi aplicada. */
export function updateWasApplied(pendingVersion: string | null, runningVersion: string): boolean {
  return Boolean(pendingVersion) && pendingVersion === runningVersion;
}
