import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Deleting a tag file must remove the tag from every cell containing it:
// the useFileInputCleanup watcher detects the index diff and appends REM
// tombstones (tracked writes) to userTable / morning / role cells.

const browser = await launch({ headless: true, defaultViewport: { width: 1400, height: 1100 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  await page.goto(process.argv[2] ?? 'http://localhost:8084', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  assert.equal(
    await page.evaluate(() => !!window.__simDb),
    true,
    'Refusing writes outside the offline simulator'
  );

  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    const tagSource = 'Tag({NAME = "Infector", COLOR = "Red"})';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        tag1: {
          id: 'tag1',
          path: 'tags/Infector',
          kind: 'script',
          role: 'trigger',
          source: tagSource,
          updatedAt: 1,
        },
        tag2: {
          id: 'tag2',
          path: 'tags/Doctor',
          kind: 'script',
          role: 'trigger',
          source: 'Tag({NAME = "Doctor", COLOR = "Green"})',
          updatedAt: 1,
        },
        plain: {
          id: 'plain',
          path: 'notes/Script',
          kind: 'script',
          source: 'Variable({NAME = "x"})',
          updatedAt: 1,
        },
        other1: {
          id: 'other1',
          path: 'Alpha',
          kind: 'script',
          source: 'Variable({NAME = "a"})',
          updatedAt: 1,
        },
        other2: {
          id: 'other2',
          path: 'Beta',
          kind: 'script',
          source: 'Variable({NAME = "b"})',
          updatedAt: 1,
        },
      },
      folders: ['tags', 'notes'],
    });
    const users = [
      {
        id: 'player',
        userId: 'player-user',
        email: 'alice@example.com',
        realName: 'Alice',
        role: 'Role',
        playerData: {
          livingState: 'alive',
          extraColumns: [
            '[/TAG id="tag1" name="Infector" src="manual"/][/TAG id="tag2" name="Doctor" src="manual"/]',
            '[/TAG: "Infector"/]',
          ],
        },
        days: [{ id: 'day', extraColumns: ['[/TAG id="tag1" name="Infector" src="certify:d0"/]'] }],
      },
    ];
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', users);
    seed('userTableTitle', {
      extraUserColumns: ['Tags', 'Legacy'],
      extraUserColumnTypes: ['tags', 'tags'],
      extraUserColumnIds: ['user-tags', 'user-legacy'],
      extraDayColumns: ['Tags'],
      extraDayColumnTypes: ['tags'],
      extraDayColumnIds: ['day-tags'],
      dayIds: ['day'],
    });
    seed('roleTable', [
      {
        role: 'Role',
        doesRoleVote: true,
        isVisible: true,
        aboutRole: '',
        roleMessage: '[/TAG id="tag1" name="Infector" src="manual"/]',
        voteMessage: '',
      },
    ]);
    seed('morningMessagesList', { 'alice@example.com': ['[/TAG: "Infector"/]'] });
    seed('dayDatesArray', ['10/21/2026']);
    seed('selectedDayIndex', 0);
    seed('cellModuleVersion', 1);
  });

  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);

  // Delete the tag file through the files record (same index-diff path the
  // file browser's deleteFile takes).
  await page.evaluate(() => {
    const db = window.__simDb;
    const key = 'scriptFiles-SIMOP1234';
    const doc = db.runQuery('user_vars:get', { key }).value;
    const files = { ...doc.files };
    delete files.tag1;
    db.runMutation('user_vars:set', { key, value: { ...doc, files } });
  });

  await page.waitForFunction(
    () => {
      const db = window.__simDb;
      const read = (key) => db.runQuery('user_lists:get', { key, itemId: 'SIMOP1234' })?.value;
      const users = read('userTable');
      const roles = read('roleTable');
      const morning = read('morningMessagesList');
      if (!users || !roles || !morning) return false;
      const playerCell = users[0].playerData.extraColumns[0];
      const legacyCell = users[0].playerData.extraColumns[1];
      const dayCell = users[0].days[0].extraColumns[0];
      const roleCell = roles[0].roleMessage;
      const morningCell = morning['alice@example.com'][0];
      return (
        playerCell.includes('match="tagid:tag1"') &&
        legacyCell.includes('match="tag:Infector"') &&
        dayCell.includes('match="tagid:tag1"') &&
        roleCell.includes('match="tagid:tag1"') &&
        morningCell.includes('match="tag:Infector"')
      );
    },
    { timeout: 20000 }
  );

  const state = await page.evaluate(() => {
    const db = window.__simDb;
    const read = (key) => db.runQuery('user_lists:get', { key, itemId: 'SIMOP1234' })?.value;
    return {
      playerCell: read('userTable')[0].playerData.extraColumns[0],
      untouched: JSON.stringify(read('userTable')[0].playerData.extraColumns[0]).includes('tag2'),
      docFiles: Object.keys(
        db.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value.files
      ).sort(),
      writes: db.stats.mutationsRun,
    };
  });
  assert.ok(state.untouched, 'the surviving Doctor tag piece must remain');
  assert.deepEqual(state.docFiles, ['other1', 'other2', 'plain', 'tag2']);

  // ---- multi-delete message: folder clause only when a folder is selected
  await page.click('[data-testid="gametab-files"]');
  await settle(800);
  const clickRow = async (name, meta = false) => {
    const handle = await page.waitForFunction(
      (target) =>
        [...document.querySelectorAll('div')].find((node) => {
          const box = node.getBoundingClientRect();
          return (
            !node.children.length &&
            node.textContent.trim() === target &&
            box.width &&
            box.height &&
            node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
          );
        }),
      { timeout: 15000 },
      name
    );
    const el = handle.asElement();
    if (meta) await page.keyboard.down('Meta');
    await el.click();
    if (meta) await page.keyboard.up('Meta');
    await settle();
  };
  const dialogText = async () =>
    page
      .waitForFunction(
        () => {
          const matches = [...document.querySelectorAll('div')].filter((node) =>
            node.textContent.includes('will be removed')
          );
          const tightest = matches.sort((a, b) => a.textContent.length - b.textContent.length)[0];
          return tightest?.textContent ?? null;
        },
        { timeout: 15000 }
      )
      .then((h) => h.jsonValue());
  const cancelDelete = async () => {
    await page.keyboard.press('Escape');
    await settle();
    await page.evaluate(() => {
      [...document.querySelectorAll('div,button')]
        .filter((n) => n.textContent.trim() === 'Cancel')
        .pop()
        ?.click();
    });
    await settle(600);
  };

  // Two files only: no folder clause.
  await clickRow('Alpha');
  await clickRow('Beta', true);
  await page.keyboard.down('Meta');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Meta');
  const filesOnly = await dialogText();
  assert.match(filesOnly, /2 selected items will be removed\./);
  assert.ok(!filesOnly.includes('selected folders'), filesOnly);
  await cancelDelete();

  // A folder + a file inside it: folder clause appears.
  await clickRow('notes');
  await page.keyboard.down('Meta');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Meta');
  const withFolder = await dialogText();
  assert.ok(withFolder.includes('selected folders'), withFolder);
  await cancelDelete();

  // Idempotent: in-flight cleanup writes land, then nothing keeps writing.
  await settle(1200);
  const quiet = await page.evaluate(() => window.__simDb.stats.mutationsRun);
  await settle(1200);
  assert.ok(
    await page.evaluate((before) => window.__simDb.stats.mutationsRun - before < 4, quiet),
    'cleanup must not create an idle write loop'
  );

  await page.screenshot({ path: '/tmp/deleted-tag-cleanup.png' });
  assert.deepEqual(errors, []);
  console.log('deleted tag removed from userTable, day, role and morning cells via REM tombstones');
} catch (error) {
  console.error(await page.evaluate(() => document.body.innerText));
  throw error;
} finally {
  await browser.close();
}
