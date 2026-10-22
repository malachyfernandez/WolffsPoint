import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the sim "Manage players" dialog scrolls its player rows
// horizontally (ShadowScrollView edge fades) when the row is wider than the
// dialog - the delete button must be reachable by scrolling right.
// Offline simulator only.
//   node scripts/probe-manage-players-hscroll-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 560, height: 900 } });
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

// The row strip: the overflow-x:auto ancestor of the name input inside the
// Manage players dialog.
const stripInfo = () =>
  page.evaluate(() => {
    const input = [...document.querySelectorAll('input[placeholder="Name"]')][0];
    if (!input) return null;
    let el = input.parentElement;
    while (el && !(el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0)) {
      el = el.parentElement;
    }
    if (!el) return { found: false };
    const inputBox = input.getBoundingClientRect();
    const mask = el.parentElement;
    return {
      found: true,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollLeft: el.scrollLeft,
      inputRight: Math.round(inputBox.right),
      maskImage: getComputedStyle(mask).maskImage || '',
    };
  });

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate((game) => {
    const db = window.__simDb;
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, { files: {}, folders: [] });
    db.seedVar(db.viewerUserId, `simSession-${game}`, { enabled: true, view: 'console' });
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    db.seedListItem(db.viewerUserId, 'userTableTitle', game, {
      extraUserColumns: [],
      extraDayColumns: [],
    });
    // Sim roster lives at the sim-namespaced list coordinates
    // (simRecordKeyFor + simGameIdFor), written outside SimProvider.
    db.seedListItem(db.viewerUserId, `sim:${game}:userTable`, `${game}:sim`, [
      {
        realName: 'AveryLongPlayerNameForOverflow',
        email: 'avery@example.com',
        userId: 'test-Avery',
        role: 'Infector',
        playerData: { livingState: 'alive', extraColumns: [] },
        days: [],
      },
    ]);
    db.seedListItem(db.viewerUserId, 'userTable', game, [
      {
        realName: 'AveryLongPlayerNameForOverflow',
        email: 'avery@example.com',
        userId: 'test-Avery',
        role: 'Infector',
        playerData: { livingState: 'alive', extraColumns: [] },
        days: [],
      },
    ]);
    db.seedListItem(db.viewerUserId, 'roleTable', game, [
      { role: 'Infector', doesRoleVote: false, roleMessage: '', aboutRole: '', isVisible: true },
    ]);
  }, GAME);
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await settle(3000);
  await page.screenshot({ path: '/tmp/manage-players-after-click.png' });
  console.log(
    'testids:',
    await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid]')]
        .map((el) => el.getAttribute('data-testid'))
        .join(', ')
    )
  );
  await page.waitForSelector('[data-testid="gametab-players"]');
  await settle(1000);
  await page.click('[data-testid="gametab-players"]');
  await settle(2000);
  await page.screenshot({ path: '/tmp/manage-players-tab.png' });
  await clickText('Manage Players');
  await page.waitForSelector('input[placeholder="Name"]');
  await settle(600);

  const before = await stripInfo();
  assert.ok(before?.found, 'a horizontally-scrollable strip wraps the rows');
  assert.ok(
    before.scrollWidth > before.clientWidth,
    `row content overflows (${before.scrollWidth} > ${before.clientWidth})`
  );
  assert.ok(before.maskImage.includes('linear-gradient'), 'edge-fade mask on the strip');
  assert.equal(before.scrollLeft, 0, 'starts scrolled to the left');

  // Trash button is clipped off the right edge initially.
  const trashVisible = () =>
    page.evaluate(() => {
      const strip = [...document.querySelectorAll('input[placeholder="Name"]')][0];
      if (!strip) return false;
      const row = strip.parentElement;
      const trash = [...row.querySelectorAll('svg')].pop()?.parentElement;
      if (!trash) return false;
      const box = trash.getBoundingClientRect();
      const dialog = strip.closest('[role="dialog"]') ?? document.body;
      return box.right <= dialog.getBoundingClientRect().right + 1;
    });

  // Scroll the strip fully right: the delete button must come into view.
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input[placeholder="Name"]')][0];
    let el = input.parentElement;
    while (el && !(el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0)) {
      el = el.parentElement;
    }
    el.scrollLeft = el.scrollWidth;
  });
  await settle(400);
  const after = await stripInfo();
  assert.ok(after.scrollLeft > 0, 'strip scrolled right');

  await page.screenshot({ path: '/tmp/manage-players-hscroll.png' });
  console.log('manage-players hscroll: PASS');
} finally {
  await browser.close();
}
