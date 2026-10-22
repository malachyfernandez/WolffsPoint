import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: "place in another file" from a NON-file editor (the vote-message
// cell's file editor — a script island). The split Place button's file
// half must render here too, open the file browser, and hand the move
// session off to a file editor armed in place phase; the island draft is
// cut (undoable) while the destination gets the blocks.
// Offline simulator only.
//   node scripts/probe-island-move-to-file-ui.mjs http://localhost:8084
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
        fa: { id: 'fa', path: 'File A', kind: 'script', source: '', updatedAt: 1 },
        fb: { id: 'fb', path: 'File B', kind: 'script', source: '', updatedAt: 1 },
        dst: {
          id: 'dst',
          path: 'Island dst',
          kind: 'script',
          source: 'CreateMarkdown({ CONTENT = `DST-EXISTING` });',
          updatedAt: 1,
        },
      },
      folders: ['tags'],
    });
    db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
    db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    db.seedListItem(db.viewerUserId, 'roleTable', game, [
      {
        role: 'Infector',
        doesRoleVote: true,
        isVisible: true,
        roleMessage: '',
        aboutRole: '',
        voteMessage: 'File({PATH = "File A", ID = "fa"});\nFile({PATH = "File B", ID = "fb"});',
      },
    ]);
    db.seedListItem(db.viewerUserId, 'userTableTitle', game, {
      extraUserColumns: [],
      extraDayColumns: [],
      extraUserColumnIds: [],
      extraDayColumnIds: [],
    });
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-config"]');
  await settle(1000);
  await page.click('[data-testid="gametab-config"]');
  await settle(2000);
  await page.screenshot({ path: '/tmp/island-move-config.png' });

  // Open the vote-message cell editor (a file-list island). Click the
  // text's coordinates — the cell Pressable is the topmost element, not
  // the leaf itself.
  const cellBox = await page.waitForFunction(
    (target) => {
      const node = [...document.querySelectorAll('div')].find(
        (n) => n.textContent.trim() === target && n.getBoundingClientRect().width
      );
      if (!node) return null;
      const b = node.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    },
    { timeout: 15000 },
    'File A, File B'
  );
  const { x, y } = await cellBox.jsonValue();
  await page.mouse.click(x, y);
  await settle(1500);
  // The vote cell opens Vote Settings first; continue into the editor.
  await clickText('Edit Vote Message');
  await settle(1500);
  await page.screenshot({ path: '/tmp/island-move-editor.png' });

  // Move session: shelf the File B block.
  await clickText('Move');
  const block = await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-move-kind="block"]')].find((node) =>
        node.textContent.includes('File B')
      ),
    { timeout: 15000 }
  );
  await block.asElement().click();
  await page.waitForFunction(() => document.body.innerText.includes('Moving blocks'));

  // The file-icon half must render here too (script island).
  await page.waitForSelector('[data-testid="place-in-other-file"]');
  await page.click('[data-testid="place-in-other-file"]');
  await settle(800);
  // The browser opens scoped to the cell's pinned folder — go up to Files.
  await clickLeaf('Files');
  await settle(500);
  await clickLeaf('Island dst');
  await settle(1500);
  await page.screenshot({ path: '/tmp/island-move-armed.png' });

  // A file editor opened for the destination, armed in place phase.
  assert.equal(await bodyHas('DST-EXISTING'), true, 'destination canvas should render');
  assert.equal(await bodyHas('Choose a green target'), true, 'place phase hint expected');
  assert.equal(await bodyHas('Moving blocks'), true, 'shelf should show handed-off selections');

  // Place at the first green target, then save.
  const target = await page.waitForSelector('.border-green-800');
  await target.click();
  await settle(800);
  await clickText('Done');
  await settle(1000);
  const dstSource = await scriptFile('dst');
  assert.ok(
    dstSource.includes('File B') && dstSource.includes('DST-EXISTING'),
    `destination should gain the moved File block, got: ${dstSource}`
  );

  console.log('PASS: island move hands off to a file editor and places');
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error('FAIL:', error.message);
  try {
    await page.screenshot({ path: '/tmp/island-move-fail.png' });
    console.log('screenshot -> /tmp/island-move-fail.png');
  } catch {}
  await browser.close();
  process.exit(1);
}
