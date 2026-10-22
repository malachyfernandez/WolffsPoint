import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the move/clone collect phase offers a split Place button whose
// file-icon half opens a script-only file browser; picking another file
// switches the editor WITHOUT cutting the source — the removal is saved
// only once the placed destination draft is saved.
// Offline simulator only.
//   node scripts/probe-move-to-file-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const clickText = async (text) => {
  const element = await page.waitForFunction(
    (target) =>
      [...document.querySelectorAll('[tabindex],button,div')].find((node) => {
        if (node.textContent.trim() !== target) return false;
        const box = node.getBoundingClientRect();
        return (
          box.width &&
          box.height &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      }),
    { timeout: 15000 },
    text
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
const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);
const scriptFile = (id) =>
  page.evaluate(
    ({ key, id }) => window.__simDb.runQuery('user_vars:get', { key })?.value?.files?.[id]?.source,
    { key: `scriptFiles-${GAME}`, id }
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        src: {
          id: 'src',
          path: 'Move src',
          kind: 'script',
          source:
            'CreateMarkdown({ CONTENT = `KEEP-STATEMENT` });\nCreateMarkdown({ CONTENT = `MOVED-CONTENT` });',
          updatedAt: 1,
        },
        dst: {
          id: 'dst',
          path: 'Move dst',
          kind: 'script',
          source: 'CreateMarkdown({ CONTENT = `DEST-EXISTING` });',
          updatedAt: 1,
        },
        notes: {
          id: 'notes',
          path: 'Notes markdown',
          kind: 'markdown',
          source: 'CreateMarkdown({ CONTENT = `JUST-NOTES` });',
          updatedAt: 1,
        },
      },
      folders: ['tags'],
    });
    db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
    db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    db.seedListItem(db.viewerUserId, 'userTableTitle', game, {
      extraUserColumns: [],
      extraDayColumns: [],
      extraUserColumnIds: [],
      extraDayColumnIds: [],
    });
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1000);
  await page.click('[data-testid="gametab-files"]');
  await settle(1200);
  await clickLeaf('Move src');
  await page.waitForFunction(() => document.body.innerText.includes('MOVED-CONTENT'));

  // Start a move session and shelf the second block.
  await clickText('Move');
  const blocks = await page.$$('[data-move-kind="block"]');
  assert.ok(blocks.length >= 2, 'expected at least two pickable blocks');
  await blocks[1].click();
  await page.waitForFunction(() => document.body.innerText.includes('Moving blocks'));

  // Split Place button: left half places in this file, right half (file
  // icon) opens the browser.
  await page.waitForSelector('[data-testid="place-in-other-file"]');
  await page.click('[data-testid="place-in-other-file"]');
  await settle(800);
  // The pick browser only offers script files — markdown files can't hold
  // moved blocks, so "Notes markdown" must not be listed. Scope to the
  // dialog: the Files page behind it still lists every file.
  const browserText = await page.evaluate(() => {
    const header = [...document.querySelectorAll('div')].find(
      (node) => node.textContent.trim() === 'Choose a file'
    );
    const dialog = header?.closest('[role="dialog"]') ?? header?.parentElement?.parentElement;
    return dialog?.innerText ?? '';
  });
  assert.equal(
    browserText.includes('Notes markdown'),
    false,
    `pick browser must hide non-script files, got: ${browserText}`
  );
  assert.equal(browserText.includes('New Markdown'), false, 'markdown creation should hide too');
  await clickLeaf('Move dst');
  await settle(1500);

  // Deferred save: the source file still holds the moved block on disk —
  // the removal is only written once the placed destination draft saves.
  const srcSource = await scriptFile('src');
  assert.ok(
    srcSource.includes('MOVED-CONTENT'),
    `source should keep the moved block until placement saves, got: ${srcSource}`
  );

  // Destination file is open, session armed in place phase.
  assert.equal(await bodyHas('DEST-EXISTING'), true, 'destination canvas should render');
  assert.equal(await bodyHas('Choose a green target'), true, 'place phase hint expected');
  assert.equal(await bodyHas('Moving blocks'), true, 'shelf should still show selections');

  // Click the first green place target (top boundary of the file).
  const target = await page.waitForSelector('.border-green-800');
  await target.click();
  await settle(800);
  assert.equal(await bodyHas('MOVED-CONTENT'), true, 'placed block should render');

  // Placing alone must not cut the source yet — saving the destination does.
  const srcBeforeSave = await scriptFile('src');
  assert.ok(
    srcBeforeSave.includes('MOVED-CONTENT'),
    `source should still hold the block until the destination saves, got: ${srcBeforeSave}`
  );

  // Done saves the destination file, then the source removal.
  await clickText('Done');
  await settle(800);
  const dstSource = await scriptFile('dst');
  assert.ok(
    dstSource.includes('MOVED-CONTENT') && dstSource.includes('DEST-EXISTING'),
    `destination should gain the moved block, got: ${dstSource}`
  );
  const srcAfterSave = await scriptFile('src');
  assert.ok(
    !srcAfterSave.includes('MOVED-CONTENT') && srcAfterSave.includes('KEEP-STATEMENT'),
    `source should lose the moved block after the destination saved, got: ${srcAfterSave}`
  );

  // --- Round two: backing out of a foreign session never writes anything —
  // the source file was never cut, so nothing needs restoring on disk.
  await clickLeaf('Move dst');
  await page.waitForFunction(() => document.body.innerText.includes('MOVED-CONTENT'));
  await clickText('Move');
  const movedHandle = await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-move-kind="block"]')].find((node) =>
        node.textContent.includes('MOVED-CONTENT')
      ),
    { timeout: 15000 }
  );
  await movedHandle.asElement().click();
  await page.waitForFunction(() => document.body.innerText.includes('Moving blocks'));
  await page.waitForSelector('[data-testid="place-in-other-file"]');
  await page.click('[data-testid="place-in-other-file"]');
  await settle(800);
  await clickLeaf('Move src');
  await settle(1500);

  // Placing in src now; dst still holds the block on disk (deferred cut).
  const dstSource2 = await scriptFile('dst');
  assert.ok(
    dstSource2.includes('MOVED-CONTENT'),
    `dst should keep the moved block until the move lands, got: ${dstSource2}`
  );
  assert.equal(await bodyHas('Choose a green target'), true, 'place phase hint expected');

  // "Back to Move" navigates home — no restore write needed: the source
  // file on disk was never cut, so it still holds the block.
  await clickText('Back to Move');
  await settle(1500);
  const dstSource3 = await scriptFile('dst');
  assert.ok(
    dstSource3.includes('MOVED-CONTENT'),
    `dst should still hold the block — nothing was ever cut, got: ${dstSource3}`
  );
  assert.equal(await bodyHas('DEST-EXISTING'), true, 'should be back in the source file');
  assert.equal(await bodyHas('Moving blocks'), true, 'session should resume in collect');
  await clickText('Cancel');
  await settle(400);

  console.log('PASS: move-to-other-file defers the source cut until the destination saves');
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error('FAIL:', error.message);
  try {
    await page.screenshot({ path: '/tmp/move-to-file-fail.png' });
    console.log('screenshot -> /tmp/move-to-file-fail.png');
  } catch {}
  await browser.close();
  process.exit(1);
}
