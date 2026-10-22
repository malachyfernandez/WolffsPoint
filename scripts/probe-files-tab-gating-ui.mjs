import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: the operator Files tab is disabled for non-migrated games — it
// renders dimmed, and clicking anywhere on it shows a toast pointing to
// Config's "Upgrade to files" instead of switching tabs. After seeding
// cellModuleVersion the same tab switches normally.
// Offline simulator only.
//   node scripts/probe-files-tab-gating-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const TOAST = 'Files unlock after upgrading this game';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const filesTab = () => page.$('[data-testid="gametab-files"]');
const filesTabDisabled = () =>
  page.evaluate(() =>
    document
      .querySelector('[data-testid="gametab-files"]')
      ?.closest('.guilded-game-tab-wrap')
      ?.classList.contains('is-disabled')
  );
const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    db.seedVar(db.viewerUserId, 'scriptFiles-SIMOP1234', { files: {}, folders: ['tags'] });
    // Deliberately no cellModuleVersion: this sim is a legacy game.
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1200);

  const tab = await filesTab();
  assert.ok(tab, 'files tab should render');
  assert.equal(await filesTabDisabled(), true, 'files tab should be disabled pre-migration');

  await tab.click();
  await settle(600);
  assert.ok(await bodyHas(TOAST), 'clicking the disabled tab should show the upgrade toast');
  assert.equal(
    await bodyHas('Vote Messages'),
    false,
    'disabled tab click must not switch to the Files page'
  );

  // Migrate the game; the tab unlocks and switches normally. Write through
  // runMutation so active queries revalidate — seedListItem bypasses the
  // subscription flush.
  await page.evaluate(() => {
    window.__simDb.runMutation('user_lists:set', {
      key: 'cellModuleVersion',
      itemId: 'SIMOP1234',
      value: 1,
      privacy: 'PUBLIC',
    });
  });
  await settle(1200);
  assert.equal(await filesTabDisabled(), false, 'files tab should enable after migration');
  // Retry: a click landing while the migrated flag is mid-flip hits the
  // stale disabled branch; DOM click also avoids the hover-lift animation
  // moving the hit target.
  const filesActive = () =>
    page.evaluate(() =>
      document
        .querySelector('[data-testid="gametab-files"]')
        ?.closest('.guilded-game-tab-wrap')
        ?.classList.contains('is-active')
    );
  for (let attempt = 0; attempt < 5 && !(await filesActive()); attempt++) {
    await page.evaluate(() => document.querySelector('[data-testid="gametab-files"]').click());
    await settle(1500);
  }
  assert.ok(await filesActive(), 'enabled files tab should switch active');
  await page.waitForFunction(() => document.body.innerText.includes('Vote Messages'), {
    timeout: 15000,
  });

  console.log('PASS: files tab is disabled with an upgrade toast until the game migrates');
} finally {
  await browser.close();
}
