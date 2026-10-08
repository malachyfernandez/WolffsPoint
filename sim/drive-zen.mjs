/**
 * sim/drive-zen.mjs — puppeteer harness driving real Zen (Firefox) via
 * WebDriver BiDi. Mirrors drive.mjs but can't intercept downloads via CDP, so
 * the report is pulled from window.__perfReport instead.
 * Usage: node sim/drive-zen.mjs [--tour] [--url http://localhost:8090]
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:8090';
const runTour = process.argv.includes('--tour');
const outDir = path.join(process.cwd(), 'sim', 'out');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/Applications/Zen.app/Contents/MacOS/zen',
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const logs = [];
page.on('console', (m) => {
  const t = `[${m.type()}] ${m.text()}`;
  logs.push(t);
  if (m.type() === 'error' || m.type() === 'warn') process.stdout.write(t.slice(0, 300) + '\n');
});
page.on('pageerror', (e) => process.stdout.write(`[pageerror] ${e.message}\n`));

console.log('loading', url, 'in Zen (headless)');
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('[data-testid="sim-run-all"]', { timeout: 60000 });
console.log('app loaded, sim bar found');

await page.waitForSelector('[data-testid^="game-"]', { timeout: 30000 }).catch(() => {
  console.log('WARN: no game rows found within 30s');
});
const gameRows = await page.$$eval('[data-testid^="game-"]', (els) => els.map((e) => e.getAttribute('data-testid')));
console.log('game rows:', JSON.stringify(gameRows));

if (runTour) {
  console.log('starting tour…');
  await page.evaluate(() => document.querySelector('[data-testid="sim-run-all"]').click());
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < 12 * 60 * 1000) {
    const status = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="sim-run-all"]');
      const prog = bar?.parentElement?.parentElement?.querySelectorAll('div')[1]?.textContent ?? '';
      return { busy: bar?.textContent?.includes('Running'), prog };
    });
    if (status.prog !== last) {
      last = status.prog;
      console.log('  progress:', status.prog.slice(0, 120));
    }
    if (!status.busy) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log('tour finished (or timed out) after', ((Date.now() - t0) / 1000).toFixed(0), 's');

  const md = await page.evaluate(() => window.__perfReport ?? null);
  if (md) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = `wolffspoint-perf-audit-${stamp}-zen.md`;
    fs.writeFileSync(path.join(outDir, file), md);
    console.log('report written:', file);
  } else {
    console.log('WARN: window.__perfReport empty — report not captured');
  }
}

fs.writeFileSync(path.join(outDir, 'console-zen.log'), logs.join('\n'));
await browser.close();
