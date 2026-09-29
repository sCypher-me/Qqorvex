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

for (const [name, width, height] of [
  ['real-login-desktop', 1487, 1058],
  ['real-login-mobile', 390, 844],
]) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text().slice(0, 240)); });
  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
  const metrics = await page.evaluate(() => ({
    path: location.pathname,
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    theme: document.documentElement.dataset.theme,
    bodyText: document.body.innerText.slice(0, 220),
    rootChildren: document.querySelector('#root')?.childElementCount,
  }));
  console.log(name, JSON.stringify({ ...metrics, errors }));
  await page.close();
}

await browser.close();
