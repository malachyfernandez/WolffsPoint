import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the UpdateCell column dropdown offers a "New Column" footer that
// creates a real players-table column (titles + ids + types, empty cells on
// every row, visibility on, day sizes) and selects it — for both the
// day-specific and all-game column scopes.
// Offline simulator only.
//   node scripts/probe-new-column-ui.mjs http://localhost:8084
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

const listItem = (key) =>
  page.evaluate(
    (key) => window.__simDb.runQuery('user_lists:get', { key, itemId: 'SIMOP1234' })?.value,
    key
  );
const userVar = (key) =>
  page.evaluate((key) => window.__simDb.runQuery('user_vars:get', { key })?.value, key);
const titles = () => listItem('userTableTitle');

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    const trigger =
      'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = placedDay, COLUMN = "morningMessage"}) { Add tag("infected"); } }';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        audit: {
          id: 'audit',
          path: 'Audit trigger',
          kind: 'script',
          role: 'trigger',
          source: trigger,
          updatedAt: 1,
        },
        certify: {
          id: 'certify',
          path: 'Certify script',
          kind: 'script',
          source:
            'UpdateCell({PLAYERS = "Alice", COLUMNTYPE = "user", COLUMN = "livingState"}) { }',
          updatedAt: 1,
        },
      },
      folders: ['tags'],
    });
    db.seedVar(db.viewerUserId, `tagDefinitions-${game}`, [{ name: 'infected', color: 'Red' }]);
    db.seedVar(db.viewerUserId, `tagTriggers-${game}`, { infected: trigger });
    db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
    db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    db.seedListItem(db.viewerUserId, 'userTableTitle', game, {
      extraUserColumns: ['Notes'],
      extraDayColumns: ['Tag'],
      extraUserColumnIds: ['col_user_notes'],
      extraDayColumnIds: ['col_day_tag'],
    });
    db.seedListItem(db.viewerUserId, 'userTableColumnVisibility', game, {
      extraUserColumns: [true],
      extraDayColumns: [true],
    });
    db.seedListItem(db.viewerUserId, 'userTable', game, [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: ['note-a'] },
        days: [
          { vote: '', action: '', voteMultiplier: 1, extraColumns: ['tag-a'] },
          { vote: '', action: '', voteMultiplier: 1, extraColumns: ['tag-b'] },
        ],
      },
    ]);
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1000);
  await page.click('[data-testid="gametab-files"]');
  await settle(1200);
  await clickLeaf('Audit trigger');
  await page.waitForFunction(() => document.body.innerText.includes('Update Cell'));

  // --- day scope: open the Column dropdown, use the New Column footer.
  await clickText('morningMessage');
  await clickText('New Column');
  let field = await page.waitForSelector('input[placeholder="Column name..."]');
  await field.click();
  await page.keyboard.type('Suspicion');

  // Unsaved-changes guard: Cancel with a draft asks first; Discard closes.
  await clickText('Cancel');
  await clickText('Discard');
  await page.waitForFunction(() => !document.querySelector('input[placeholder="Column name..."]'));

  await clickText('morningMessage');
  await clickText('New Column');
  field = await page.waitForSelector('input[placeholder="Column name..."]');
  await field.click();
  await page.keyboard.type('Suspicion');
  // Leave the default 'tags' content type.
  await clickText('Create');
  await settle(800);

  await page.waitForFunction(() => {
    const titles = window.__simDb.runQuery('user_lists:get', {
      key: 'userTableTitle',
      itemId: 'SIMOP1234',
    })?.value;
    return titles?.extraDayColumns?.includes('Suspicion');
  });
  let t = await titles();
  assert.deepEqual(t.extraDayColumns, ['Tag', 'Suspicion']);
  assert.equal(t.extraDayColumnIds?.length, 2, 'day column id appended');
  assert.deepEqual(
    t.extraDayColumnTypes,
    ['tags', 'tags'],
    'types materialized to match column count'
  );
  const vis = await listItem('userTableColumnVisibility');
  assert.deepEqual(vis.extraDayColumns, [true, true], 'visibility appended');
  const users = await listItem('userTable');
  assert.ok(
    users[0].days.every((d) => d.extraColumns.length === 2 && d.extraColumns[1] === ''),
    'empty day cell appended on every row'
  );
  assert.deepEqual(
    users[0].days.slice(0, 2).map((d) => d.extraColumns[0]),
    ['tag-a', 'tag-b'],
    'existing day cells preserved'
  );
  const sizes = await userVar('playerPageColumnSizes-SIMOP1234');
  assert.equal(
    sizes?.dayExtraColumns?.length ?? 0,
    2,
    'day column size appended (one per extra day column)'
  );

  // Dropdown selects the new column.
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Suspicion')),
    true,
    'new column not selected in the dropdown'
  );

  // --- user scope: switch Column type, create an all-game files column.
  await clickText('Day-Specific Columns');
  await clickText('All-Game Columns');
  await settle(400);
  // The column value resets/opens a fresh dropdown; click the Column field.
  const colField = await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('[aria-label]')].filter(
      (n) => n.getAttribute('aria-label') === 'Select' && n.getBoundingClientRect().width
    );
    return nodes.at(-1) ?? null;
  });
  await colField.asElement().click();
  await settle(500);
  await clickText('New Column');
  const field2 = await page.waitForSelector('input[placeholder="Column name..."]');
  await field2.click();
  await page.keyboard.type('Dossier');
  await clickText('files');
  await clickText('Create');
  await settle(800);

  await page.waitForFunction(() => {
    const titles = window.__simDb.runQuery('user_lists:get', {
      key: 'userTableTitle',
      itemId: 'SIMOP1234',
    })?.value;
    return titles?.extraUserColumns?.includes('Dossier');
  });
  t = await titles();
  assert.deepEqual(t.extraUserColumns, ['Notes', 'Dossier']);
  assert.equal(t.extraUserColumnIds?.length, 2, 'user column id appended');
  assert.deepEqual(t.extraUserColumnTypes, ['tags', 'files'], 'chosen files type stored');
  const users2 = await listItem('userTable');
  assert.equal(users2[0].playerData.extraColumns[0], 'note-a', 'existing player cell preserved');
  assert.equal(users2[0].playerData.extraColumns.at(-1), '', 'empty player cell appended');
  const vis2 = await listItem('userTableColumnVisibility');
  assert.deepEqual(vis2.extraUserColumns, [true, true], 'user visibility appended');

  // --- non-trigger file: "On Certify => Update Cell" gets the same footer.
  await page.click('[aria-label="Minimize"]');
  // Dirty buffer requires a save before minimizing.
  await page.waitForFunction(() => document.body.innerText.includes('Save now?'));
  await clickText('Save');
  await settle(1000);
  await clickLeaf('Certify script');
  await page.waitForFunction(() => document.body.innerText.includes('On Certify => Update Cell'));
  await clickText('livingState');
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll('div')].some(
        (n) => n.textContent.trim() === 'New Column' && n.getBoundingClientRect().width
      )
    ),
    true,
    'New Column footer missing in the On Certify (non-trigger) UpdateCell'
  );

  await page.screenshot({ path: '/tmp/probe-new-column.png' });
  console.log('probe-new-column-ui: PASS');
} catch (e) {
  await page.screenshot({ path: '/tmp/probe-new-column-fail.png' });
  console.error('probe-new-column-ui: FAIL', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
