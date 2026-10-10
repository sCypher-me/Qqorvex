import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

const tauriConfig = JSON.parse(readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8")) as { version: string };
const updateChannel = process.env.VITE_APP_UPDATE_CHANNEL === "beta" ? "beta" : "stable";
// Identifica o build publicado. O app web compara com `/version.json` para trocar de versão sem cair
// (ver `src/app/updates/WebUpdateWatcher.tsx`). No Cloudflare Pages usa o commit do deploy.
const buildId = (process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA)?.slice(0, 12) || Date.now().toString(36);

function versionManifest(): Plugin {
  return {
    name: "qqorvex-version-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: tauriConfig.version, buildId }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), versionManifest()],
  define: {
    __QQORVEX_APP_VERSION__: JSON.stringify(tauriConfig.version),
    __QQORVEX_UPDATE_CHANNEL__: JSON.stringify(updateChannel),
    __QQORVEX_BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 5173,
  },
});
