import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1000 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const settle = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
const clickText = async (text) => {
  const element = await page.waitForFunction(
    (target) =>
      [...document.querySelectorAll('[tabindex],button')].find((node) => {
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
        notice: {
          id: 'notice',
          path: 'Notice',
          kind: 'markdown',
          source: 'CreateMarkdown({CONTENT = Markdown(`A live notice`)});',
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
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-rulebook"]');
  await settle();
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Upgrade whole game')),
    false
  );
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Use legacy systems')),
    false
  );
  await page.click('[data-testid="gametab-files"]');
  await settle();
  await clickLeaf('Audit trigger');
  await page.waitForFunction(() => document.body.innerText.includes('requires a File(...) module'));

  // The tag dropdown manager used to create legacy definitions instead of files.
  await clickText('infected');
  await clickText('Edit Tags');
  await clickText('New Tag');
  const field = await page.waitForSelector('input[placeholder="Enter tag name..."]');
  await field.click({ clickCount: 3 });
  await page.keyboard.type('Modular UI Tag');
  await clickText('Create');
  assert.ok(
    await page.evaluate(() =>
      Object.values(
        window.__simDb.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value.files
      ).some((file) => file.path.startsWith('tags/') && file.source.includes('Modular UI Tag'))
    )
  );
  assert.equal(
    await page.evaluate(() =>
      window.__simDb
        .runQuery('user_vars:get', { key: 'tagDefinitions-SIMOP1234' })
        .value.some((tag) => tag.name === 'Modular UI Tag')
    ),
    false
  );

  // Legacy tag trigger editing also needs the file-picker context.
  await clickText('infected');
  await clickText('Edit Trigger Script');
  await clickLeaf('tag');
  await clickText('Files');
  await clickLeaf('Write a live-linked file module');
  await page.waitForFunction(() => document.body.innerText.includes('Choose a file'));
  await clickLeaf('Notice');
  await settle();
  assert.ok(await page.evaluate(() => document.body.innerText.includes('Notice')));

  // The only migration control upgrades an entire game, then disappears in the copy.
  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 0);
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, { files: {}, folders: ['tags'] });
    db.seedVar(db.viewerUserId, `tagDefinitions-${game}`, [{ name: 'Legacy', color: 'Red' }]);
    db.seedVar(db.viewerUserId, `tagTriggers-${game}`, { Legacy: 'OnTagAdded { }' });
    db.seedListItem(db.viewerUserId, 'voteMessageDefault', game, 'Legacy vote');
    db.seedListItem(db.viewerUserId, 'morningMessagesList', game, {});
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-rulebook"]');
  await settle(1500);
  await page.click('[data-testid="gametab-rulebook"]');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[tabindex],button')].some(
      (node) =>
        node.textContent.trim() === 'Upgrade whole game' &&
        node.getAttribute('aria-disabled') !== 'true'
    )
  );
  await page.evaluate(() =>
    [...document.querySelectorAll('[tabindex],button')]
      .find((node) => node.textContent.trim() === 'Upgrade whole game')
      ?.scrollIntoView({ block: 'center' })
  );
  await clickText('Upgrade whole game');
  await clickText('Upgrade');
  await page.waitForFunction(() =>
    [...window.__simDb.listItems.values()].some(
      (row) => row.key === 'games' && row.itemId.startsWith('SIMOP1234-mig')
    )
  );
  const copied = await page.evaluate(() => {
    const db = window.__simDb;
    const game = [...db.listItems.values()].find(
      (row) => row.key === 'games' && row.itemId.startsWith('SIMOP1234-mig')
    ).itemId;
    return {
      version: db.runQuery('user_lists:get', { key: 'cellModuleVersion', itemId: game }).value,
      vote: db.runQuery('user_lists:get', { key: 'voteMessageDefault', itemId: game }).value,
      original: db.runQuery('user_lists:get', { key: 'voteMessageDefault', itemId: 'SIMOP1234' })
        .value,
      definitions: db.runQuery('user_vars:get', { key: `tagDefinitions-${game}` }).value,
    };
  });
  assert.equal(copied.version, 2);
  assert.match(copied.vote, /File\(/);
  assert.equal(copied.original, 'Legacy vote');
  assert.deepEqual(copied.definitions, []);
  await page.waitForSelector('[data-testid="gametab-rulebook"]');
  await page.click('[data-testid="gametab-rulebook"]');
  await settle();
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Upgrade whole game')),
    false
  );

  // A newly created game starts fully modular, including its default vote file.
  await page.reload({ waitUntil: 'networkidle2' });
  const newLabel = await page.evaluate(() =>
    document.body.innerText.includes('New WolffsPoint') ? 'New WolffsPoint' : 'New WP'
  );
  await clickText(newLabel);
  await page.type('input[placeholder="WolffsPoint"]', 'Modular new game');
  await page.type('input[placeholder="MM/DD/YYYY"]', '12/31/2030');
  await clickText('Create');
  await page.waitForFunction(() =>
    [...window.__simDb.listItems.values()].some(
      (row) => row.key === 'games' && row.value.name === 'Modular new game'
    )
  );
  const created = await page.evaluate(() => {
    const db = window.__simDb;
    const game = [...db.listItems.values()].find(
      (row) => row.key === 'games' && row.value.name === 'Modular new game'
    ).itemId;
    return {
      version: db.runQuery('user_lists:get', { key: 'cellModuleVersion', itemId: game }).value,
      vote: db.runQuery('user_lists:get', { key: 'voteMessageDefault', itemId: game }).value,
      files: db.runQuery('user_vars:get', { key: `scriptFiles-${game}` }).value.files,
    };
  });
  assert.equal(created.version, 2);
  assert.match(created.vote, /File\(/);
  assert.ok(
    Object.values(created.files).some((file) => file.source.includes('CreateSelectVoteInput'))
  );
  assert.deepEqual(errors, []);
  console.log(
    'Update Cell UI passed: file-backed tag creation, file picking in tag triggers, whole-game upgrade, and modular new-game seeds.'
  );
} catch (error) {
  console.error((await page.evaluate(() => document.body.innerText)).slice(-10000));
  throw error;
} finally {
  await browser.close();
}
