import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: Vote Settings shows a "Use default" reset only for roles with a
// custom vote message; pressing it asks for confirmation (the custom
// message is deleted) before clearing the override — roles on the default
// see a status line and no reset.
// Offline simulator only.
//   node scripts/probe-vote-default-ui.mjs http://localhost:8084
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
const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);
const roles = () =>
  page.evaluate(
    (key) => window.__simDb.runQuery('user_lists:get', { key, itemId: 'SIMOP1234' })?.value,
    'roleTable'
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, { files: {}, folders: ['tags'] });
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    db.seedListItem(db.viewerUserId, 'roleTable', game, [
      {
        role: 'Infector',
        doesRoleVote: true,
        isVisible: true,
        roleMessage: '',
        voteMessage: 'Custom vote text',
        aboutRole: '',
      },
      {
        role: 'Villager',
        doesRoleVote: true,
        isVisible: true,
        roleMessage: '',
        aboutRole: '',
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

  // Custom-message role: reset button + custom status.
  await clickText('Custom vote text');
  assert.equal(await bodyHas('Use default'), true, 'reset button expected');
  assert.equal(await bodyHas('This role uses a custom message'), true, 'custom status expected');
  await clickText('Use default');
  await settle(500);
  // Resetting deletes the custom message — a confirmation must appear first.
  assert.equal(
    await bodyHas('Use the default vote message?'),
    true,
    'reset should ask for confirmation first'
  );
  // Cancel keeps the override and returns to the settings dialog.
  await clickText('Cancel');
  await settle(400);
  const stillCustom = await roles();
  assert.equal(
    stillCustom[0].voteMessage,
    'Custom vote text',
    'canceling the confirm should keep the override'
  );
  await clickText('Use default');
  await settle(500);
  await clickText('Use default');
  await settle(800);
  const afterReset = await roles();
  assert.equal(
    afterReset[0].voteMessage,
    undefined,
    `override should be cleared, got: ${JSON.stringify(afterReset[0])}`
  );
  assert.equal(await bodyHas('Using default'), true, 'cell should read Using default');

  // Default-message role: status line, no reset button.
  await clickText('Using default');
  assert.equal(await bodyHas('Using the default vote message'), true, 'default status expected');
  assert.equal(await bodyHas('Use default'), false, 'no reset button on default roles');
  await clickText('Cancel');

  console.log('PASS: vote settings reset-to-default is contextual and clears overrides');
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error('FAIL:', error.message);
  try {
    await page.screenshot({ path: '/tmp/vote-default-fail.png' });
    console.log('screenshot -> /tmp/vote-default-fail.png');
  } catch {}
  await browser.close();
  process.exit(1);
}
