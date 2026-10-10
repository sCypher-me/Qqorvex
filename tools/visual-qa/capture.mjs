#!/usr/bin/env node
/**
 * QA visual do Qqorvex com Supabase simulado.
 *
 *   node tools/visual-qa/capture.mjs                 # todas as rotas, desktop+mobile, dark+light
 *   node tools/visual-qa/capture.mjs --routes=/,/planejar/tarefas --viewports=desktop --themes=dark
 *   node tools/visual-qa/capture.mjs --url=http://localhost:5199   # reaproveita um servidor já rodando
 *   node tools/visual-qa/capture.mjs --full           # captura a página inteira (scroll)
 *
 * Saída em tools/visual-qa/out/. Erros de console/página são impressos no final — qualquer
 * `pageerror` é tratado como falha (exit 1).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { installSupabaseMock, MOCK_SUPABASE_URL, STORAGE_KEY } from "./mock-supabase.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outDir = fileURLToPath(new URL("./out/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : "true"];
  }),
);

export const DEFAULT_ROUTES = [
  "/",
  "/planejar/tarefas",
  "/planejar/agenda",
  "/planejar/metas",
  "/conhecimento/estudos",
  "/conhecimento/notas",
  "/conhecimento/biblioteca",
  "/vida/financas",
  "/vida/documentos",
  "/vida/pessoal",
  "/vex",
  "/configuracoes/seguranca",
  "/conquistas",
  "/assinatura",
  "/configuracoes",
  "/login",
  "/criar-conta",
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false },
  laptop: { width: 1180, height: 780, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true },
};

const routes = (args.routes ? args.routes.split(",") : DEFAULT_ROUTES).filter(Boolean);
const viewports = (args.viewports ?? "desktop,mobile").split(",");
const themes = (args.themes ?? "dark,light").split(",");
const port = Number(args.port ?? 5199);

async function waitFor(url, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Servidor não respondeu em ${url}`);
}

let server;
let baseUrl = args.url;
if (!baseUrl) {
  baseUrl = `http://localhost:${port}`;
  server = spawn("corepack", ["pnpm", "--filter", "qqorvex", "exec", "vite", "--port", String(port), "--strictPort"], {
    cwd: root,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: MOCK_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: "qa-publishable-key",
      VITE_VEX_USE_OLLAMA: "false",
    },
    stdio: args.verbose ? "inherit" : "ignore",
    // No Windows o corepack é um .cmd: sem shell o spawn falha com ENOENT.
    shell: process.platform === "win32",
  });
  await waitFor(baseUrl);
}

const browser = await chromium.launch(args.executablePath ? { executablePath: args.executablePath } : {});
const problems = [];
let pageErrors = 0;

try {
  for (const viewportName of viewports) {
    const viewport = VIEWPORTS[viewportName];
    if (!viewport) continue;
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.isMobile ? 2 : 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        colorScheme: theme === "light" ? "light" : "dark",
      });
      await context.addInitScript((value) => {
        try {
          window.localStorage.setItem("qqorvex.theme", value);
        } catch {
          // opcional
        }
      }, theme);

      for (const route of routes) {
        const page = await context.newPage();
        const isPublic = ["/login", "/criar-conta", "/esqueci-senha", "/redefinir-senha", "/mfa", "/entrar-por-email"].includes(route);
        if (!isPublic) await installSupabaseMock(page, { log: args.log === "true", onboarding: args.onboarding === "true", owner: args.owner === "true" });
        else {
          await page.addInitScript((key) => {
            try {
              window.localStorage.removeItem(key);
            } catch {
              // opcional
            }
          }, STORAGE_KEY);
          await page.route(`${MOCK_SUPABASE_URL}/**`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
        }
        page.on("pageerror", (error) => {
          pageErrors += 1;
          problems.push(`[pageerror] ${route} (${viewportName}/${theme}): ${error.message}`);
        });
        page.on("console", (message) => {
          if (message.type() === "error") problems.push(`[console] ${route} (${viewportName}/${theme}): ${message.text().slice(0, 300)}`);
        });

        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        await page
          .waitForFunction(() => !document.querySelector('[aria-busy="true"]') && document.querySelector("#root")?.childElementCount, null, { timeout: 45_000 })
          .catch(() => problems.push(`[timeout] ${route} (${viewportName}/${theme}): ainda carregando`));
        await page.waitForTimeout(Number(args.wait ?? 900));
        const horizontalOverflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) - window.innerWidth,
        );
        if (horizontalOverflow > 2) {
          problems.push(`[overflow] ${route} (${viewportName}/${theme}): ${horizontalOverflow}px além da largura da tela`);
        }
        // Passos opcionais: --steps='[{"click":"Texto"},{"press":"Escape"},{"wait":400},{"fill":["placeholder","texto"]}]'
        for (const step of args.steps ? JSON.parse(args.steps) : []) {
          if (step.click) await page.getByText(step.click, { exact: step.exact ?? false }).first().click();
          if (step.clickRole) await page.getByRole(step.clickRole[0], { name: step.clickRole[1], exact: step.exact ?? false }).first().click();
          if (step.press) await page.keyboard.press(step.press);
          if (step.fill) await page.getByPlaceholder(step.fill[0]).first().fill(step.fill[1]);
          await page.waitForTimeout(step.wait ?? 450);
        }
        const suffix = args.name ? `-${args.name}` : "";
        const name = `${route === "/" ? "hoje" : route.replace(/^\//, "").replace(/\//g, "_").replace(/[?=&]/g, "-")}${suffix}-${viewportName}-${theme}.png`;
        await page.screenshot({ path: `${outDir}${name}`, fullPage: args.full === "true" });
        console.log(`✓ ${name}`);
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  if (server && process.platform === "win32") {
    // Com shell, o kill encerraria só o cmd.exe e deixaria o Vite preso na porta.
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server?.kill("SIGTERM");
  }
}

const unique = [...new Set(problems)];
if (unique.length) {
  console.log(`\n${unique.length} problema(s):`);
  for (const line of unique) console.log(`  ${line}`);
}
process.exit(pageErrors > 0 || unique.some((line) => line.startsWith("[overflow]")) ? 1 : 0);
