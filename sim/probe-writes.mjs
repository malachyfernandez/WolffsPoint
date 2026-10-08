import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: true, args: ['--window-size=1400,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:8090', { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForSelector('[data-testid="sim-run-all"]', { timeout: 60000 });
await page.waitForSelector('[data-testid="game-SIMOP1234"]', { timeout: 30000 });
// open the operator game
await page.evaluate(() => {
  const el = document.querySelector('[data-testid="game-SIMOP1234"]');
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await new Promise(r => setTimeout(r, 7000));
// now visit each operator tab once to collect their writes too
const tabs = ['op-tab-config','op-tab-nightly','op-tab-forum','op-tab-newspaper','op-tab-rulebook'];
const out = {};
out.open = await page.evaluate(() => {
  const log = window.__simDb?.stats?.mutationLog ?? [];
  return log.map(m => m.name);
});
for (const t of tabs) {
  const before = await page.evaluate(() => window.__simDb.stats.mutationLog.length);
  await page.evaluate((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`) || document.querySelector(`[data-testid="tab-${tid.replace('op-tab-','')}"]`);
    if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, t);
  await new Promise(r => setTimeout(r, 3500));
  out[t] = await page.evaluate((b) => window.__simDb.stats.mutationLog.slice(b).map(m => m.name), before);
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
