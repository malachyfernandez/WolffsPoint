import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Regression probe: the "Add content" composition picker (CompositionInsertDialog)
// must not have dead space at the bottom. Nested closed dialog roots
// (AddTagDialog + its UnsavedChangesDialog) rendered as non-hidden empty
// children inside the gap-3 column, each eating a 12px flex gap — pushing
// the content up with dead space pooled at the bottom.
// Offline simulator only.
//   node scripts/probe-add-content-layout-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1400 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const clickText = (label) =>
  page.evaluate((label) => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const nodes = [...document.querySelectorAll('body *')].filter(
      (n) => norm(n.textContent) === label && n.getBoundingClientRect().width
    );
    const node = nodes.at(-1);
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

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        f_one: {
          id: 'f_one',
          path: 'Notes',
          kind: 'markdown',
          source: 'CreateMarkdown({CONTENT = Markdown(`Note body`)});',
          updatedAt: 1,
        },
      },
      folders: [],
    });
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [{ vote: '', action: '', voteMultiplier: 1, extraColumns: [''] }],
      },
    ]);
    seed('userTableTitle', {
      extraUserColumns: [],
      extraDayColumns: ['Notes'],
      extraDayColumnTypes: ['files'],
    });
    seed('userTableColumnVisibility', { extraUserColumns: [], extraDayColumns: [true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
    seed('cellModuleVersion', 2);
  });
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-players"]');
  await page.click('[data-testid="gametab-players"]');
  await settle(1500);

  // Open the empty files cell editor -> empty-state chooser -> Files / Blocks.
  assert.equal(await clickText('UNSET'), true, 'empty files cell not found');
  await settle(1200);
  assert.equal(await clickText('Files / Blocks'), true, 'Files / Blocks chooser not found');
  await settle(1200);
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Add content')),
    true,
    'Add content dialog did not open'
  );
  await page.screenshot({ path: '/tmp/probe-add-content-dialog.png' });

  // Inside the dialog's h-[75vh] column, every nested closed dialog root must
  // be display:none — no non-hidden empty children left to eat the gap-3.
  const layout = await page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    // Find the dialog frame that contains the "Add content" header.
    const headers = [...document.querySelectorAll('body *')].filter(
      (n) => norm(n.textContent) === 'Add content' && n.children.length === 0
    );
    const header = headers.at(-1);
    if (!header) return { error: 'no header' };
    const frame = header.closest('.guilded-frame-content');
    if (!frame) return { error: 'no frame' };
    // The main column is the gap-3 flex column inside the 75vh view.
    const column = [...frame.querySelectorAll('div')].find((d) => d.style.gap === '12px');
    if (!column) return { error: 'no column' };
    const children = [...column.children];
    const nonHiddenEmpties = children.filter(
      (c) => c.children.length === 0 && !c.classList.contains('hidden')
    );
    // Visible bottom slack: distance from the last visible child's bottom to
    // the column's bottom.
    const columnRect = column.getBoundingClientRect();
    const visible = children.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 0 && getComputedStyle(c).display !== 'none';
    });
    const lastVisible = visible.at(-1);
    const lastRect = lastVisible.getBoundingClientRect();
    // Extra viewport height pools below the fixed-height file list; the
    // selector row is the top spacer, so slack must split evenly: the space
    // above the Files/Blocks pill ~= the space below the last list row.
    const pill = [...column.querySelectorAll('button')].find(
      (b) => norm(b.textContent) === 'Files'
    );
    const topSpace = pill ? pill.getBoundingClientRect().top - columnRect.top : -1;
    // The leftover slack lives as unallocated space inside the stretched
    // list container, between the last file row/pane and the buttons row.
    const innerCol = [...column.querySelectorAll('div')].find(
      (d) => d.style.gap === '12px' && d !== column
    );
    let bottomSpace = -1;
    if (innerCol) {
      const innerChildren = [...innerCol.children].filter((c) => {
        const r = c.getBoundingClientRect();
        return r.height > 0 && getComputedStyle(c).display !== 'none';
      });
      const buttonsRow = innerChildren.at(-1);
      if (buttonsRow) {
        const buttonsTop = buttonsRow.getBoundingClientRect().top;
        const contentBottom = Math.max(
          ...[...innerCol.querySelectorAll('*')]
            .map((d) => d.getBoundingClientRect().bottom)
            .filter((b) => b < buttonsTop - 14)
        );
        bottomSpace = buttonsTop - contentBottom - 12; // minus the column gap
      }
    }
    return {
      childCount: children.length,
      nonHiddenEmptyCount: nonHiddenEmpties.length,
      bottomSlack: Math.round(columnRect.bottom - lastRect.bottom),
      topSpace: Math.round(topSpace),
      bottomSpace: Math.round(bottomSpace),
    };
  });
  console.log('layout:', JSON.stringify(layout));
  assert.equal(layout.nonHiddenEmptyCount, 0, 'non-hidden closed dialog roots still in the column');
  assert.ok(
    layout.bottomSlack <= 4,
    `expected no bottom slack inside the column, got ${layout.bottomSlack}px`
  );
  // Top spacer must exist and share the slack: at 1400px viewport there is
  // real extra height, so topSpace should be well above the base gap and
  // roughly equal to the space pooled under the file list.
  assert.ok(layout.topSpace > 20, `top spacer missing/too small: ${layout.topSpace}px`);
  assert.ok(
    Math.abs(layout.topSpace - layout.bottomSpace) <= 32,
    `slack not split: top=${layout.topSpace}px bottom=${layout.bottomSpace}px`
  );

  // Files/Blocks switch still works.
  assert.equal(await clickText('Blocks'), true, 'Blocks tab not found');
  await settle(600);
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Nav Button')),
    true,
    'Blocks panel did not render'
  );
  await page.screenshot({ path: '/tmp/probe-add-content-blocks.png' });
  assert.equal(await clickText('Files'), true, 'Files tab not found');
  await settle(600);
  assert.equal(await clickText('Cancel'), true, 'Cancel not found');
  await settle(800);

  console.log('probe-add-content-layout-ui: PASS');
} catch (e) {
  await page.screenshot({ path: '/tmp/probe-add-content-fail.png' });
  console.error('probe-add-content-layout-ui: FAIL', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
