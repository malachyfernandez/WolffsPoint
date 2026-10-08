import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/Applications/Zen.app/Contents/MacOS/zen',
  headless: true,
});
const page = await browser.newPage();
let pointerErrors = 0;
page.on('pageerror', e => { if (/pointer id/i.test(e.message)) { pointerErrors++; console.log('[POINTER-ERR]', e.message); } else console.log('[pageerror]', e.message.slice(0, 160)); });
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 160)); });
await page.setViewport({ width: 1280, height: 900 });
await page.goto('http://localhost:8090', { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('[data-testid="sim-run-all"]', { timeout: 60000 });
const r = await page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const tap = (el) => {
    const rect = el.getBoundingClientRect();
    const base = { bubbles: true, cancelable: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, view: window };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mousedown', base));
    el.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mouseup', base));
    el.dispatchEvent(new MouseEvent('click', base));
  };
  const open = () => [...document.querySelectorAll('[role="dialog"]')].filter(d => !!(d.offsetParent || d.getClientRects().length)).length;
  tap(document.querySelector('[data-testid="sim-modal-lab"]'));
  await sleep(700);
  tap(document.querySelector('[data-testid="modallab-open-town-square-post"]'));
  await sleep(1200);
  const opened = open();
  if (!opened) return 'dialog did not open';
  const dlg = [...document.querySelectorAll('[role="dialog"]')].find(d => !!(d.offsetParent || d.getClientRects().length));
  tap(dlg.querySelector('[aria-label="Close"]'));
  await sleep(1200);
  return `opened=${opened} openAfterClose=${open()}`;
});
console.log('RESULT:', r, '| pointer errors:', pointerErrors);
await browser.close();
