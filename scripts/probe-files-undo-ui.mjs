import { launch } from 'puppeteer';
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';
const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
await page.evaluate(() => {
  const db = window.__simDb;
  const seed = (k, v) => db.seedListItem(db.viewerUserId, k, 'SIMOP1234', v);
  seed('userTable', [{ realName: 'Alice', email: 'a@x.com', userId: 'u1', role: '', playerData: { livingState: 'alive', extraColumns: [] }, days: [] }]);
  seed('cellModuleVersion', 2);
});
await page.waitForSelector(`[data-testid="game-${GAME}"]`);
await page.click(`[data-testid="game-${GAME}"]`);
await page.waitForSelector('[data-testid="gametab-players"]');
await settle(2000);
await page.evaluate(() => {
  document.querySelector('[data-testid="gametab-files"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
await page.waitForFunction(() => document.body.innerText.includes('Search files') || document.body.innerText.includes('Files'), { timeout: 15000 });
await settle(1000);

// click the folder-plus toolbar button (aria-label or title "New Folder")
const clicked = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="New Folder"], [title="New Folder"]')
    ?? [...document.querySelectorAll('div')].find(e => (e.getAttribute('aria-label') === 'New Folder'));
  if (!el) return 'notfound';
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
});
console.log('new-folder clicked:', clicked);
await settle(800);
// type into the prompt input
await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')];
  const target = inputs.at(-1);
  if (!target) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(target, 'ProbeFolder');
  target.dispatchEvent(new Event('input', { bubbles: true }));
});
await settle(300);
// submit the prompt (find its confirm button)
const submitted = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('div, button')].filter(e => ['Create','Create folder','Add','Save'].includes(e.textContent?.trim())).sort((a,b)=>a.contains(b)?1:-1)[0];
  if (btn) { btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return 'btn'; }
  const input = [...document.querySelectorAll('input')].at(-1);
  input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  input?.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  return 'enter';
});
await settle(900);
console.log('submit via:', submitted);
const folderVisible = () => page.evaluate(() => {
  // exclude toast text (bottom-center pill)
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('[class*="toast"], [class*="Toast"]').forEach(n => n.remove());
  return clone.innerText.includes('ProbeFolder');
});
console.log('ProbeFolder after create:', await folderVisible());
await page.screenshot({ path: '/tmp/files-created.png' });

await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })));
await settle(900);
console.log('ProbeFolder after undo:', await folderVisible());
console.log('toast:', await page.evaluate(() => document.body.innerText.match(/Undo[^\n]*/)?.[0] ?? 'none'));
await page.screenshot({ path: '/tmp/files-after-undo.png' });
const probeCount = await page.evaluate(() => document.body.innerText.split('ProbeFolder').length - 1);
console.log('ProbeFolder occurrences after undo:', probeCount);

await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true, bubbles: true })));
await settle(900);
const redoCount = await page.evaluate(() => document.body.innerText.split('ProbeFolder').length - 1);
console.log('ProbeFolder occurrences after redo:', redoCount);
if (redoCount < 2) { console.log('FAIL: folder row did not return after redo'); process.exit(1); }

// --- scenario 2: delete folder -> undo restores it ---
const deleted = await page.evaluate(() => {
  const row = [...document.querySelectorAll('div')].find(
    (e) => e.innerText?.startsWith('ProbeFolder') && e.querySelector('svg')
  );
  // find the folder row container: walk up from the element whose direct text is ProbeFolder
  const nameEl = [...document.querySelectorAll('div, span')].find(
    (e) => e.innerText?.trim() === 'ProbeFolder' && e.children.length === 0
  );
  if (!nameEl) return 'no-name';
  let container = nameEl;
  for (let i = 0; i < 8 && container; i++) {
    if (container.querySelectorAll('svg').length >= 3) break;
    container = container.parentElement;
  }
  if (!container) return 'no-row';
  const svgs = [...container.querySelectorAll('svg')];
  const trash = svgs.at(-1)?.closest('div');
  if (!trash) return 'no-trash';
  trash.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
});
console.log('delete clicked:', deleted);
await settle(800);
// confirm dialog may appear — click Delete/Confirm if so
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('div, button')].filter(
    (e) => ['Delete', 'Confirm', 'Yes'].includes(e.textContent?.trim()) && e.children.length === 0
  )[0];
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
await settle(900);
const afterDelete = await page.evaluate(() => {
  const clone = document.body.cloneNode(true);
  return clone.innerText.split('ProbeFolder').length - 1;
});
console.log('ProbeFolder occurrences after delete:', afterDelete);
await page.screenshot({ path: '/tmp/files-after-delete.png' });
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })));
await settle(900);
const afterUndoDelete = await page.evaluate(() => document.body.innerText.split('ProbeFolder').length - 1);
console.log('ProbeFolder occurrences after undo-delete:', afterUndoDelete);
await page.screenshot({ path: '/tmp/files-after-undo-delete.png' });
await browser.close();
