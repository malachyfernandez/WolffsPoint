import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Probe: rendered top spacing inside dialogs. DialogHeader bleeds to the
// frame edge; the first painted element below it must sit exactly mb-3 (12px)
// under the banner - measured on the real DOM, not class strings.
// Covers the file editor (previously had stacked pt-2 + pt-2) and the small
// "New folder" prompt (hoisted/stripped family).
// Offline simulator only.
//   node scripts/probe-dialog-top-spacing.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

/**
 * Gap between the bottom edge of the top-most visible DialogHeader banner
 * (`.minimize-hide` with a bg) and the top of the next painted element that
 * starts below it (any element with a solid bg, border, or text). Returns
 * { gap, label } or null when no open dialog has a header.
 */
const measureHeaderGap = () =>
  page.evaluate(() => {
    const headers = [...document.querySelectorAll('.minimize-hide')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 100 && r.height > 10 && getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)';
    });
    const header = headers[headers.length - 1];
    if (!header) return null;
    const hBottom = header.getBoundingClientRect().bottom;
    const dialog = header.closest('[role="dialog"]') ?? header.parentElement;
    let best = null;
    for (const el of dialog.querySelectorAll('*')) {
      if (el === header || header.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width) continue;
      const top = r.top;
      if (top < hBottom - 0.5) continue;
      const cs = getComputedStyle(el);
      const ownText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent.trim()
      );
      const solidBg =
        cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
      const border = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      if (!ownText && !solidBg && !border) continue;
      if (!best || top < best.top)
        best = { top, label: (el.textContent || el.tagName).trim().slice(0, 40) };
    }
    return best ? { gap: Math.round((best.top - hBottom) * 10) / 10, label: best.label } : null;
  });

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    db.seedVar(db.viewerUserId, 'scriptFiles-SIMOP1234', {
      files: {
        f_a: {
          id: 'f_a',
          path: 'pack/Alpha',
          kind: 'script',
          role: 'display',
          source: 'CreateMarkdown({TEXT = "hi"});',
          updatedAt: 1,
        },
      },
      folders: ['pack'],
      folderIds: { folder_pack: 'pack' },
    });
    db.runMutation('user_lists:set', {
      key: 'cellModuleVersion',
      itemId: 'SIMOP1234',
      value: 1,
      privacy: 'PUBLIC',
    });
  });
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => document.querySelector('[data-testid="gametab-files"]').click());
    await settle(1200);
    if (await bodyHas('Alpha')) break;
  }
  assert.ok(await bodyHas('Alpha') || (await bodyHas('pack')), 'seeded content should render');

  // List view shows the toolbar buttons and flat file rows.
  const clickAriaLabel = (label) =>
    page.evaluate((lbl) => {
      const el = document.querySelector(`[aria-label="${lbl}"]`);
      if (!el) return false;
      // Single synthetic click - a second el.click() would double-toggle.
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, label);
  await clickAriaLabel('List view');
  await settle(900);
  // Folders render collapsed - expand them so nested files appear.
  for (let i = 0; i < 4; i++) {
    if (!(await clickAriaLabel('Expand folder'))) break;
    await settle(400);
  }
  assert.ok(await bodyHas('Alpha'), 'Alpha file row should render in list view');

  // Dialog 1: the small "New folder" prompt (hoisted header family).
  const newFolderBtn = await clickAriaLabel('New Folder');
  if (newFolderBtn) {
    await settle(900);
    const m = await measureHeaderGap();
    console.log('new-folder prompt gap:', JSON.stringify(m));
    assert.ok(m && Math.abs(m.gap - 12) <= 1, `expected ~12px header gap, got ${m?.gap}`);
    // The first Escape only unfocuses the input - dismiss until the dialog is gone.
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      await settle(500);
      if ((await page.evaluate(() => document.querySelectorAll('[role="dialog"]').length)) === 0)
        break;
    }
    assert.equal(
      await page.evaluate(() => document.querySelectorAll('[role="dialog"]').length),
      0,
      'new-folder prompt should be dismissed'
    );
  } else {
    console.log('no New Folder button found - skipping prompt measure');
  }

  // Dialog 2: open the file in the script editor (the screenshot case).
  // First click selects the row; the second opens the editor.
  const clickAlpha = () =>
    page.evaluate(() => {
      const row = [...document.querySelectorAll('div')].filter(
        (el) => el.innerText?.trim() === 'Alpha'
      );
      // Innermost match: clicks bubble up to the row's Pressable.
      const el = row.sort((a, b) => a.innerText.length - b.innerText.length).pop() ?? row[0];
      if (!el) return false;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: r.left + 10,
          clientY: r.top + 5,
        })
      );
      return true;
    });
  for (let i = 0; i < 5; i++) {
    await clickAlpha();
    await settle(1400);
    if (await page.evaluate(() => !!document.querySelector('[aria-label="File options"]'))) break;
  }
  assert.ok(
    await page.evaluate(() => !!document.querySelector('[aria-label="File options"]')),
    'file editor should open (File options button)'
  );
  const m2 = await measureHeaderGap();
  console.log('file editor gap:', JSON.stringify(m2));
  assert.ok(m2 && Math.abs(m2.gap - 12) <= 1, `expected ~12px header gap, got ${m2?.gap}`);

  console.log('dialog top-spacing probe passed');
} finally {
  await browser.close();
}
