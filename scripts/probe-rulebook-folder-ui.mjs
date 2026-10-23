import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the pinned ruleBook folder appears as "Rule Book" even when the doc
// never lists it, and a file referenced by the modular rule book counts as
// used (no "not used in files or cells" warning).
// Offline simulator only.
//   node scripts/probe-rulebook-folder-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1000 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const bodyHas = (t) => page.evaluate((t) => document.body.innerText.includes(t), t);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(() => {
    const db = window.__simDb;
    // File lives in the ruleBook folder; rulebook references it. NOTE: no
    // explicit 'ruleBook' entry in folders[] - the pinned path must appear
    // on its own like the other reserved roots.
    db.seedVar(db.viewerUserId, 'scriptFiles-SIMOP1234', {
      files: {
        f_test: {
          id: 'f_test',
          path: 'ruleBook/test',
          kind: 'markdown',
          role: 'display',
          source: 'CreateMarkdown({CONTENT = Markdown(`body`)});',
          updatedAt: 1,
        },
      },
      folders: [],
      folderIds: {},
    });
    db.seedVar(db.viewerUserId, 'ruleBook-SIMOP1234', {
      content: '',
      roleOrder: [],
      modularContent: 'File({PATH = "ruleBook/test", ID = "f_test"});',
    });
    const seed = (k, v) => db.seedListItem(db.viewerUserId, k, 'SIMOP1234', v);
    seed('userTable', [
      {
        realName: 'Alice',
        email: 'a@x.com',
        userId: 'u1',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [] },
        days: [],
      },
    ]);
    seed('userTableTitle', { extraUserColumns: [], extraDayColumns: [] });
    seed('roleTable', [{ role: 'Werewolf', roleMessage: '', doesRoleVote: true }]);
    seed('cellModuleVersion', 2);
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-players"]');
  await settle(2500);

  // Files tab: 'Rule Book' folder label + test file without the unused warning.
  await page.evaluate(() => {
    document
      .querySelector('[data-testid="gametab-files"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(() => document.body.innerText.includes('Rule Book'), {
    timeout: 15000,
  });
  await settle(1000);
  await page.screenshot({ path: '/tmp/probe-rulebook-files.png' });
  const fileRow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('body *')].filter(
      (e) => e.textContent?.trim() === 'test'
    );
    const row = rows.at(-1)?.closest('div');
    return row?.parentElement?.innerText ?? '';
  });
  console.log('test row text:', JSON.stringify(fileRow));
  assert.ok(!(await bodyHas('not used in files or cells')), 'rulebook ref should count as used');
  console.log('unused warning cleared');
} finally {
  await browser.close();
}
