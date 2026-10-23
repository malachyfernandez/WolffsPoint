import assert from 'node:assert/strict';
import { launch } from 'puppeteer';
import JSZip from 'jszip';

// Probe: right-click folder archive actions in the file browser.
// "Download folder" produces a .folder.zip (manifest + per-file sources);
// "Import folder…" picks a previously-exported zip and recreates it as a new
// folder with remapped ids and rewritten internal refs. Both actions live
// ONLY in context menus.
// Offline simulator only.
//   node scripts/probe-folder-archive-ui.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const bodyHas = (text) => page.evaluate((t) => document.body.innerText.includes(t), text);

/** Right-click the folder row labeled `label` in the list view. */
const rightClickFolder = async (label) =>
  page.evaluate((lbl) => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.childElementCount > 0 &&
        [...el.querySelectorAll('*')].length < 40 &&
        el.innerText?.split('\n')[0]?.trim() === lbl &&
        /items|empty/.test(el.innerText)
    );
    const row = candidates.sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!row) return false;
    const r = row.getBoundingClientRect();
    row.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      })
    );
    return true;
  }, label);

/** Click a context-menu item by its label text (menu is portaled). */
const clickMenuItem = async (label) =>
  page.evaluate((lbl) => {
    const el = [...document.querySelectorAll('div')].find(
      (el) => el.children.length <= 2 && el.innerText?.trim() === lbl
    );
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    el.click?.();
    return true;
  }, label);

const menuHas = (label) =>
  page.evaluate(
    (lbl) =>
      [...document.querySelectorAll('div')].some(
        (el) => el.children.length <= 2 && el.innerText?.trim() === lbl
      ),
    label
  );

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');
  await page.evaluate(() => {
    const db = window.__simDb;
    db.seedVar(db.viewerUserId, 'scriptFiles-SIMOP1234', {
      files: {
        f_a: { id: 'f_a', path: 'pack/Alpha', kind: 'markdown', source: 'M', updatedAt: 1 },
        f_b: {
          id: 'f_b',
          path: 'pack/Beta',
          kind: 'script',
          role: 'trigger',
          source: 'File({PATH = "pack/Alpha", ID = "f_a"});',
          updatedAt: 1,
        },
        f_c: {
          id: 'f_c',
          path: 'pack/sub/Gamma',
          kind: 'script',
          role: 'display',
          source: 'Folder({ID = "folder_sub", ORDER = ["f_c", "f_b"], HIDDEN = ["f_a"]});',
          updatedAt: 1,
        },
      },
      folders: ['pack', 'pack/sub', 'pack/empty'],
      folderIds: {
        folder_pack: 'pack',
        folder_sub: 'pack/sub',
        folder_empty: 'pack/empty',
      },
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
    if (await bodyHas('pack')) break;
  }
  assert.ok(await bodyHas('pack'), 'seeded pack folder should render');

  // Neither action exists outside a context menu.
  assert.equal(await bodyHas('Download folder'), false, 'Download must be context-menu only');
  assert.equal(await bodyHas('Import folder'), false, 'Import must be context-menu only');

  // Capture the download instead of writing a file.
  await page.evaluate(() => {
    window.__captured = null;
    const origCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      window.__captured = blob;
      return origCreate(blob);
    };
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) return;
      origClick.call(this);
    };
  });

  assert.ok(await rightClickFolder('pack'), 'pack row should exist');
  await settle(400);
  assert.ok(await menuHas('Download folder'), 'folder menu needs Download folder');
  assert.ok(await menuHas('Import folder…'), 'folder menu needs Import folder…');
  assert.ok(await clickMenuItem('Download folder'), 'download menu item should click');
  await settle(800);
  await page.screenshot({ path: 'scripts/tmp-folder-archive-menu.png' });

  const zipB64 = await page.evaluate(async () => {
    const blob = window.__captured;
    if (!blob) return null;
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (const b of buf) bin += String.fromCharCode(b);
    return btoa(bin);
  });
  assert.ok(zipB64, 'download should produce a blob');
  const zip = await JSZip.loadAsync(Buffer.from(zipB64, 'base64'));
  const manifestEntry = zip.file('wolffspoint-folder.json');
  assert.ok(manifestEntry, 'archive needs the manifest');
  const manifest = JSON.parse(await manifestEntry.async('string'));
  assert.equal(manifest.format, 'wolffspoint-folder');
  assert.equal(manifest.name, 'pack');
  assert.deepEqual([...manifest.folders].sort(), ['', 'empty', 'sub']);
  assert.equal(manifest.files.length, 3);
  assert.equal(manifest.folderIds.folder_sub, 'sub');
  for (const entry of manifest.files) {
    assert.ok(zip.file(entry.entry), `missing entry ${entry.entry}`);
  }
  const beta = manifest.files.find((f) => f.path === 'Beta');
  assert.equal(beta.role, 'trigger');
  const betaSource = await zip.file(beta.entry).async('string');
  assert.ok(betaSource.includes('ID = "f_a"'), 'source must round-trip verbatim');

  // Feed the same zip back through the picker hook.
  await page.evaluate((b64) => {
    const bytes = new Uint8Array(
      atob(b64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    window.__pendingFile = new File([bytes], 'pack.folder.zip', { type: 'application/zip' });
    const origCreate = Document.prototype.createElement;
    document.createElement = function (...args) {
      const el = origCreate.apply(this, args);
      if (args[0] === 'input') {
        const origClick = el.click.bind(el);
        el.click = () => {
          if (el.type === 'file' && window.__pendingFile) {
            Object.defineProperty(el, 'files', {
              value: [window.__pendingFile],
              configurable: true,
            });
            el.dispatchEvent(new Event('change'));
          } else origClick();
        };
      }
      return el;
    };
  }, zipB64);

  // Import inside pack -> creates pack/pack with remapped ids + rewritten refs.
  assert.ok(await rightClickFolder('pack'), 'pack row should exist for import');
  await settle(400);
  assert.ok(await clickMenuItem('Import folder…'), 'import menu item should click');
  await settle(1200);

  const imported = await page.evaluate(() => {
    const doc = window.__simDb.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' })?.value;
    const files = Object.values(doc?.files ?? {});
    const nested = files.find((f) => f.path === 'pack/pack/Alpha');
    const nestedBeta = files.find((f) => f.path === 'pack/pack/Beta');
    const nestedGamma = files.find((f) => f.path === 'pack/pack/sub/Gamma');
    return {
      hasAlpha: !!nested,
      alphaId: nested?.id,
      alphaKind: nested?.kind,
      betaSource: nestedBeta?.source,
      betaRole: nestedBeta?.role,
      gammaSource: nestedGamma?.source,
      folders: doc?.folders ?? [],
    };
  });
  assert.ok(imported.hasAlpha, 'imported tree should land at pack/pack');
  assert.equal(imported.alphaKind, 'markdown');
  assert.equal(imported.betaRole, 'trigger');
  assert.notEqual(imported.alphaId, 'f_a', 'colliding file id must be remapped');
  assert.ok(
    imported.betaSource.includes(`ID = "${imported.alphaId}"`),
    `ID ref should be remapped, got: ${imported.betaSource}`
  );
  assert.ok(
    imported.betaSource.includes('PATH = "pack/pack/Alpha"'),
    `PATH ref should follow the new root, got: ${imported.betaSource}`
  );
  assert.ok(
    imported.gammaSource.includes(`"${imported.alphaId}"`),
    `ORDER/HIDDEN ids should be remapped, got: ${imported.gammaSource}`
  );
  assert.ok(imported.folders.includes('pack/pack/empty'), 'empty folder should import');

  console.log('PASS: folder download/import round-trips via right-click context menus');
} finally {
  await browser.close();
}
