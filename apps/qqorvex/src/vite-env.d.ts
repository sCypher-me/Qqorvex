/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_OLLAMA_MODEL?: string;
  readonly VITE_VEX_USE_OLLAMA?: string;
  readonly VITE_BILLING_CHANNEL?: "web" | "direct_apk" | "play";
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare const __QQORVEX_APP_VERSION__: string;
declare const __QQORVEX_UPDATE_CHANNEL__: "beta" | "stable";
