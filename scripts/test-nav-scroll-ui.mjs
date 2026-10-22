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

  // Seed a v2 modular game: rulebook with long content + NavButton + aboutRole folder.
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 2);
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        role_a: {
          id: 'role_a',
          path: 'aboutRole/New Role',
          kind: 'markdown',
          source: 'CreateMarkdown({CONTENT = Markdown(`NEW ROLE - No description set`)});',
          updatedAt: 1,
        },
      },
      folders: ['aboutRole'],
      folderIds: { folder_about_role: 'aboutRole' },
    });
    const longMarkdown = Array.from(
      { length: 40 },
      (_, i) => `## Section ${i + 1}\n\nRules paragraph ${i + 1}. `.repeat(1)
    ).join('\n\n');
    db.seedVar(
      db.viewerUserId,
      `ruleBook-${game}`,
      {
        content: '# Legacy',
        roleOrder: [],
        ruleBookTitle: 'Book of WolffsPoint',
        modularContent:
          `CreateMarkdown({CONTENT = Markdown(\`${longMarkdown}\`)});\n` +
          'NavButton({LABEL = "Role Descriptions"}) { Folder({PATH = "aboutRole"}); }',
      },
      { privacy: 'PUBLIC' }
    );
  });

  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-rulebook"]');
  await settle(1500);
  await page.click('[data-testid="gametab-rulebook"]');
  await settle(800);
  await page.waitForSelector('[data-testid="config-open-rulebook"]');
  await page.click('[data-testid="config-open-rulebook"]');
  await settle(1200);

  // The nav row should exist (folder contents hidden until clicked).
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button,[tabindex]')].some(
      (n) => n.textContent.trim() === 'Role Descriptions'
    )
  );

  // The scroller is an inner element, not the window: tag every scrollable
  // ancestor of the nav row (they survive the screen swap) and compare their
  // scroll offsets before and after.
  const scrollables = () =>
    page.evaluate(() => {
      const tagged = [...document.querySelectorAll('[data-navscroll]')];
      return {
        windowY: window.scrollY,
        scrolls: tagged.map((el) => `${el.dataset.navscroll}:${el.scrollTop},${el.scrollLeft}`),
      };
    });
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('button,[tabindex]')].find(
      (n) => n.textContent.trim() === 'Role Descriptions'
    );
    let el = row;
    let i = 0;
    while (el) {
      if (el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4)
        el.dataset.navscroll = `a${i++}`;
      el = el.parentElement;
    }
  });

  // Bring the nav row into view: every scrollable ancestor ends up at a
  // non-trivial position, so a stray scrollIntoView would visibly move them.
  await page.evaluate(() => {
    [...document.querySelectorAll('button,[tabindex]')]
      .find((n) => n.textContent.trim() === 'Role Descriptions')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await settle(300);
  const before = await scrollables();
  assert.ok(
    before.windowY > 0 || before.scrolls.some((s) => !s.endsWith(':0,0')),
    `expected something scrolled, got ${JSON.stringify(before)}`
  );
  const rowTop = await page.evaluate(
    () =>
      [...document.querySelectorAll('button,[tabindex]')]
        .find((n) => n.textContent.trim() === 'Role Descriptions')
        .getBoundingClientRect().top
  );

  await clickText('Role Descriptions');
  await settle(1200);

  // The pushed screen lifts the scroll so it starts at the viewport top:
  // scrollers may only move UP (never down toward the bottom), no anchor
  // padding may linger above the Back row, and the screen top lands at ~0.
  const after = await scrollables();
  for (let i = 0; i < before.scrolls.length; i++) {
    const [tag, beforeXY] = before.scrolls[i].split(':');
    const [, afterXY] = after.scrolls[i].split(':');
    const beforeTop = Number(beforeXY.split(',')[0]);
    const afterTop = Number(afterXY.split(',')[0]);
    assert.ok(
      afterTop <= beforeTop + 0.5,
      `scroller ${tag} moved down ${beforeTop} -> ${afterTop}`
    );
  }
  const backTop = await page.evaluate(
    () => document.querySelector('button[aria-label="Back"]')?.getBoundingClientRect().top
  );
  assert.ok(backTop !== undefined && backTop !== null, 'no Back button after nav push');
  assert.ok(
    backTop > -40 && backTop <= Math.max(rowTop + 1, 320),
    `screen top not aligned near viewport top: row ${rowTop} -> back ${backTop}`
  );
  // The Back row must land below any chrome pinned to the viewport top —
  // nothing should cover its center.
  const cover = await page.evaluate(() => {
    const back = document.querySelector('button[aria-label="Back"]');
    if (!back) return 'no back button';
    const r = back.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || back.contains(hit) || hit.contains(back)) return null;
    return `${hit.tagName} ${String(hit.className).slice(0, 60)}`;
  });
  assert.equal(cover, null, `Back row covered by overlay: ${cover}`);
  const padLeft = await page.evaluate(() => {
    const back = document.querySelector('button[aria-label="Back"]');
    // The pushed screen's own View is the Back row's grandparent.
    return back?.parentElement?.parentElement?.style?.paddingTop ?? '';
  });
  assert.equal(
    padLeft === '' || padLeft === '0px',
    true,
    `residual anchor padding left behind: ${padLeft}`
  );

  // Nested screen content rendered (aboutRole file expanded inside the nav screen).
  await page.waitForFunction(() => document.body.innerText.includes('NEW ROLE'));

  // Back restores the root screen and the captured scroll: the nav row returns
  // to (roughly) its previous viewport position.
  const back = await page.waitForSelector('button[aria-label="Back"]');
  await back.click();
  // The restore animates (smooth scroll) — wait until offsets stop moving.
  let afterBack = await scrollables();
  for (let i = 0; i < 40; i++) {
    await settle(250);
    const next = await scrollables();
    if (JSON.stringify(next) === JSON.stringify(afterBack)) break;
    afterBack = next;
  }
  assert.equal(
    JSON.stringify(afterBack),
    JSON.stringify(before),
    `scroll shifted on back ${JSON.stringify(before)} -> ${JSON.stringify(afterBack)}`
  );
  const rowTopAfter = await page.evaluate(
    () =>
      [...document.querySelectorAll('button,[tabindex]')]
        .find((n) => n.textContent.trim() === 'Role Descriptions' && n.tagName === 'BUTTON')
        ?.getBoundingClientRect().top
  );
  assert.ok(rowTopAfter !== undefined, 'nav row missing after back');
  assert.ok(
    Math.abs(rowTopAfter - rowTop) < 80,
    `row did not return to its position: ${rowTop} -> ${rowTopAfter}`
  );

  assert.deepEqual(errors, []);
  console.log('nav-scroll verification passed: screen anchors to clicked row, back restores');
} finally {
  await browser.close();
}
