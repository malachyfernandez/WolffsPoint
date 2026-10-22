import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: cross-file diagnostics surface on file rows. Seeds a caller file
// referencing a target, verifies no badge, then deletes the target from the
// doc and asserts a "Missing file" warning appears on the caller's row.
// Offline simulator only.
//   node scripts/probe-file-diagnostics-ui.mjs http://localhost:8081
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const docWithTarget = {
  files: {
    f_caller: {
      id: 'f_caller',
      path: 'Diag Caller',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'File({PATH = "Diag Target", ID = "f_target"});',
    },
    f_target: {
      id: 'f_target',
      path: 'Diag Target',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'Return players;',
    },
  },
  folders: [],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const fileRowHasBadge = async (label, part) =>
  page.evaluate(
    ({ label, part }) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const nameNode = [...document.querySelectorAll('body *')].find(
        (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
      );
      if (!nameNode) return { found: false };
      const row = nameNode.closest('div[class*="rounded-xl"]') ?? nameNode.parentElement;
      return { found: true, text: norm(row?.textContent ?? ''), has: norm(row?.textContent ?? '').includes(part) };
    },
    { label, part }
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');

  // Seed the doc WITH the target present -> no diagnostics expected.
  await page.evaluate(
    ({ GAME, doc }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, doc);
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    },
    { GAME, doc: docWithTarget }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);

  let res = await fileRowHasBadge('Diag Caller', 'Missing file');
  assert.equal(res.found, true, `Diag Caller row not found: ${JSON.stringify(res)}`);
  assert.equal(res.has, false, `badge before delete: ${res.text}`);

  // Delete the target via a real mutation (seedVar skips revalidation) ->
  // the caller must flag the dangling reference.
  await page.evaluate(
    ({ GAME, doc }) => {
      const next = JSON.parse(JSON.stringify(doc));
      delete next.files.f_target;
      window.__simDb.runMutation('user_vars:set', {
        key: `scriptFiles-${GAME}`,
        value: next,
      });
    },
    { GAME, doc: docWithTarget }
  );
  await settle(1200);

  res = await fileRowHasBadge('Diag Caller', 'Missing file');
  assert.equal(res.found, true, 'Diag Caller row not found after delete');
  assert.equal(res.has, true, `expected Missing file badge, row text: ${res.text}`);
  console.log('ROW TEXT:', res.text);
  await page.screenshot({ path: '/tmp/file-diagnostics-badge.png' });
  console.log('PASS: deleting a file flags its callers in the file browser');
} finally {
  await browser.close();
}
