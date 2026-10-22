import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: file-usage chips show every chain; file callers that never reach a
// cell carry a ⚠ dead-chain badge (click -> brief explanation). Files with
// zero placements get "not used in files or cells" + yellow ⚠, which also
// aggregates into folder badges like red diagnostics. Dead chains do NOT
// count toward the folder badge.
// Offline simulator only.
//   node scripts/probe-dead-chains-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';
const WARN = '#8a5f00';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const rowOf = (label) =>
  page.evaluate(
    (label, WARN) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const node = [...document.querySelectorAll('body *')].find(
        (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
      );
      if (!node) return null;
      const row = node.closest('div[class*="rounded"]') ?? node.parentElement;
      return {
        text: norm(row?.textContent ?? ''),
        warns: [...row.querySelectorAll('svg')].filter(
          (s) =>
            s.getAttribute('color') === WARN ||
            s.getAttribute('stroke') === WARN ||
            s.style.color === WARN
        ).length,
      };
    },
    label,
    WARN
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, {
        files: {
          f_used: {
            id: 'f_used',
            path: 'Live/UsedByCell',
            kind: 'script',
            role: 'display',
            updatedAt: 1,
            source: 'CreateMarkdown({CONTENT = Markdown(`used`)});',
          },
          // Inner is referenced only by Outer; Outer is referenced by nothing,
          // so Inner's chain is dead but it still has a (file) placement.
          f_inner: {
            id: 'f_inner',
            path: 'Dead/Inner',
            kind: 'script',
            role: 'display',
            updatedAt: 1,
            source: 'CreateMarkdown({CONTENT = Markdown(`inner`)});',
          },
          f_outer: {
            id: 'f_outer',
            path: 'Dead/Outer',
            kind: 'script',
            role: 'display',
            updatedAt: 1,
            source: 'File({PATH = "Dead/Inner", ID = "f_inner"});',
          },
          f_lonely: {
            id: 'f_lonely',
            path: 'Dead/Lonely',
            kind: 'script',
            role: 'display',
            updatedAt: 1,
            source: 'CreateMarkdown({CONTENT = Markdown(`alone`)});',
          },
        },
        folders: ['Live', 'Dead'],
      });
      // A real cell consumes UsedByCell -> live chain.
      db.seedListItem(
        db.viewerUserId,
        'voteMessageDefault',
        GAME,
        'File({PATH = "Live/UsedByCell", ID = "f_used"});'
      );
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'second');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'columns');
    },
    { GAME }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);

  // Root column: Dead folder aggregates Outer + Lonely = 2 warnings. Inner's
  // dead chain does NOT count. Live has no warnings.
  const dead = await rowOf('Dead');
  assert.ok(dead, 'Dead folder row not found');
  assert.equal(dead.warns, 1, `expected 1 yellow ⚠ on Dead row: ${dead.text}`);
  assert.ok(dead.text.includes('2'), `expected warn count 2 on Dead: ${dead.text}`);
  const live = await rowOf('Live');
  assert.ok(live, 'Live folder row not found');
  assert.equal(live.warns, 0, `Live should have no warnings: ${live.text}`);

  // Open the Dead column: Outer/Lonely show "not used in files or cells".
  await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === 'Dead' && n.getBoundingClientRect().width
    );
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await settle(1200);

  const outer = await rowOf('Outer');
  assert.ok(
    outer && outer.text.includes('not used in files or cells'),
    `Outer should be unused: ${outer?.text}`
  );
  const lonely = await rowOf('Lonely');
  assert.ok(
    lonely && lonely.text.includes('not used in files or cells'),
    `Lonely should be unused: ${lonely?.text}`
  );

  // Click Inner -> preview column shows the "Outer" caller chip with a ⚠.
  await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === 'Inner' && n.getBoundingClientRect().width
    );
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await settle(1200);
  assert.ok(await rowOf('Used in'), 'preview column must show Used in for Inner');
  const badge = await page.$('[aria-label="Why is this chain unused?"]');
  assert.ok(badge, 'dead-chain ⚠ badge missing on the Outer caller chip');
  await badge.click();
  await settle(800);
  const explain = await page.evaluate(() => document.body.innerText);
  assert.ok(explain.includes('Chain goes nowhere'), 'explanation dialog did not open');
  assert.ok(
    explain.includes('isn') && explain.includes('used in any cell'),
    `explanation text wrong: ${explain.slice(0, 400)}`
  );
  await page.screenshot({ path: '/tmp/probe-dead-chains.png' });

  console.log('PASS: dead chains flagged on chips, unused files/folders carry yellow warnings');
} finally {
  await browser.close();
}
