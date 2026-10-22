import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// This test mutates only the disposable in-memory simulation.
const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 950 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && /Maximum update depth|Uncaught Error/.test(message.text())) {
    errors.push(message.text());
  }
});
const settle = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
const clickText = async (text) => {
  const element = await page.waitForFunction(
    (text) =>
      [...document.querySelectorAll('[tabindex],button')].find((node) => {
        if (node.innerText.replace(/\s+/g, ' ').trim() !== text) return false;
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
const value = () =>
  page.evaluate(
    () => window.__simDb.runQuery('user_lists:get', { key: 'userTable', itemId: 'SIMOP1234' }).value
  );
const certify = async () => {
  await clickText('Review / Certify');
  await clickText(
    await page.evaluate(() => (window.innerWidth < 640 ? 'Add Votes' : 'Add Votes To Table'))
  );
  await settle(1000);
};

try {
  await page.goto(process.argv[2] ?? 'http://localhost:8083', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  assert.equal(
    await page.evaluate(() => !!window.__simDb),
    true,
    'Refusing to write to a non-sim site'
  );
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    const users = ['Alice', 'Bob'].map((name) => ({
      realName: name,
      email: `${name.toLowerCase()}@example.com`,
      userId: `test-${name}`,
      role: '',
      playerData: { livingState: 'alive', extraColumns: [''] },
      days: [{ vote: 'Before', action: 'Before', voteMultiplier: 1, extraColumns: [''] }],
    }));
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', users);
    seed('userTableTitle', { extraUserColumns: ['Status'], extraDayColumns: ['Notes'] });
    seed('userTableColumnVisibility', { extraUserColumns: [true], extraDayColumns: [true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
    seed('morningMessagesList', {});
    db.seedVar(db.viewerUserId, `tagTriggers-${game}`, {
      Infected:
        'OnTagAdded { UpdateCell({PLAYERS = placedUser, COLUMNTYPE = "day", DAY = 0, COLUMN = "action"}) { Replace "From tag"; } }',
    });
    db.seedVar(db.viewerUserId, `playerNightSubmission-day-0-${game}`, {
      gameId: game,
      gameDayId: `${game}-day-0`,
      dayIndex: 0,
      playerEmail: 'alice@example.com',
      playerUserId: 'test-Alice',
      vote: 'bob@example.com',
      action: 'infect',
      submittedVoteAt: 1,
      submittedActionAt: 1,
      votePlannedUpdates: [
        {
          playerIndex: 1,
          dayIndex: null,
          column: 'Status',
          columnType: 'user',
          op: 'add',
          itemName: 'cellContents',
          updateExpression: 'tag("Infected")',
        },
      ],
    });
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-players"]');
  await page.click('[data-testid="gametab-players"]');
  await page.waitForFunction(() => document.body.innerText.includes('Review / Certify'));
  await settle(1200);
  await certify();
  assert.equal((await value())[0].days[0].vote, 'bob@example.com');
  assert.equal((await value())[1].days[0].action, 'From tag');
  await page.waitForSelector('[aria-label="From certification"]');
  await page.waitForSelector('[aria-label="From Infected Tag"]');

  const voteButton = await page.waitForFunction(() => {
    const mark = [...document.querySelectorAll('[aria-label="From certification"]')].find(
      (node) => node.parentElement.textContent.trim() === 'Bob'
    );
    return mark?.parentElement.querySelector('[tabindex="0"]');
  });
  await voteButton.asElement().click();
  const voteInput = 'input[placeholder="Enter one or more emails, separated by commas..."]';
  await page.waitForSelector(voteInput);
  await page.$eval(voteInput, (input) => {
    input.focus();
    input.select();
  });
  await page.keyboard.sendCharacter('Operator choice');
  await clickText('Done');
  await settle();
  assert.equal((await value())[0].days[0].vote, 'Operator choice');
  await page.keyboard.down('Control');
  await page.keyboard.press('z');
  await page.keyboard.up('Control');
  await settle();
  assert.equal(
    (await value())[0].days[0].vote,
    'bob@example.com',
    'Undo restores the attributed vote'
  );
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('z');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await settle();
  assert.equal(
    (await value())[0].days[0].vote,
    'Operator choice',
    'Redo restores the manual decision'
  );
  await certify();
  await page.waitForFunction(() =>
    document.body.innerText.includes('Review certification changes')
  );
  assert.equal((await value())[0].days[0].vote, 'Operator choice', 'Opening review must not write');
  await page.screenshot({ path: '/tmp/wolf-certification-review.png' });
  await clickText('Keep current');
  await clickText('Certify');
  await settle(1000);
  assert.equal((await value())[0].days[0].vote, 'Operator choice');
  assert.equal(
    (await value())[1].days[0].action,
    'Before',
    'Keeping the primary vote skips its new effects'
  );

  await certify();
  await page.waitForFunction(() =>
    document.body.innerText.includes('Review certification changes')
  );
  await clickText('Use certification');
  await clickText('Certify');
  await settle(1000);
  assert.equal((await value())[0].days[0].vote, 'bob@example.com');
  assert.equal((await value())[1].days[0].action, 'From tag');
  await page.waitForSelector('[aria-label="From Infected Tag"]');
  await page.screenshot({ path: '/tmp/wolf-certification-result.png' });
  await page.hover('[aria-label="From Infected Tag"]');
  await settle();
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll('body > div')].some(
        (node) =>
          node.style.position === 'fixed' &&
          node.style.opacity === '1' &&
          node.textContent === 'From Infected Tag'
      )
    )
  );
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    const db = window.__simDb;
    const users = structuredClone(
      db.runQuery('user_lists:get', { key: 'userTable', itemId: 'SIMOP1234' }).value
    );
    users[0].days[0].vote = 'Mobile choice';
    db.runMutation('user_lists:set', { key: 'userTable', itemId: 'SIMOP1234', value: users });
  });
  await settle();
  await certify();
  await page.waitForFunction(() =>
    document.body.innerText.includes('Review certification changes')
  );
  await page.screenshot({ path: '/tmp/wolf-certification-mobile.png' });
  const headerBounds = await page.evaluate(() => {
    const subtitle = [...document.querySelectorAll('div')].find(
      (node) =>
        node.childElementCount === 0 &&
        node.textContent === 'Choose which operator changes to keep before certifying again.'
    );
    const close = document.querySelector('[aria-label="Close"]');
    return {
      subtitle: subtitle.getBoundingClientRect().toJSON(),
      close: close.getBoundingClientRect().toJSON(),
    };
  });
  assert.ok(
    headerBounds.subtitle.right <= headerBounds.close.left ||
      headerBounds.subtitle.top >= headerBounds.close.bottom,
    'The mobile review subtitle must not be covered by the close button'
  );
  await clickText('Cancel');
  assert.equal((await value())[0].days[0].vote, 'Mobile choice');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(
    'PASS: certify, real vote editing, undo/redo, provenance indicators/tooltips, no-write review, Keep, tag rollback, Replace, repeated review, mobile cancel'
  );
} finally {
  await browser.close();
}
