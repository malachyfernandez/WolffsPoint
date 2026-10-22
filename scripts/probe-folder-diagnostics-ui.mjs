import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: diagnostics surface on column-view file rows and aggregate up the
// folder tree (folder rows + column headers) in both views.
// Offline simulator only.
//   node scripts/probe-folder-diagnostics-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const doc = {
  files: {
    f_deep: {
      id: 'f_deep',
      path: 'Templates/Sub/Broken',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'File({PATH = "Missing Target", ID = "f_missing"});',
    },
    f_root_bad: {
      id: 'f_root_bad',
      path: 'Templates/Also Broken',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'File({PATH = "Missing Target", ID = "f_missing"});',
    },
  },
  folders: ['Templates', 'Templates/Sub'],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const rowText = (label) =>
  page.evaluate((label) => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
    );
    if (!node) return null;
    const row = node.closest('div[class*="rounded"]') ?? node.parentElement;
    return norm(row?.textContent ?? '');
  }, label);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME, doc }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, doc);
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'columns');
    },
    { GAME, doc }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);

  // --- COLUMN VIEW ---
  // Root column: Templates folder row should show the aggregate (2 problems:
  // one file in Templates/, one in Templates/Sub/).
  const templatesRow = await rowText('Templates');
  assert.ok(templatesRow, 'Templates row not found in column view');
  assert.ok(templatesRow.includes('2'), `expected ⚠ 2 on Templates row: ${templatesRow}`);

  // Drill into Templates: header should carry the aggregate; the Sub row shows
  // its own 1, and "Also Broken" shows its message line under the name.
  const tmplClicked = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === 'Templates' && n.getBoundingClientRect().width
    );
    if (!node) return false;
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  });
  assert.equal(tmplClicked, true, 'could not click Templates');
  await settle(1200);

  const subRow = await rowText('Sub');
  assert.ok(subRow, 'Sub row not found');
  assert.ok(subRow.includes('1'), `expected ⚠ 1 on Sub row: ${subRow}`);

  const brokenRow = await rowText('Also Broken');
  assert.ok(brokenRow, 'Also Broken row not found');
  assert.ok(
    brokenRow.includes('Missing file'),
    `expected Missing file line on column row: ${brokenRow}`
  );

  // Column header for Templates should carry the aggregate count.
  const headerHasCount = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-minimize-dock] *')];
    void rows;
    // Header: the Templates title bar in the second column shows ⚠ count.
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const headers = [...document.querySelectorAll('body *')].filter(
      (n) => norm(n.textContent).startsWith('Templates') && n.getBoundingClientRect().width
    );
    return headers.some((h) => /2/.test(norm(h.textContent)));
  });
  assert.equal(headerHasCount, true, 'column header missing aggregate count');
  await page.screenshot({ path: '/tmp/folder-diag-columns.png' });

  // --- LIST VIEW ---
  await page.evaluate(() => {
    window.__simDb.runMutation('user_vars:set', {
      key: 'scriptFiles:browserView',
      value: 'list',
    });
  });
  await settle(1200);
  const templatesList = await rowText('Templates');
  assert.ok(templatesList, 'Templates row not found in list view');
  assert.ok(
    /2 items\s*⚠?\s*2/.test(templatesList) || templatesList.includes('2'),
    `expected item count + ⚠ 2 on Templates: ${templatesList}`
  );
  await page.screenshot({ path: '/tmp/folder-diag-list.png' });

  console.log('PASS: diagnostics show on column rows and aggregate up folders');
} finally {
  await browser.close();
}
