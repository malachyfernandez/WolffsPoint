import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: hosted file editors minimize into the global minimize row, survive
// tab switches, restore on card click, and stack for multiple files.
// Offline simulator only.
//   node scripts/probe-file-editor-minimize-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const doc = {
  files: {
    f_one: {
      id: 'f_one',
      path: 'Min One',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'Return players;',
    },
    f_two: {
      id: 'f_two',
      path: 'Min Two',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'Return users;',
    },
  },
  folders: [],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const clickText = (label) =>
  page.evaluate((label) => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
    );
    if (!node) return false;
    const r = node.getBoundingClientRect();
    node.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      })
    );
    return true;
  }, label);

const dockText = () =>
  page.evaluate(() => document.querySelector('[data-minimize-dock]')?.textContent ?? null);

const editorVisible = () =>
  page.evaluate(() => {
    // The file editor dialog renders a CloseButton (aria-label Close) plus a
    // file path chip; detect an open dialog by its minimize button.
    return !!document.querySelector('[aria-label="Minimize"]');
  });

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME, doc }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, doc);
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    },
    { GAME, doc }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);

  // Open file one via the host.
  assert.equal(await clickText('Min One'), true, 'Min One row not found');
  await settle(1200);
  assert.equal(await editorVisible(), true, 'file editor did not open');

  // Minimize -> dialog hides, dock gets a card.
  await page.click('[aria-label="Minimize"]');
  await settle(1200);
  assert.equal(await editorVisible(), false, 'editor still visible after minimize');
  const dock1 = await dockText();
  assert.ok(dock1 && dock1.includes('Min One'), `expected card for Min One, dock: ${dock1}`);
  await page.screenshot({ path: '/tmp/host-minimized.png' });

  // Switch tabs: card persists, editor stays hidden.
  await page.click('[data-testid="gametab-config"]');
  await settle(1000);
  assert.equal(await editorVisible(), false, 'editor resurfaced on tab switch');
  const dock2 = await dockText();
  assert.ok(dock2 && dock2.includes('Min One'), 'card lost across tab switch');

  // Open a second file -> second hosted entry stacks (still on another tab).
  await page.click('[data-testid="gametab-files"]');
  await settle(1200);
  assert.equal(await clickText('Min Two'), true, 'Min Two row not found');
  await settle(1200);
  assert.equal(await editorVisible(), true, 'second editor did not open');
  // Minimize it too: two cards.
  await page.click('[aria-label="Minimize"]');
  await settle(1200);
  const dock3 = await dockText();
  assert.ok(
    dock3 && dock3.includes('Min One') && dock3.includes('Min Two'),
    `expected two cards, dock: ${dock3}`
  );

  // Restore the first card by clicking its title inside the dock.
  const restored = await page.evaluate(() => {
    const dock = document.querySelector('[data-minimize-dock]');
    const node = [...dock.querySelectorAll('*')].find(
      (n) => n.textContent?.trim() === 'Min One' && n.getBoundingClientRect().width
    );
    if (!node) return false;
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  });
  assert.equal(restored, true, 'Min One card title not clickable');
  await settle(1200);
  assert.equal(await editorVisible(), true, 'editor did not restore');
  const dock4 = await dockText();
  assert.ok(
    dock4 && !dock4.includes('Min One') && dock4.includes('Min Two'),
    `expected only Min Two left, dock: ${dock4}`
  );
  await page.screenshot({ path: '/tmp/host-restored.png' });

  console.log('PASS: hosted file editors minimize, survive tabs, stack, and restore');
} finally {
  await browser.close();
}
