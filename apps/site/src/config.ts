/** Endereços e chaves públicas do site (todas podem ir para o navegador). */
export const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://qqorvex-app.pages.dev";
export const APK_URL = "https://github.com/sCypher-me/Qqorvex/releases/download/android-beta-20261004-v0.1.1/qqorvex-android-beta.apk";
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://uowipikbumbaprckdvkg.supabase.co";
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";
