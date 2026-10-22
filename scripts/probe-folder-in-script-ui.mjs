import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: a plain script file can insert a Folder() block through the normal
// File insert - the pick browser accepts folders, and the inserted block
// renders with folder settings + retarget. Offline simulator only.
//   node scripts/probe-folder-in-script-ui.mjs http://localhost:8084
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
    f_a: {
      id: 'f_a',
      path: 'Shared/Part A',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'CreateMarkdown({CONTENT = "a"});',
    },
    f_b: {
      id: 'f_b',
      path: 'Shared/Part B',
      kind: 'script',
      role: 'display',
      updatedAt: 1,
      source: 'CreateMarkdown({CONTENT = "b"});',
    },
  },
  folders: ['Shared'],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const clickText = (label, last = false) =>
  page.evaluate(
    (label, last) => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const nodes = [...document.querySelectorAll('body *')].filter(
        (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
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

const hasFolderSettings = () =>
  page.evaluate(() => !!document.querySelector('[aria-label="Folder settings"]'));

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(
    ({ GAME, doc }) => {
      const db = window.__simDb;
      db.seedVar(db.viewerUserId, `scriptFiles-${GAME}`, doc);
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'second');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
    },
    { GAME, doc }
  );

  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  await page.click('[data-testid="gametab-files"]');
  await settle(1500);

  // Open the script file in the editor ('second' click mode: select + open).
  assert.equal(await clickText('Main Script'), true, 'Main Script row not found');
  await settle(300);
  await clickText('Main Script');
  await settle(1200);
  assert.equal(
    await page.evaluate(() => !!document.querySelector('[aria-label="Minimize"]')),
    true,
    'file editor did not open'
  );

  // Open the insert modal via the add-block affordance (empty script body).
  await page.screenshot({ path: '/tmp/folder-editor-open.png' });
  assert.equal(
    await clickText('press to add a block'),
    true,
    'add-block affordance not found'
  );
  await settle(900);
  await page.screenshot({ path: '/tmp/folder-insert-modal.png' });

  // "File" insert -> pick browser allowing folders.
  assert.equal(await clickText('File'), true, 'File insert item not found');
  await settle(1200);
  const subtitle = await page.evaluate(
    () => document.body.innerText.match(/Pick a file[^\n]*/)?.[0] ?? ''
  );
  assert.ok(subtitle.includes('folder'), `expected folder pick subtitle, got: ${subtitle}`);

  // Select the Shared folder row in the PICK dialog (last match - the Files
  // page behind the portal also has a "Shared" row).
  assert.equal(await clickText('Shared', true), true, 'Shared folder row not found');
  await settle(500);
  await page.screenshot({ path: '/tmp/folder-pick-selected.png' });
  const chooseInfo = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const node = [...document.querySelectorAll('body *')].find(
      (n) => norm(n.textContent) === 'Choose' && n.getBoundingClientRect().width
    );
    if (!node) return { found: false };
    const btn = node.closest('[role="button"]') ?? node;
    const r = btn.getBoundingClientRect();
    return {
      found: true,
      ariaDisabled: btn.getAttribute('aria-disabled') ?? btn.getAttribute('disabled'),
      rect: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    };
  });
  assert.equal(chooseInfo.found, true, 'Choose button not found');
  assert.notEqual(chooseInfo.ariaDisabled, 'true', 'Choose stayed disabled after folder select');
  await page.mouse.click(chooseInfo.rect.x, chooseInfo.rect.y);
  await settle(1200);
  await page.screenshot({ path: '/tmp/folder-inserted.png' });

  // The Folder block renders with settings + retarget affordances.
  assert.equal(await hasFolderSettings(), true, 'Folder block did not render');
  assert.equal(
    await page.evaluate(() => !!document.querySelector('[aria-label="Change folder"]')),
    true,
    'folder retarget button missing'
  );

  const bodyText = await page.evaluate(() => document.body.innerText);
  assert.ok(bodyText.includes('Shared'), 'folder block does not show the picked folder');

  console.log('PASS: Folder() inserts into plain script files with settings + retarget');
} finally {
  await browser.close();
}
