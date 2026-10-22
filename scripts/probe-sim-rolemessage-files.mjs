import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Regression probe: a file-backed roleMessage (File({PATH, ID}) cell refs) must
// render in the sim persona's ACTION panel. Previously an auto-created empty
// persona-scoped scriptFiles item shadowed the shared sim record, leaving the
// files index empty and the action panel blank. Offline simulator only.
//   node scripts/probe-sim-rolemessage-files.mjs http://localhost:8084
const URL = process.argv[2] ?? 'http://localhost:8084';
const GAME = 'SIMOP1234';
const SIM_GAME = `${GAME}:sim`;
const VIEWER = 'user_sim_operator';
const EMAIL = 'infector@sim.local';
const PERSONA = 'infector'; // personaIdForEmail('infector@sim.local')
const PERSONA_ITEM = `sim:${PERSONA}`;

const FILE_LIST_CELL = `File({
  PATH = "roleMessage/Infector",
  ID = "f_infector",
});

File({
  PATH = "roleMessage/Infector Selector",
  ID = "f_selector",
});`;

const FILES_DOC = {
  files: {
    f_infector: {
      id: 'f_infector',
      path: 'roleMessage/Infector',
      kind: 'markdown',
      updatedAt: 1,
      source: 'CreateMarkdown({CONTENT = Markdown(`# You are the Infector`)})',
    },
    f_selector: {
      id: 'f_selector',
      path: 'roleMessage/Infector Selector',
      kind: 'markdown',
      updatedAt: 1,
      source: 'CreateMarkdown({CONTENT = Markdown(`Choose your victim below`)})',
    },
  },
  folders: ['roleMessage'],
};

const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));

try {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'offline sim required');

  // 1) Seed live records: scriptFiles var + an Infector role with a file-list
  //    roleMessage (mirrors the user's cell).
  await page.evaluate(
    ({ GAME, FILE_LIST_CELL, FILES_DOC, VIEWER }) => {
      const db = window.__simDb;
      db.seedVar(VIEWER, `scriptFiles-${GAME}`, FILES_DOC);
      const roleTable =
        db.runQuery('user_lists:get', { key: 'roleTable', itemId: GAME })?.value ?? [];
      const idx = roleTable.findIndex((r) => r.role === 'Infector');
      const row = {
        ...(idx >= 0 ? roleTable[idx] : roleTable[0]),
        role: 'Infector',
        roleMessage: FILE_LIST_CELL,
      };
      if (idx >= 0) roleTable[idx] = row;
      else roleTable.push(row);
      db.runMutation('user_lists:set', { key: 'roleTable', itemId: GAME, value: roleTable });
    },
    { GAME, FILE_LIST_CELL, FILES_DOC, VIEWER }
  );

  // 2) Open the game and hit "Start sim" so the app's own snapshotConfig
  //    writes the sim:SIMOP1234:* records.
  await page.waitForSelector(`[data-testid="game-${GAME}"]`);
  await page.click(`[data-testid="game-${GAME}"]`);
  await settle(1500);
  const startBtn = await page.waitForFunction(() =>
    [...document.querySelectorAll('div')].find(
      (n) => n.textContent.trim() === 'Start sim' && n.getBoundingClientRect().width
    )
  );
  await startBtn.asElement().click();
  await settle(2500);

  // 3) Populate the roster + flip to persona view.
  await page.evaluate(
    ({ GAME, SIM_GAME, VIEWER, EMAIL, PERSONA_ITEM }) => {
      const db = window.__simDb;
      const player = {
        id: 'p_infector',
        realName: 'Infector One',
        email: EMAIL,
        userId: PERSONA_ITEM,
        role: 'Infector',
        playerData: { livingState: 'alive', extraColumns: [] },
        days: [{ id: undefined, vote: '', action: '', extraColumns: [] }],
      };
      db.runMutation('user_lists:set', {
        key: `sim:${GAME}:userTable`,
        itemId: SIM_GAME,
        value: [player],
      });
      db.runMutation('user_lists:set', {
        key: `sim:${GAME}:userData`,
        itemId: PERSONA_ITEM,
        value: { name: 'Infector One', email: EMAIL, userId: PERSONA_ITEM },
      });
      db.runMutation('user_lists:set', {
        key: `sim:${GAME}:playerProfile-${SIM_GAME}`,
        itemId: PERSONA_ITEM,
        value: {
          gameId: SIM_GAME,
          email: EMAIL,
          userId: PERSONA_ITEM,
          inGameName: 'Infector One',
          profileImageUrl: '',
          phoneNumber: '',
          instagram: '',
          discord: '',
          otherContact: '',
          bioMarkdown: '',
          claimedAt: Date.now(),
        },
      });
      // Clear stray persona-scoped items left by earlier (pre-fix) runs so the
      // assertions below measure only what this run creates.
      const filesKey = `sim:${GAME}:scriptFiles-${GAME}:sim`;
      for (const item of [...db.listItems.values()]) {
        if (item.key === filesKey && item.itemId !== 'sim:shared') {
          db.runMutation('user_lists:remove', { key: filesKey, itemId: item.itemId });
        }
      }
      console.log('=== PERSONA FLIP ===');
      db.runMutation('user_vars:set', {
        key: `simSession-${GAME}`,
        value: {
          enabled: true,
          view: 'persona',
          personaId: 'infector',
          personaName: 'Infector One',
        },
      });
    },
    { GAME, SIM_GAME, VIEWER, EMAIL, PERSONA_ITEM }
  );
  await settle(1500);

  // 4) Diagnostics: what do the persona's finds see at the scriptFiles key?
  const diag = await page.evaluate(
    ({ GAME, VIEWER }) => {
      const db = window.__simDb;
      const key = `sim:${GAME}:scriptFiles-${GAME}:sim`;
      const items = [...db.listItems.values()]
        .filter((i) => i.key === key)
        .map((i) => ({
          itemId: i.itemId,
          lastModified: i.lastModified,
          fileCount: Object.keys(i.value?.files ?? {}).length,
        }));
      const found = db.runQuery('user_lists_get:search', {
        key,
        userIds: [VIEWER],
        returnTop: 10,
      });
      return {
        items,
        found: found.map((r) => ({ itemId: r.itemId, files: Object.keys(r.value?.files ?? {}) })),
        session: db.runQuery('user_vars:get', { key: `simSession-${GAME}` })?.value,
      };
    },
    { GAME, VIEWER }
  );
  console.log('SCRIPTFILES KEY ITEMS:', JSON.stringify(diag.items));
  console.log('FIND RESULTS:', JSON.stringify(diag.found));
  console.log('SESSION:', JSON.stringify(diag.session));

  const mutations = await page.evaluate(() =>
    window.__simDb.stats.mutationLog
      .map((m) => m.name)
      .filter((n) => n.includes('scriptFiles') || n.includes('tagDefinitions'))
  );
  console.log('SCRIPTFILES/TAGDEF MUTATIONS:', JSON.stringify(mutations));

  // A mounted writable reader must not create a persona-scoped shadow record;
  // the only item at the shared key is the snapshotted 'sim:shared' doc.
  assert.deepEqual(
    diag.items.map((i) => i.itemId),
    ['sim:shared'],
    'persona-scoped scriptFiles item shadowed the shared doc'
  );
  assert.equal(diag.items[0]?.fileCount, 2, 'shared scriptFiles doc missing files');
  assert.equal(diag.session?.view, 'persona', 'sim session did not flip to the persona view');

  // 5) What does the persona page render? The session flip mounts the persona
  //    tree on the open game page - open YOUR EYES ONLY and read the action.
  await settle(3000);
  const preText = await page.evaluate(() => document.body.innerText);
  console.log('--- PRE-CLICK PAGE TEXT (first 700) ---');
  console.log(preText.slice(0, 700));
  const eyesOnly = await page.waitForFunction(
    () => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const matches = [...document.querySelectorAll('body *')].filter(
        (n) => norm(n.textContent) === 'your eyes only' && n.getBoundingClientRect().width
      );
      // innermost match wins (the label node, not a tab-bar ancestor)
      return matches.find(
        (n) => ![...n.children].some((c) => norm(c.textContent) === 'your eyes only')
      );
    },
    { timeout: 15000 }
  );
  await eyesOnly.asElement().click();
  await settle(2500);
  const text1 = await page.evaluate(() => document.body.innerText);
  console.log('--- PAGE TEXT (first 1500) ---');
  console.log(text1.slice(0, 1500));
  assert.ok(
    text1.includes('You are the Infector'),
    'roleMessage file content missing from the action panel'
  );
  assert.ok(
    text1.includes('Choose your victim below'),
    'selector file content missing from the action panel'
  );
  assert.ok(
    !text1.includes('do not have any action'),
    'file-backed role message fell back to the empty-action message'
  );
  console.log('PASS: file-backed roleMessage renders in the persona action panel');
} finally {
  await browser.close();
}
