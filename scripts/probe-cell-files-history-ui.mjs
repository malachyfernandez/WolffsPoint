import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Regression probe: the Save history pill in a file-backed CELL editor
// (CellFilesEditorDialog via TagCellDisplay -> ExtraColumnFilesEditor) must
// open the Save history dialog. Previously the pill rendered with no history
// backing (file-less fileContext, no historyEntries) so the click was dead.
// Offline simulator only.
//   node scripts/probe-cell-files-history-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const clickText = (label, last = true) =>
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

const clickAria = (label) =>
  page.evaluate((label) => {
    const node = [...document.querySelectorAll('[aria-label]')].find(
      (n) => n.getAttribute('aria-label') === label && n.getBoundingClientRect().width
    );
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

const historyDialogVisible = () =>
  page.evaluate(() => /most recent saves/i.test(document.body.innerText));

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    const game = 'SIMOP1234';
    db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
      files: {
        f_inf: {
          id: 'f_inf',
          path: 'Test/Infectors',
          kind: 'markdown',
          source: 'CreateMarkdown({CONTENT = Markdown(`Infectors body`)});',
          updatedAt: 1,
        },
      },
      folders: ['Test'],
    });
    const cell = `File({PATH = "Test/Infectors", ID = "f_inf"});`;
    const seed = (key, value) => db.seedListItem(db.viewerUserId, key, game, value);
    seed('userTable', [
      {
        realName: 'Alice',
        email: 'alice@example.com',
        userId: 'test-Alice',
        role: '',
        playerData: { livingState: 'alive', extraColumns: [''] },
        days: [{ vote: '', action: '', voteMultiplier: 1, extraColumns: [cell] }],
      },
    ]);
    seed('userTableTitle', {
      extraUserColumns: ['Status'],
      extraDayColumns: ['Notes'],
      extraDayColumnTypes: ['files'],
    });
    seed('userTableColumnVisibility', { extraUserColumns: [true], extraDayColumns: [true] });
    seed('dayDatesArray', ['10/17/2026']);
    seed('selectedDayIndex', 0);
    seed('cellModuleVersion', 1);
  });
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await page.waitForSelector('[data-testid="gametab-players"]');
  await page.click('[data-testid="gametab-players"]');
  await settle(1500);

  // Open the file cell editor (TagCellDisplay -> ExtraColumnFilesEditor).
  assert.equal(await clickText('Infectors'), true, 'file cell row not found');
  await settle(1200);
  await page.screenshot({ path: '/tmp/probe-cell-files-history-editor.png' });

  // 1) Save history button must OPEN the dialog (empty state OK).
  assert.equal(await clickAria('Save history'), true, 'Save history button not found');
  await settle(800);
  assert.equal(await historyDialogVisible(), true, 'Save history dialog did not open');
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('No saved versions yet')),
    true,
    'expected the empty-history state'
  );
  await page.screenshot({ path: '/tmp/probe-cell-files-history-empty.png' });
  await page.keyboard.press('Escape');
  await settle(600);

  // 2) Make an edit -> Save -> an entry should land in history.
  //    Add a second file via the '+' add affordance? Simpler: toggle to Text
  //    mode and type a change.
  assert.equal(await clickText('Text'), true, 'Text toggle not found');
  await settle(600);
  const textArea = await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('textarea')].filter(
      (n) => n.getBoundingClientRect().width > 0
    );
    return nodes.at(-1) ?? null;
  });
  assert.ok(textArea, 'text-mode textarea not found');
  await textArea.asElement().click();
  await page.keyboard.sendCharacter('\n');
  await settle(300);
  assert.equal(await clickAria('Save'), true, 'Save button not found');
  await settle(800);

  // 3) Reopen history: the save must appear as an entry.
  assert.equal(await clickAria('Save history'), true, 'Save history button gone after save');
  await settle(800);
  assert.equal(await historyDialogVisible(), true, 'history dialog did not reopen');
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('No saved versions yet')),
    false,
    'save did not land in history'
  );
  await page.screenshot({ path: '/tmp/probe-cell-files-history-entry.png' });

  // 4) Click the entry -> preview must render the file CARD (read-only view
  //    of the version), not raw script text.
  assert.equal(
    await clickText('File({ PATH = "Test/Infectors", ID = "f_inf", });'),
    true,
    'history entry row not found'
  );
  await settle(1200);
  await page.screenshot({ path: '/tmp/probe-cell-files-history-preview.png' });
  // Scope to the preview modal: find the 'Preview Saved Version' header then
  // walk up to the dialog container (Cancel + Replace row).
  const preview = await page.evaluate(() => {
    const header = [...document.querySelectorAll('body *')].find(
      (n) => n.textContent.trim() === 'Preview Saved Version' && n.getBoundingClientRect().width
    );
    let modal = header;
    while (
      modal &&
      !(modal.textContent.includes('Cancel') && modal.textContent.includes('Replace'))
    ) {
      modal = modal.parentElement;
    }
    const inside = (text, exact = true) =>
      modal
        ? [...modal.querySelectorAll('*')].some(
            (n) =>
              (exact ? n.textContent.trim() === text : n.textContent.includes(text)) &&
              n.getBoundingClientRect().width
          )
        : false;
    // The interactive wrapper is the inert subtree: everything inside the
    // preview content must be under an inert ancestor.
    const inertRoot = modal ? modal.querySelector('[inert]') : null;
    return {
      found: !!modal,
      showsFileCard: inside('Infectors'),
      showsRawText: inside('File({'),
      hasRetarget: inside('Change File'),
      isInert: !!inertRoot,
    };
  });
  assert.equal(preview.showsFileCard, true, 'preview must render the file card');
  assert.equal(preview.showsRawText, false, 'preview must not show raw script text');
  assert.equal(preview.hasRetarget, false, 'preview file card must be untouchable');
  assert.equal(preview.isInert, true, 'preview content must be inert (non-interactive)');

  // 5) Real input: clicks inside the preview must be swallowed by inert, and
  //    a real wheel scroll must still move a scrollable region inside it.
  const target = await page.evaluate(() => {
    const inert = document.querySelector('[inert]');
    if (!inert) return null;
    const control = inert.querySelector('input, textarea, button, [role="button"]');
    const scrollable = [...inert.querySelectorAll('*')].find(
      (el) => el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4
    );
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    };
    return { control: rect(control), scroll: rect(scrollable), scrollerFound: !!scrollable };
  });
  assert.ok(target, 'inert wrapper must exist');
  if (target.control) {
    await page.mouse.click(target.control.x, target.control.y);
    await settle(500);
    const bodyAfter = await page.evaluate(() => document.body.innerText);
    assert.equal(
      bodyAfter.includes('Preview only'),
      false,
      'click inside preview must be swallowed, not reach handlers'
    );
    assert.equal(
      bodyAfter.includes('Preview Saved Version'),
      true,
      'preview dialog must still be open after clicking inside it'
    );
  }
  if (target.scrollerFound && target.scroll) {
    const read = () =>
      page.evaluate(() => {
        const inert = document.querySelector('[inert]');
        const s = [...inert.querySelectorAll('*')].find(
          (el) => el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4
        );
        return s ? s.scrollTop + s.scrollLeft : -1;
      });
    const before = await read();
    await page.mouse.move(target.scroll.x, target.scroll.y);
    await page.mouse.wheel({ deltaY: 200 });
    await settle(400);
    assert.ok((await read()) > before, 'scrolling must still work inside the inert preview');
  }

  console.log('PASS: file-cell editor save history opens and records saves');
} finally {
  await browser.close();
}
