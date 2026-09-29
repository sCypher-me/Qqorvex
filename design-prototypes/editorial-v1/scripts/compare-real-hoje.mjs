import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve('screenshots/concept-approved.png');
const actualPath = resolve('screenshots/real-hoje-user.png');
const source = `data:image/png;base64,${(await readFile(sourcePath)).toString('base64')}`;
const actual = `data:image/png;base64,${(await readFile(actualPath)).toString('base64')}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer'],
});
const page = await browser.newPage();
const result = await page.evaluate(async ({ source, actual }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const [left, right] = await Promise.all([load(source), load(actual)]);
  const width = 1487;
  const height = Math.round(right.height * width / right.width);
  const gap = 24;
  const header = 48;
  const canvas = document.createElement('canvas');
  canvas.width = width * 2 + gap;
  canvas.height = height + header;
  const context = canvas.getContext('2d');
  context.fillStyle = '#131313';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#eeeeee';
  context.font = '20px sans-serif';
  context.fillText('CONCEITO APROVADO — faixa superior normalizada', 12, 30);
  context.fillText('APP REAL — captura do usuário normalizada', width + gap + 12, 30);
  context.drawImage(left, 0, 0, left.width, height, 0, header, width, height);
  context.drawImage(right, 0, 0, right.width, right.height, width + gap, header, width, height);
  return { image: canvas.toDataURL('image/png'), sourcePixels: [left.width, left.height], actualPixels: [right.width, right.height], normalizedPixels: [width, height] };
}, { source, actual });
const output = resolve('screenshots/compare-real-hoje.png');
await writeFile(output, Buffer.from(result.image.split(',')[1], 'base64'));
console.log(JSON.stringify({ output, sourcePixels: result.sourcePixels, actualPixels: result.actualPixels, normalizedPixels: result.normalizedPixels }));
await browser.close();
