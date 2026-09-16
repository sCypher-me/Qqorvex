import { createSupabaseClient } from "@qqorvex/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias (ver .env.example).",
  );
}

export const supabase = createSupabaseClient({ url, publishableKey });
