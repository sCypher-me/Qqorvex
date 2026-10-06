import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

const tauriConfig = JSON.parse(readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8")) as { version: string };
const updateChannel = process.env.VITE_APP_UPDATE_CHANNEL === "beta" ? "beta" : "stable";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __QQORVEX_APP_VERSION__: JSON.stringify(tauriConfig.version),
    __QQORVEX_UPDATE_CHANNEL__: JSON.stringify(updateChannel),
  },
  server: {
    port: 5173,
  },
});
