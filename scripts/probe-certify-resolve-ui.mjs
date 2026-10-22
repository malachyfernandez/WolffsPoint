import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: "Add Votes To Table" / "Add Actions To Table" are split buttons —
// the arrow half opens a resolve screen showing the conflict count with
// "Keep all current values" / "Use all new results", which certifies
// without opening the per-item review dialog.
// Offline simulator only.
//   node scripts/probe-certify-resolve-ui.mjs http://localhost:8084
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
const userTableValue = () =>
  page.evaluate(
    (key) => window.__simDb.runQuery('user_lists:get', { key, itemId: 'SIMOP1234' })?.value,
    'userTable'
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, { files: {}, folders: ['tags'] });
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    // Day cells are id-keyed against titles.dayIds, and the sim auto-seeds
    // ~9 days — align ids and the selected day so day-0 submissions hit.
    const dayIds = Array.from({ length: 9 }, (_, i) => `d${i}`);
    const emptyDays = () =>
      dayIds.map((id) => ({
        id,
        vote: '',
        action: '',
        voteMultiplier: 1,
        extraColumns: [''],
      }));
    const aliceDays = emptyDays();
    // Alice's day-0 vote cell holds an operator override written on top of a
    // prior certification — the new submission conflicts with it. The manual
    // write's `overrides` must carry a source whose certification scope
    // matches `certification:sim:SIMOP1234:d0:votes` (sim namespace + day id).
    const certSource = 'certification:sim:SIMOP1234:d0:votes|w1';
    aliceDays[0] = {
      ...aliceDays[0],
      vote: 'operator',
      fieldProvenance: {
        vote: {
          base: 'baseline',
          writes: [
            { id: 'w1', source: certSource, value: 'alice@example.com' },
            {
              id: 'w2',
              source: 'manual:dayTable',
              value: 'operator',
              overrides: [certSource],
            },
          ],
        },
      },
    };
    db.seedListItem(db.viewerUserId, 'userTable', game, [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'Alice',
        role: 'Infector',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: aliceDays,
      },
      {
        realName: 'Bob',
        email: 'bob@example.com',
        userId: 'Bob',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: emptyDays(),
      },
    ]);
    db.seedListItem(db.viewerUserId, 'userTableTitle', game, {
      extraUserColumns: [],
      extraDayColumns: [],
      extraUserColumnIds: [],
      extraDayColumnIds: [],
      dayIds,
    });
    db.seedListItem(db.viewerUserId, 'morningMessagesList', game, {});
    db.seedListItem(db.viewerUserId, 'selectedDayIndex', game, 0);
    db.seedVar(db.viewerUserId, `playerNightSubmission-day-0-${game}`, {
      gameId: game,
      gameDayId: 'd0',
      dayIndex: 0,
      playerEmail: 'alice@example.com',
      playerUserId: 'Alice',
      vote: 'bob@example.com',
      action: '',
      submittedVoteAt: 1,
    });
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-players"]');
  await settle(2000);
  await clickText('Review / Certify');
  await settle(1200);
  await page.screenshot({ path: '/tmp/certify-split.png' });

  // Split button: arrow half opens the resolve screen with the count.
  const arrow = await page.waitForSelector('[aria-label="Add Votes To Table: resolve conflicts"]', {
    timeout: 15000,
  });
  await arrow.click();
  await settle(800);
  await page.screenshot({ path: '/tmp/certify-resolve.png' });
  assert.equal(await bodyHas('1 conflict'), true, 'resolve screen should show the conflict count');
  assert.equal(
    await bodyHas('Use all new results'),
    true,
    'resolve screen should offer the new-results choice'
  );
  assert.equal(
    await bodyHas('Keep all current values'),
    true,
    'resolve screen should offer the keep choice'
  );

  // "Use all new results" certifies straight through — no review dialog.
  await clickText('Use all new results');
  await settle(1500);
  assert.equal(
    await bodyHas('Review certification changes'),
    false,
    'auto-resolve must skip the per-item review dialog'
  );
  const afterReplace = await userTableValue();
  assert.equal(
    afterReplace[0].days[0].vote,
    'bob@example.com',
    `vote should be certified, got: ${afterReplace[0].days[0].vote}`
  );

  // Re-open: the arrow now reports no conflicts.
  await clickText('Review / Certify');
  await settle(1200);
  const arrow2 = await page.waitForSelector(
    '[aria-label="Add Votes To Table: resolve conflicts"]',
    { timeout: 15000 }
  );
  await arrow2.click();
  await settle(800);
  assert.equal(
    await bodyHas('No conflicts detected'),
    true,
    'post-certify screen should report zero conflicts'
  );

  console.log('PASS: certify split arrow resolves conflicts with a count');
  await browser.close();
  process.exit(0);
} catch (error) {
  console.error('FAIL:', error.message);
  try {
    await page.screenshot({ path: '/tmp/certify-resolve-fail.png' });
    console.log('screenshot -> /tmp/certify-resolve-fail.png');
  } catch {}
  await browser.close();
  process.exit(1);
}
