import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Run against EXPO_PUBLIC_SIM=1 only. Never exercise writes on a live game.
const url = process.argv[2] ?? 'http://localhost:8083';
const browser = await launch({
  headless: true,
  defaultViewport: { width: 1280, height: 950 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && /Maximum update depth|Uncaught Error/.test(message.text())) {
    errors.push(message.text());
  }
});
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// Portal DOM order is not stack order. Only click the frontmost matching control.
const clickText = async (text) => {
  const control = await page.waitForFunction(
    (target) => {
      return [...document.querySelectorAll('[tabindex],button')].find((node) => {
        if (node.textContent.trim() !== target) return false;
        const box = node.getBoundingClientRect();
        return (
          box.width > 0 &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      });
    },
    { timeout: 10_000 },
    text
  );
  await control.asElement().click();
  await settle();
};

try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
  assert.equal(
    await page.evaluate(() => !!window.__simDb),
    true,
    'Refusing to test a non-sim server'
  );
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    const makeFile = (id, name) => ({
      id,
      path: `Test/${name}`,
      kind: 'markdown',
      source: `FileInput({NAME = "Numberofplayers"});\nCreateMarkdown({CONTENT = Markdown(\`${name} body\`)});`,
      updatedAt: 1,
    });
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: { f_inf: makeFile('f_inf', 'Infectors'), f_car: makeFile('f_car', 'Carriers') },
      folders: ['Test'],
    });
    const cell = (call) => `File(${call});`;
    const users = [
      // Missing input arg: must auto-fill an editable string field.
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [
          {
            vote: '',
            action: '',
            voteMultiplier: 1,
            extraColumns: [cell('{PATH = "Test/Infectors", ID = "f_inf"}')],
          },
        ],
      },
      // Explicit `nothing` arg: keeps the '+' socket, which must open the
      // expression picker - never the file browser.
      {
        realName: 'Bob',
        email: 'bob@example.com',
        userId: 'test-Bob',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [
          {
            vote: '',
            action: '',
            voteMultiplier: 1,
            extraColumns: [
              cell('{PATH = "Test/Carriers", ID = "f_car", NUMBEROFPLAYERS = nothing}'),
            ],
          },
        ],
      },
    ];
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', users);
    seed('userTableTitle', {
      extraUserColumns: ['Status'],
      extraDayColumns: ['Notes'],
      extraDayColumnTypes: ['files'],
    });
    seed('userTableColumnVisibility', { extraUserColumns: [true], extraDayColumns: [true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-players"]');
  await page.click('[data-testid="gametab-players"]');
  await settle(1200);

  // ── Missing declared-input arg renders as an editable string field ──
  await clickText('Infectors');
  await page.waitForFunction(() => document.body.innerText.includes('Numberofplayers'));
  const input = await page.waitForFunction(() => {
    const fields = [...document.querySelectorAll('input')].filter(
      (node) => node.getBoundingClientRect().width > 0
    );
    return fields.find((node) => node.placeholder === 'Numberofplayers') ?? null;
  });
  assert.ok(
    input,
    'An empty File() input in a file-only cell must be a text field, not a "+" socket'
  );
  await page.$eval('input[placeholder="Numberofplayers"]', (node) => {
    node.focus();
    node.select();
  });
  await page.keyboard.sendCharacter('3');
  await settle(300);
  assert.equal(
    await page.$eval('input[placeholder="Numberofplayers"]', (node) => node.value),
    '3',
    'Typing into the file-input field must edit the value'
  );
  await clickText('Done');
  await settle(600);

  // Reopen: the typed value must persist as the input field's value.
  await clickText('Infectors');
  await page.waitForSelector('input[placeholder="Numberofplayers"]');
  assert.equal(
    await page.$eval('input[placeholder="Numberofplayers"]', (node) => node.value),
    '3',
    'The typed input value must persist through save and reload'
  );
  await page.keyboard.press('Escape');
  await settle(600);

  // ── An explicit `nothing` arg keeps the "+" socket, which opens the
  //    expression picker (input options only) - never the file browser ──
  await clickText('Carriers');
  await page.waitForFunction(() => document.body.innerText.includes('Numberofplayers'));
  const socket = await page.waitForFunction(() => {
    const label = [...document.querySelectorAll('div')].find(
      (node) => node.children.length === 0 && node.textContent.trim() === 'Numberofplayers'
    );
    if (!label) return null;
    return [...label.parentElement.querySelectorAll('div')].find(
      (node) => node.children.length === 0 && node.textContent.trim() === '+'
    );
  });
  assert.ok(socket, 'An explicit `nothing` arg must still render the "+" socket');
  await socket.asElement().click();
  await settle(600);
  assert.ok(
    await page.evaluate(() => document.body.innerText.includes('Add Expression')),
    'Clicking "+" on a File() input must open the expression picker'
  );
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Choose a file')),
    false,
    'Clicking "+" on a File() input must not open the file selector'
  );
  // Picking the string suggestion fills the arg with an editable field. Item
  // rows render a block preview ('+' placeholder) plus the description.
  await clickText('+Text');
  await page.waitForSelector('input[placeholder="Numberofplayers"]');
  // Close the editor without saving.
  await page.evaluate(() => {
    const close = [...document.querySelectorAll('[aria-label="Close"]')].find((node) => {
      const box = node.getBoundingClientRect();
      return (
        box.width > 0 &&
        node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
      );
    });
    close?.click();
  });
  await settle(400);

  console.log('file cell editor UI tests passed');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
