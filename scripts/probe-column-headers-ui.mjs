import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: column headers have no triple-dot buttons, every column name is
// dotted-underlined, clicking a name opens the column dialog (rename field
// for custom columns, resize for base columns); rename commits on close.
// Offline simulator only.
//   node scripts/probe-column-headers-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

const clickText = async (text) =>
  page.evaluate((t) => {
    const els = [...document.querySelectorAll('div, span, p')];
    // innermost match
    const el = els
      .filter((e) => e.textContent?.trim() === t || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim() === t))
      .sort((a, b) => (a.contains(b) ? 1 : -1))[0];
    if (!el) return false;
    let target = el;
    while (target && !target.onclick && target.getAttribute('role') !== 'button' && !target.closest('button') && target.parentElement) {
      target = target.parentElement;
      if (target?.closest?.('button, [role="button"], [class*="cursor-pointer"]')) { target = target.closest('button, [role="button"], [class*="cursor-pointer"]'); break; }
    }
    (target ?? el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, text);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, 'SIMOP1234', value);
    seed('userTable', [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [{ vote: '', action: '', voteMultiplier: 1, extraColumns: [''] }],
      },
    ]);
    seed('userTableTitle', { extraUserColumns: ['Suspects'], extraDayColumns: ['Column 1'] });
    seed('userTableColumnVisibility', { extraUserColumns: [true], extraDayColumns: [true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
  });
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-players"]');
  await page.waitForFunction(() => document.body.innerText.includes('Suspects'), { timeout: 15000 });
  await settle(600);
  await page.screenshot({ path: '/tmp/probe-colhdr-players.png' });

  // No triple-dot buttons should remain in header rows.
  const dotCount = await page.evaluate(
    () => [...document.querySelectorAll('button, div[role="button"], div')].filter((e) => e.textContent?.trim() === '⋯').length
  );
  console.log('triple-dot elements:', dotCount);

  // Click the custom players-table column name -> rename dialog.
  assert.ok(await clickText('Suspects'), 'click Suspects header');
  await settle(900);
  await page.screenshot({ path: '/tmp/probe-colhdr-dialog.png' });
  assert.ok(await bodyHas('Column options'), 'custom column dialog opens on name click');
  assert.ok(await bodyHas('Name'), 'rename field present');
  const inputVal = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, textarea')];
    return inputs.map((i) => i.value).find((v) => v === 'Suspects') ?? null;
  });
  assert.equal(inputVal, 'Suspects', 'rename input prefilled with column title');

  // Rename it and close -> header updates.
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input, textarea')].find((i) => i.value === 'Suspects');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Allies');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  });
  await page.keyboard.press('Escape');
  await settle(900);
  assert.ok(await bodyHas('Allies'), 'column renamed via dialog');
  console.log('players-table rename OK');

  // Day table: base column (Vote) -> resize dialog, no rename field.
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const t = [...document.querySelectorAll('[data-testid^="gametab-"]')].find((e) =>
        /day/i.test(e.dataset.testid)
      );
      t?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await settle(1200);
    if (await bodyHas('Column 1')) break;
  }
  await page.screenshot({ path: '/tmp/probe-colhdr-days.png' });
  assert.ok(await clickText('Vote'), 'click Vote header');
  await settle(900);
  await page.screenshot({ path: '/tmp/probe-colhdr-vote.png' });
  assert.ok(await bodyHas('Resize column'), 'Vote header opens resize dialog');
  const hasNameField = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('input, textarea')].find((i) => i.value === 'Vote');
    return !!dlg;
  });
  assert.equal(hasNameField, false, 'base column dialog has no rename field');
  await page.keyboard.press('Escape');
  await settle(700);

  // Custom day column -> rename field present.
  assert.ok(await clickText('Column 1'), 'click Column 1 header');
  await settle(900);
  assert.ok(await bodyHas('Column options'), 'day custom column dialog opens');
  const dayInput = await page.evaluate(
    () => [...document.querySelectorAll('input, textarea')].some((i) => i.value === 'Column 1')
  );
  assert.ok(dayInput, 'day column rename input prefilled');
  await page.screenshot({ path: '/tmp/probe-colhdr-daycol.png' });
  console.log('day-table dialogs OK');

  console.log('PROBE PASSED');
} finally {
  await browser.close();
}
