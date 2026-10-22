import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

const browser = await launch({ headless: true, defaultViewport: { width: 1400, height: 1100 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
const clickText = async (text, leaf = false) => {
  const handle = await page.waitForFunction(
    (target, onlyLeaf) =>
      [...document.querySelectorAll(onlyLeaf ? 'div' : '[tabindex],button')].find((node) => {
        const box = node.getBoundingClientRect();
        return (
          (!onlyLeaf || !node.children.length) &&
          node.textContent.trim() === target &&
          box.width &&
          box.height &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      }),
    { timeout: 15000 },
    text,
    leaf
  );
  await handle.asElement().click();
  await settle();
};

try {
  for (const staged of [false, true]) {
    await page.goto(process.argv[2] ?? 'http://localhost:8084', {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });
    assert.equal(
      await page.evaluate(() => !!window.__simDb),
      true,
      'Refusing writes outside the offline simulator'
    );
    await page.evaluate((freeze) => {
      const db = window.__simDb;
      const game = 'SIMOP1234';
      const call =
        'File({ID = "target", PATH = "Target", Keep = "keep this", RemoveMe = "OLD_ARG_VALUE"})';
      const piece = (src) =>
        `[/ADD src="${src}" kind="file" ref="target" call="${encodeURIComponent(call)}"/]`;
      const raw =
        piece('certification:source') +
        piece('manual') +
        '[/ORDER src="manual" refs="%5B%22target%22%5D"/]';
      const marker = `/*file: ${JSON.stringify({
        id: 'target',
        path: 'Target',
        inputs: { Keep: '"keep this"', RemoveMe: '"OLD_ARG_VALUE"' },
      })}*/`;
      const tag = `Tag({NAME = "Cleanup Tag", COLOR = "Red"});
        UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) {
          Add ${call}; Each contents { Replace ${call}; }
        }`;
      db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
        files: {
          target: {
            id: 'target',
            path: 'Target',
            kind: 'script',
            updatedAt: 1,
            source:
              'FileInput({NAME = "RemoveMe", DEFAULT = "default"}); FileInput({NAME = "Keep", DEFAULT = "kept"}); CreateMarkdown({CONTENT = Markdown(`Body`)});',
          },
          caller: {
            id: 'caller',
            path: 'Caller',
            kind: 'script',
            updatedAt: 1,
            source: `Variable({NAME = "unrelated", VALUE = "preserved draft"}); ${call};
              UpdateCell({PLAYERS = players, COLUMNTYPE = "day", DAY = 0, COLUMN = "morningMessage"}) {
                Add ${call}; Each contents { Add ${call}; }
              }`,
          },
          tag: {
            id: 'tag',
            path: 'tags/Cleanup Tag',
            kind: 'script',
            role: 'trigger',
            source: tag,
            updatedAt: 1,
          },
        },
        folders: ['tags'],
      });
      const users = [
        {
          id: 'player',
          userId: 'player-user',
          email: 'alice@example.com',
          realName: 'Alice',
          role: 'Role',
          playerData: { livingState: 'alive', extraColumns: [raw] },
          days: [{ id: 'day', vote: '', action: '', voteMultiplier: 1, extraColumns: [raw] }],
        },
      ];
      const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
      seed('userTable', users);
      seed('userTableTitle', {
        extraUserColumns: ['Files'],
        extraUserColumnTypes: ['files'],
        extraUserColumnIds: ['user-files'],
        extraDayColumns: ['Files'],
        extraDayColumnTypes: ['files'],
        extraDayColumnIds: ['day-files'],
        dayIds: ['day'],
      });
      seed('roleTable', [
        {
          role: 'Role',
          doesRoleVote: true,
          isVisible: true,
          aboutRole: marker,
          roleMessage: `${call};`,
          voteMessage: `${call};`,
        },
      ]);
      seed('voteMessageDefault', `${call};`);
      seed('morningMessagesList', { 'alice@example.com': [raw] });
      seed('newspaper', [{ columns: [marker] }]);
      seed('dayDatesArray', ['10/21/2026']);
      seed('selectedDayIndex', 0);
      seed('cellModuleVersion', 1);
      db.seedVar(db.viewerUserId, `tagTriggers-${game}`, { Legacy: tag });
      db.seedVar(db.viewerUserId, `ruleBook-${game}`, marker);
      db.seedVar(db.viewerUserId, 'cleanup-history-proof', { scriptText: `${call};` });
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
      if (freeze) {
        const pending = structuredClone(users);
        pending[0].days[0].vote = 'unpublished vote';
        db.runMutation('scheduled_updates:stageTarget', {
          target: { targetType: 'list', key: 'userTable', itemId: game },
          batchId: 'cleanup-staged',
          encodedValue: pending,
          cellWriteOrigin: 'tracked',
        });
      }
    }, staged);
    await page.waitForSelector('[data-testid="game-SIMOP1234"]');
    await page.click('[data-testid="game-SIMOP1234"]');
    await page.waitForSelector('[data-testid="gametab-files"]');
    await settle(1500);
    await page.click('[data-testid="gametab-files"]');
    await settle();
    await clickText('Caller', true);
    await page.waitForSelector('[aria-label="Open Target"]');
    await page.click('[aria-label="Open Target"]');
    await settle();
    await clickText('RemoveMe', true);
    await page.waitForFunction(() => document.body.innerText.includes('Edit Input'));
    await clickText('Remove');
    assert.ok(
      await page.evaluate(() => {
        const db = window.__simDb;
        const doc = db.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value;
        return (
          doc.files.target.source.includes('RemoveMe') &&
          doc.files.caller.source.includes('OLD_ARG_VALUE')
        );
      }),
      'Deleting a draft input must not change published callers before Save'
    );
    await clickText('Done');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('input[placeholder="RemoveMe"]')].every(
        (node) => !node.getBoundingClientRect().width
      )
    );
    assert.equal(
      await page.evaluate(() => document.body.innerText.includes('(not declared)')),
      false
    );
    assert.ok(await page.evaluate(() => document.body.innerText.includes('unrelated')));

    await page.waitForFunction(
      (freeze) => {
        const db = window.__simDb;
        const game = 'SIMOP1234';
        const read = (key) => db.runQuery('user_lists:get', { key, itemId: game })?.value;
        const doc = db.runQuery('user_vars:get', { key: `scriptFiles-${game}` })?.value;
        const users = freeze
          ? db.runQuery('scheduled_updates:getPendingTarget', {
              target: { targetType: 'list', key: 'userTable', itemId: game },
            })?.encodedValue
          : read('userTable');
        const values = [
          doc,
          users,
          read('roleTable'),
          read('voteMessageDefault'),
          read('morningMessagesList'),
          read('newspaper'),
          db.runQuery('user_vars:get', { key: `ruleBook-${game}` })?.value,
          db.runQuery('user_vars:get', { key: `tagTriggers-${game}` })?.value,
        ];
        return values.every(
          (value) =>
            value !== undefined &&
            !decodeURIComponent(JSON.stringify(value)).includes('OLD_ARG_VALUE')
        );
      },
      { timeout: 20000 },
      staged
    );

    const result = await page.evaluate((freeze) => {
      const db = window.__simDb;
      const published = db.runQuery('user_lists:get', {
        key: 'userTable',
        itemId: 'SIMOP1234',
      }).value;
      const pending = db.runQuery('scheduled_updates:getPendingTarget', {
        target: { targetType: 'list', key: 'userTable', itemId: 'SIMOP1234' },
      });
      return {
        published: JSON.stringify(published),
        active: JSON.stringify(freeze ? pending.encodedValue : published),
        batch: pending?.batchId,
        vote: pending?.encodedValue[0].days[0].vote,
        history: db.runQuery('user_vars:get', { key: 'cleanup-history-proof' }).value.scriptText,
        caller: db.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value.files.caller
          .source,
      };
    }, staged);
    assert.doesNotMatch(result.active, /manual:override:/);
    assert.match(result.active, /certification:source/);
    assert.match(result.active, /ORDER/);
    assert.match(decodeURIComponent(result.active), /keep this/);
    assert.match(result.history, /OLD_ARG_VALUE/);
    assert.match(result.caller, /preserved draft/);
    if (staged) {
      assert.match(decodeURIComponent(result.published), /OLD_ARG_VALUE/);
      assert.equal(result.batch, 'cleanup-staged');
      assert.equal(result.vote, 'unpublished vote');
    }
    const writes = await page.evaluate(() => window.__simDb.stats.mutationsRun);
    await settle(1000);
    assert.ok(
      await page.evaluate((before) => window.__simDb.stats.mutationsRun - before < 4, writes),
      'Idempotent cleanup must not create an idle write loop'
    );
    await clickText('Cancel');
    // New inputs reappear normally, but old deleted overrides must not come back.
    await page.evaluate(() => {
      const db = window.__simDb;
      const key = 'scriptFiles-SIMOP1234';
      const value = db.runQuery('user_vars:get', { key }).value;
      db.runMutation('user_vars:set', {
        key,
        value: {
          ...value,
          files: {
            ...value.files,
            target: {
              ...value.files.target,
              source: `FileInput({NAME = "RemoveMe", DEFAULT = "new default"});\n${value.files.target.source}`,
              updatedAt: Date.now(),
            },
          },
        },
      });
    });
    await settle();
    await clickText('Caller', true);
    await page.waitForFunction(() => document.body.innerText.includes('RemoveMe'));
    assert.equal(
      await page.evaluate(
        () =>
          document.body.innerText.includes('OLD_ARG_VALUE') ||
          document.body.innerText.includes('(not declared)')
      ),
      false
    );
    console.log(
      `${staged ? 'staged' : 'published'}: removed inputs cleaned across files and active game records`
    );
  }
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(await page.evaluate(() => document.body.innerText));
  throw error;
} finally {
  await browser.close();
}
