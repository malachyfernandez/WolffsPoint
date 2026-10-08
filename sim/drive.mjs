/**
 * sim/drive.mjs — puppeteer harness for the perf-audit copy.
 * Usage: node sim/drive.mjs [--tour] [--url http://localhost:8090]
 * Loads the app, reports console errors, optionally runs the full tour and
 * writes the downloaded markdown report to sim/out/.
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
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();

const logs = [];
page.on('console', (m) => {
  const t = `[${m.type()}] ${m.text()}`;
  logs.push(t);
  if (m.type() === 'error' || m.type() === 'warn') process.stdout.write(t.slice(0, 300) + '\n');
});
page.on('pageerror', (e) => process.stdout.write(`[pageerror] ${e.message}\n`));

const client = await page.createCDPSession();
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });

console.log('loading', url);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('[data-testid="sim-run-all"]', { timeout: 60000 });
console.log('app loaded, sim bar found');

// give the app a moment to mount the game list
await page.waitForSelector('[data-testid^="game-"]', { timeout: 30000 }).catch(() => {
  console.log('WARN: no game rows found within 30s');
});
const gameRows = await page.$$eval('[data-testid^="game-"]', (els) => els.map((e) => e.getAttribute('data-testid')));
console.log('game rows:', JSON.stringify(gameRows));

if (runTour) {
  console.log('starting tour…');
  await page.click('[data-testid="sim-run-all"]');
  // wait until the tour finishes (progress text stops updating / button re-enabled)
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < 10 * 60 * 1000) {
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
  await new Promise((r) => setTimeout(r, 2000));
}

fs.writeFileSync(path.join(outDir, 'console.log'), logs.join('\n'));
const mdFiles = fs.readdirSync(outDir).filter((f) => f.endsWith('.md'));
console.log('report files:', mdFiles);
await browser.close();
