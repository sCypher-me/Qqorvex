import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer'],
});
const errors = [];
const settle = async page => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.waitForTimeout(200); };
async function checkWidth(page, name) {
  const { viewport, bodyWidth } = await page.evaluate(() => ({ viewport: innerWidth, bodyWidth: document.body.scrollWidth }));
  if (bodyWidth > viewport) errors.push(`${name}: rolagem horizontal de ${bodyWidth - viewport}px`);
}

async function makePage(name, width, height, theme = 'dark') {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  await page.addInitScript(value => localStorage.setItem('editorial-theme', value), theme);
  await page.goto('http://127.0.0.1:4174/#hoje', { waitUntil: 'networkidle' });
  await settle(page);
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    appWidth: document.querySelector('.app-shell')?.scrollWidth,
    theme: document.documentElement.dataset.theme,
  }));
  console.log(name, metrics);
  return page;
}

const desktop = await makePage('hoje-desktop-dark', 1487, 1058);
await desktop.locator('.vex-trigger').click();
await settle(desktop);
await desktop.screenshot({ path: resolve(output, 'vex-panel-desktop-dark.png') });
await desktop.keyboard.press('Escape');
if (await desktop.locator('.vex-panel').count()) errors.push('Desktop: Vex não fechou com Esc');
await desktop.getByRole('button', { name: 'Tarefas', exact: true }).first().click();
await settle(desktop);
await desktop.screenshot({ path: resolve(output, 'tarefas-desktop-dark.png') });
await checkWidth(desktop, 'Tarefas desktop');
if (JSON.stringify(await desktop.locator('.sidebar-link.active').allTextContents()) !== JSON.stringify(['Tarefas'])) errors.push('Desktop: navegação ativa incorreta');
await desktop.getByRole('textbox', { name: 'Nova tarefa' }).fill('Revisar o protótipo');
await desktop.getByRole('button', { name: 'Adicionar', exact: false }).first().click();
await settle(desktop);
if (!(await desktop.getByText('Revisar o protótipo').count())) errors.push('Desktop: tarefa não foi adicionada');
await desktop.screenshot({ path: resolve(output, 'tarefas-desktop-interacao.png') });
await desktop.locator('.vex-trigger').click();
await desktop.getByRole('button', { name: 'Abrir tela da Vex' }).click();
await settle(desktop);
await desktop.screenshot({ path: resolve(output, 'vex-tela-desktop-dark.png') });
await checkWidth(desktop, 'Vex desktop');
await desktop.getByRole('button', { name: 'Nova conversa' }).first().click();
if (!(await desktop.getByText('Esta é uma nova conversa nesta prévia visual.').count())) errors.push('Desktop: nova conversa não reiniciou');
await desktop.close();

const mobile = await makePage('hoje-mobile-dark', 390, 844);
await mobile.locator('.mobile-nav').getByRole('button', { name: 'Tarefas' }).click();
await settle(mobile);
await mobile.screenshot({ path: resolve(output, 'tarefas-mobile-dark.png') });
await checkWidth(mobile, 'Tarefas mobile');
await mobile.locator('.mobile-nav').getByRole('button', { name: 'Vex' }).click();
await settle(mobile);
await mobile.screenshot({ path: resolve(output, 'vex-tela-mobile-dark.png') });
await checkWidth(mobile, 'Vex mobile');
await mobile.getByRole('button', { name: 'Nova conversa' }).click();
if (!(await mobile.getByText('Esta é uma nova conversa nesta prévia visual.').count())) errors.push('Mobile: nova conversa não reiniciou');
await mobile.close();

const desktopLight = await makePage('hoje-desktop-light', 1487, 1058, 'light');
await desktopLight.getByRole('button', { name: 'Ativar tema escuro' }).click();
if (await desktopLight.locator('html[data-theme="dark"]').count() !== 1) errors.push('Desktop: alternância de tema não funcionou');
await desktopLight.close();
const mobileLight = await makePage('hoje-mobile-light', 390, 844, 'light');
await mobileLight.close();

await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
