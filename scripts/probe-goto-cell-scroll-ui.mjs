import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: "go to cell" from a Files placement chip must scroll the target cell
// into view WITHOUT shifting the page. Plain scrollIntoView walks every
// ancestor scroller and drags outer containers sideways when the table
// overflows horizontally; the bounded scroller caps horizontal movement at
// the nearest (table) scroller.
// Offline simulator only.
//   node scripts/probe-goto-cell-scroll-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

// Narrow viewport + many day columns so the players table overflows sideways.
const browser = await launch({ headless: true, defaultViewport: { width: 900, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, {
        files: {
          f_inf: {
            id: 'f_inf',
            path: 'Test/Infectors',
            kind: 'markdown',
            source: 'CreateMarkdown({CONTENT = Markdown(`Infectors body`)});',
            updatedAt: 1,
          },
        },
        folders: ['Test'],
      });
      const cell = 'File({PATH = "Test/Infectors", ID = "f_inf"});';
      const seed = (key, value) => db.seedListItem(db.viewerUserId, key, GAME, value);
      // The File cell sits in the LAST of 8 day columns -> far right.
      const extra = ['', '', '', '', '', '', '', cell];
      seed('userTable', [
        {
          realName: 'Alice',
          email: 'alice@example.com',
          userId: 'test-Alice',
          role: '',
          playerData: { livingState: 'alive', extraColumns: [''] },
          days: [{ vote: '', action: '', voteMultiplier: 1, extraColumns: extra }],
        },
      ]);
      seed('userTableTitle', {
        extraUserColumns: ['Status'],
        extraDayColumns: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'FarNotes'],
        extraDayColumnTypes: ['tags', 'tags', 'tags', 'tags', 'tags', 'tags', 'tags', 'files'],
      });
      seed('userTableColumnVisibility', {
        extraUserColumns: [true],
        extraDayColumns: [true, true, true, true, true, true, true, true],
      });
      seed('dayDatesArray', ['10/17/2026']);
      seed('selectedDayIndex', 0);
      seed('cellModuleVersion', 1);
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
    },
    { GAME }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1200);

  const rootLeft = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-testid="gametab-files"]');
      return el ? el.getBoundingClientRect().left : null;
    });

  // Files tab: expand Test, then click the Infectors row's cell chip
  // ("Alice · FarNotes · day 1" -> cellKind tableCell).
  await page.click('[data-testid="gametab-files"]');
  await settle(1200);
  const open = (label) =>
    page.evaluate((label) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const node = [...document.querySelectorAll('body *')].find(
        (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
      );
      if (!node) return false;
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    }, label);
  assert.equal(await open('Test'), true, 'Test folder not found');
  await settle(800);
  assert.equal(await open('Infectors'), true, 'Infectors row not found');
  await settle(800);

  const before = await rootLeft();
  // The cell chip is labelled "Go to <cell>".
  const chip = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[aria-label^="Go to "]')].find(
      (n) => n.getBoundingClientRect().width
    );
    if (!el) return null;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return el.getAttribute('aria-label');
  });
  assert.ok(chip, 'cell placement chip not found on Infectors row');
  await settle(2500); // tab switch + both scroll passes (200ms/700ms) settle

  const after = await rootLeft();
  const winX = await page.evaluate(() => window.scrollX + document.documentElement.scrollLeft);
  assert.equal(
    Math.abs((after ?? 0) - (before ?? 0)) < 2 && winX === 0,
    true,
    `page shifted horizontally: tab moved ${before} -> ${after}, scrollX=${winX}`
  );

  // The target cell should actually be visible now (highlight landed).
  const cellVisible = await page.evaluate(() =>
    [...document.querySelectorAll('body *')].some(
      (n) => n.textContent.trim() === 'Infectors' && n.getBoundingClientRect().width
    )
  );
  assert.equal(cellVisible, true, 'target cell not scrolled into view');
  await page.screenshot({ path: '/tmp/probe-goto-cell.png' });

  console.log('PASS: go-to-cell scrolls the cell into view without shifting the page');
} finally {
  await browser.close();
}
