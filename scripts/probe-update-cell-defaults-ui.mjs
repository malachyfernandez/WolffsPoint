import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: a freshly inserted UpdateCell block defaults to Day-Specific Columns
// with an Inputs.entry("") players picker - currentDay + 1 for the
// "On Certify => Update Cell" block, placedDay for the tag-trigger
// "Update Cell" block. Offline simulator only.
//   node scripts/probe-update-cell-defaults-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const clickText = async (text, last = false) => {
  const element = await page.waitForFunction(
    (target, last) => {
      const nodes = [...document.querySelectorAll('[tabindex],button,div')].filter((node) => {
        if (node.textContent.trim() !== target) return false;
        const box = node.getBoundingClientRect();
        return (
          box.width &&
          box.height &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      });
      return last ? nodes.at(-1) : nodes[0];
    },
    { timeout: 15000 },
    text,
    last
  );
  await element.asElement().click();
  await settle();
};
const clickLeaf = async (text) => {
  const node = await page.waitForFunction(
    (target) =>
      [...document.querySelectorAll('div')].find((node) => {
        const box = node.getBoundingClientRect();
        return (
          !node.children.length &&
          node.textContent.trim() === target &&
          box.width &&
          box.height &&
          node === document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        );
      }),
    { timeout: 15000 },
    text
  );
  await node.asElement().click();
  await settle();
};

// Text of the UpdateCell card that contains the given block title.
const blockText = (title) =>
  page.evaluate((title) => {
    const label = [...document.querySelectorAll('div')].find(
      (n) =>
        n.textContent.trim() === title && n.getBoundingClientRect().width && n.children.length <= 2
    );
    if (!label) return null;
    // Walk up until the ancestor also contains the Column row (the block card).
    let node = label;
    while (node && !node.textContent.includes('Column type')) node = node.parentElement;
    return node?.textContent ?? null;
  }, title);

const hasChip = (text) =>
  page.evaluate(
    (text) =>
      [...document.querySelectorAll('div')].some(
        (n) =>
          n.textContent.trim() === text && n.getBoundingClientRect().width && n.children.length <= 2
      ),
    text
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        main: {
          id: 'main',
          path: 'Main Script',
          kind: 'script',
          role: 'display',
          source: '',
          updatedAt: 1,
        },
        audit: {
          id: 'audit',
          path: 'Audit trigger',
          kind: 'script',
          role: 'trigger',
          source: 'OnTagAdded { }',
          updatedAt: 1,
        },
      },
      folders: [],
    });
    db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
    db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
  });
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1000);
  await page.click('[data-testid="gametab-files"]');
  await settle(1200);

  // --- On Certify => Update Cell (display file)
  await clickLeaf('Main Script');
  await page.waitForFunction(() => document.body.innerText.includes('press to add a block'));
  await clickText('press to add a block');
  await clickText('On Certify => Update Cell');
  await page.waitForFunction(() => document.body.innerText.includes('On Certify => Update Cell'));
  const certifyBlock = await blockText('On Certify => Update Cell');
  assert.ok(certifyBlock, 'certify UpdateCell card not found');
  assert.match(certifyBlock, /Day-Specific Columns/, 'certify block not on day columns');
  assert.match(certifyBlock, /Day index/, 'certify block missing Day index row');
  assert.match(certifyBlock, /currentDay/, 'certify day index missing currentDay');
  assert.match(certifyBlock, /entry/, 'certify players missing Inputs.entry socket');
  assert.equal(await hasChip('Inputs'), true, 'certify players base chip is not Inputs');
  await page.screenshot({ path: '/tmp/probe-update-cell-certify.png' });

  // --- Update Cell (tag trigger file, inside OnTagAdded)
  await page.click('[aria-label="Minimize"]');
  await page.waitForFunction(() => document.body.innerText.includes('Save now?'));
  await clickText('Save');
  await settle(1000);
  await clickLeaf('Audit trigger');
  await page.waitForFunction(() => document.body.innerText.includes('On Tag Added'));
  await clickText('press to add a block', true); // nested inside OnTagAdded
  await clickText('Update Cell');
  await settle(800);
  const triggerBlock = await blockText('Update Cell');
  assert.ok(triggerBlock, 'trigger UpdateCell card not found');
  assert.match(triggerBlock, /Day-Specific Columns/, 'trigger block not on day columns');
  assert.match(triggerBlock, /Day index/, 'trigger block missing Day index row');
  assert.match(triggerBlock, /placedDay/, 'trigger day index missing placedDay');
  assert.doesNotMatch(triggerBlock, /currentDay/, 'trigger day index should not be currentDay+1');
  // placedUser: Inputs isn't a trigger global and would flag the block.
  assert.match(triggerBlock, /placedUser/, 'trigger players missing placedUser chip');
  assert.doesNotMatch(
    triggerBlock,
    /isn't available in trigger files/,
    'trigger block flags its own default players value'
  );
  await page.screenshot({ path: '/tmp/probe-update-cell-trigger.png' });

  console.log('probe-update-cell-defaults-ui: PASS');
} catch (e) {
  await page.screenshot({ path: '/tmp/probe-update-cell-defaults-fail.png' });
  console.error('probe-update-cell-defaults-ui: FAIL', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
