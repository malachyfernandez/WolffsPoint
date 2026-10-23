import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: cell previews render file references as chips (icon + name), folders
// and nav buttons as chips, dividers as literal vertical lines; the rule book
// config card uses the same chip row with a right-edge fade.
// Offline simulator only.
//   node scripts/probe-cell-chips-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        f_inf: {
          id: 'f_inf',
          path: 'Test/Infectors',
          kind: 'markdown',
          role: 'display',
          source: 'CreateMarkdown({CONTENT = Markdown(`Infectors body`)});',
          updatedAt: 1,
        },
        f_vote: {
          id: 'f_vote',
          path: 'voteScript',
          kind: 'script',
          role: 'display',
          source: 'CreateMarkdown({CONTENT = Markdown(`Vote`)});',
          updatedAt: 1,
        },
        f_trig: {
          id: 'f_trig',
          path: 'onTag',
          kind: 'script',
          role: 'trigger',
          source: 'Return nothing;',
          updatedAt: 1,
        },
      },
      folders: ['Test'],
      folderIds: { folder_test: 'Test' },
    });
    // Composition cell: file + folder + divider + nav + another file.
    const composition = [
      'File({PATH = "Test/Infectors", ID = "f_inf"});',
      'Folder({PATH = "Test", ID = "folder_test"});',
      'CreateDivider({});',
      'NavButton({LABEL = "Role Descriptions"}) { File({PATH = "voteScript", ID = "f_vote"}); }',
      'File({PATH = "onTag", ID = "f_trig"});',
    ].join('\n');
    // Legacy file-list cell.
    const fileList = 'File({PATH = "Test/Infectors", ID = "f_inf"}); File({PATH = "voteScript", ID = "f_vote"});';
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [{ vote: '', action: '', voteMultiplier: 1, extraColumns: [composition, fileList] }],
      },
    ]);
    seed('userTableTitle', {
      extraUserColumns: [],
      extraDayColumns: ['Mix', 'List'],
      extraDayColumnTypes: ['files', 'files'],
    });
    seed('userTableColumnVisibility', { extraUserColumns: [], extraDayColumns: [true, true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
    seed('cellModuleVersion', 2);
    db.seedVar(db.viewerUserId, `ruleBook-${game}`, {
      content: '',
      roleOrder: [],
      modularContent: composition,
    });
  });
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-players"]');
  // Chips appear once the files index hydrates - wait for the labels.
  await page.waitForFunction(() => document.body.innerText.includes('Role Descriptions'), {
    timeout: 15000,
  });
  await page.screenshot({ path: '/tmp/probe-cell-chips-table.png', fullPage: false });
  assert.ok(await bodyHas('Infectors'), 'file chip label should render');
  assert.ok(await bodyHas('Role Descriptions'), 'nav chip label should render');

  // Config -> rule book card chips.
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const t = document.querySelector('[data-testid="gametab-rulebook"]');
      t?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await settle(1200);
    if (await bodyHas('Rule book')) break;
  }
  await page.screenshot({ path: '/tmp/probe-cell-chips-config.png', fullPage: false });
  assert.ok(await bodyHas('Rule book'), 'rule book card should render');
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll('.rounded-full')].some(
        (e) => e.innerText?.trim() === 'Infectors'
      )
    ),
    'rule book card should render file chips'
  );
  console.log('cell-chips probe passed');
} finally {
  await browser.close();
}
