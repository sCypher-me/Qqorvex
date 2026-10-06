/** Endereços e chaves públicas do site (todas podem ir para o navegador). */
const APK_RELEASE = "https://github.com/sCypher-me/Qqorvex/releases/download/android-beta-20261006-v0.1.5";
export const APK_URL = `${APK_RELEASE}/qqorvex-android-arm64.apk`;
export const APK_URL_ARM32 = `${APK_RELEASE}/qqorvex-android-arm32.apk`;

/** Abre o download no Chrome completo quando o site está em um navegador embutido no Android. */
export function getApkDownloadHref(url: string): string {
  if (typeof navigator === "undefined" || !/Android/i.test(navigator.userAgent)) return url;

  const target = new URL(url);
  const path = `${target.host}${target.pathname}${target.search}`;
  return `intent://${path}#Intent;scheme=${target.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://uowipikbumbaprckdvkg.supabase.co";
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";
