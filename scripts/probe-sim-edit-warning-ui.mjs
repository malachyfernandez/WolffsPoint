import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the "Simulation only" warning fires on sim-side file creation and
// role-table writes, "Don't warn again" suppresses it for the session, and
// pausing/re-entering the sim resets it. Offline simulator only.
//   node scripts/probe-sim-edit-warning-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const doc = {
  files: {
    f_main: {
      id: 'f_main',
      path: 'Main Script',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: '',
    },
  },
  folders: [],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const clickText = (label, last = false) =>
  page.evaluate(
    (label, last) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const nodes = [...document.querySelectorAll('body *')].filter(
        (n) => norm(n.textContent) === norm(label) && n.getBoundingClientRect().width
      );
      const node = last ? nodes.at(-1) : nodes[0];
      if (!node) return false;
      const r = node.getBoundingClientRect();
      node.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
        })
      );
      return true;
    },
    label,
    last
  );

const clickAria = (label) =>
  page.evaluate((label) => {
    const node = document.querySelector(`[aria-label="${label}"]`);
    if (!node) return false;
    const r = node.getBoundingClientRect();
    node.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      })
    );
    return true;
  }, label);

const warningVisible = () =>
  page.evaluate(() => document.body.innerText.includes('Simulation only'));

const createMarkdownFile = async () => {
  assert.equal(await clickAria('New Markdown'), true, 'New Markdown button not found');
  await settle(700);
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('New markdown file')),
    true,
    'name prompt did not open'
  );
  assert.equal(await clickText('Create'), true, 'Create button not found');
  await settle(900);
};

const openFilesTab = async () => {
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);
};

const openGame = async () => {
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await settle(2000);
};

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME, doc }) => {
      const db = window.__simDb;
      const uid = db.viewerUserId;
      // Active sim session (console view) + the sim-space records the sim's
      // Files/Roles tabs read through the SimProvider redirect.
      db.seedVar(uid, `simSession-${GAME}`, { enabled: true, view: 'console' });
      db.seedVar(uid, 'scriptFiles:openOnClick', 'second');
      db.seedVar(uid, 'scriptFiles:browserView', 'list');
      db.seedListItem(uid, `sim:${GAME}:scriptFiles-${GAME}:sim`, 'sim:shared', doc, {
        privacy: 'PUBLIC',
      });
      db.seedListItem(
        uid,
        `sim:${GAME}:roleTable`,
        `${GAME}:sim`,
        [{ role: 'Werewolf', roleAbbrev: 'W', doesRoleVote: true, isVisible: true }],
        { privacy: 'PUBLIC' }
      );
    },
    { GAME, doc }
  );

  await openGame();
  await openFilesTab();

  // 1) File creation in the sim -> the warning dialog shows.
  await createMarkdownFile();
  assert.equal(await warningVisible(), true, 'no warning on sim file create');
  await page.screenshot({ path: '/tmp/simwarn-open.png' });

  // 2) "Don't warn again" suppresses it for the rest of the session.
  assert.equal(await clickText("Don't warn again"), true, 'suppress button not found');
  await settle(700);
  await createMarkdownFile();
  assert.equal(await warningVisible(), false, 'warning not suppressed in same session');

  // 3) Leave the sim (pause) and re-enter -> the warning is back.
  assert.equal(await clickText('leave sim'), true, 'leave sim not found');
  await settle(1500);
  await page.screenshot({ path: '/tmp/simwarn-left.png' });
  const enterRect = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === 'enter sim' && n.getBoundingClientRect().width
    );
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  assert.ok(enterRect, 'Enter sim not found');
  // Real mouse click: the strip's synthetic-event path doesn't reach this
  // button's Pressable.
  await page.mouse.click(enterRect.x, enterRect.y);
  await settle(2500);
  await openFilesTab();
  await createMarkdownFile();
  await page.screenshot({ path: '/tmp/simwarn-reentry.png' });
  assert.equal(await warningVisible(), true, 'warning did not reset after re-entering sim');

  // 4) Non-suppressing dismiss, then a role-table write warns too.
  assert.equal(await clickText('Got it'), true, 'Got it button not found');
  await settle(700);
  // Roles page lives under the tab whose value is 'config'.
  await page.click('[data-testid="gametab-config"]');
  await settle(1500);
  assert.equal(await clickText('Add Role'), true, 'Add Role button not found');
  await settle(900);
  // RoleAddDialog needs a role name before the submit fires setRoleTable.
  const nameInput = await page.$('input[placeholder="Enter role name..."]');
  assert.ok(nameInput, 'role name input not found');
  await nameInput.type('Sim Role');
  // The LAST 'Add Role' text is the dialog's submit (the page button is first).
  assert.equal(await clickText('Add Role', true), true, 'Add Role submit not found');
  await settle(1000);
  assert.equal(await warningVisible(), true, 'no warning on sim role-table write');
  await page.screenshot({ path: '/tmp/simwarn-role.png' });

  console.log('PASS: sim edit warning fires on create + role writes, suppresses, resets on re-entry');
} finally {
  await browser.close();
}
