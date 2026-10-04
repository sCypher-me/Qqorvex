/** Endereços e chaves públicas do site (todas podem ir para o navegador). */
export const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://qqorvex-app.pages.dev";
const APK_RELEASE = "https://github.com/sCypher-me/Qqorvex/releases/download/android-beta-20261004-v0.1.2";
export const APK_URL = `${APK_RELEASE}/qqorvex-android-arm64.apk`;
export const APK_URL_ARM32 = `${APK_RELEASE}/qqorvex-android-arm32.apk`;
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://uowipikbumbaprckdvkg.supabase.co";
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";
