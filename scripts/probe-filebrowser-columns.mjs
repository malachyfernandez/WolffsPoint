import { launch } from 'puppeteer';

const url = 'http://localhost:8083';
const browser = await launch({ headless: true, defaultViewport: { width: 1280, height: 950 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
const settle = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const clickText = async (text, timeout = 10_000) => {
  const control = await page.waitForFunction(
    (target) => {
      return [...document.querySelectorAll('[tabindex],button')].find((node) => {
        if (node.textContent.trim() !== target) return false;
        const box = node.getBoundingClientRect();
        return (
          box.width > 0 &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      });
    },
    { timeout },
    text
  );
  await control.asElement().click();
  await settle();
};

await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
await page.evaluate(() => {
  const db = window.__simDb;
  const game = 'SIMOP1234';
  const mk = (id, path) => ({
    id,
    path,
    kind: 'markdown',
    source: `CreateMarkdown({CONTENT = Markdown(\`${path} body\`)});`,
    updatedAt: 1,
  });
  db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
    files: {
      f_inf: mk('f_inf', 'roleMessage/infector'),
      f_heal: mk('f_heal', 'roleMessage/healer'),
      f_vote: mk('f_vote', 'voteMessage/vote'),
      f_tmpl: mk('f_tmpl', 'templates/tmpl'),
      f_root: mk('f_root', 'loose'),
    },
    folders: ['roleMessage', 'voteMessage', 'morningMessage', 'tags', 'templates'],
  });
  db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'columns');
  db.seedListItem(db.viewerUserId, 'roleTable', game, [
    {
      role: 'Infector',
      doesRoleVote: true,
      isVisible: true,
      roleMessage: 'File({PATH = "roleMessage/infector", ID = "f_inf"});',
      voteMessage: '',
      aboutRole: '',
    },
  ]);
});
await page.waitForSelector('[data-testid="game-SIMOP1234"]');
await page.click('[data-testid="game-SIMOP1234"]');
await page.waitForSelector('[data-testid="gametab-config"]');
await settle(1000);
await page.evaluate(() => document.querySelector('[data-testid="gametab-config"]')?.click());
await settle(2000);
await clickText('infector');
await settle(1200);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('[aria-label="Change file"], [aria-label="Change File"]')].find(
    (n) => n.getBoundingClientRect().width > 0
  );
  btn?.click();
});
await settle(1500);
console.log('picker open:', await page.evaluate(() => document.body.innerText.includes('Choose a file')));

// ── CHECK 1: default selection inside roleMessage ──
const defaultSel = await page.evaluate(() => {
  // Row-level divs in the pick dialog: text 'healer'/'infector' with the
  // dark selection class (bg-text without a slash-alpha variant).
  const out = {};
  for (const name of ['healer', 'infector']) {
    const node = [...document.querySelectorAll('div')].find(
      (n) => n.textContent.trim() === name && n.children.length >= 2 && n.getBoundingClientRect().width > 0
    );
    out[name] = node ? (node.className || '').toString() : 'missing';
  }
  return out;
});
console.log('row classes:', JSON.stringify(defaultSel));

// ── CHECK 2: '+' header menu opens, Escape closes ONLY the menu ──
await page.mouse.click(598, 264);
await settle(600);
let menu = await page.evaluate(() => document.querySelector('[role="menu"]')?.innerText ?? null);
console.log('plus menu:', JSON.stringify(menu));
await page.keyboard.press('Escape');
await settle(500);
console.log(
  'after Escape: menu gone =',
  await page.evaluate(() => !document.querySelector('[role="menu"]')),
  '| picker still open =',
  await page.evaluate(() => document.body.innerText.includes('Choose a file'))
);
await page.screenshot({ path: '/tmp/fb-escape-menu.png' });

// ── CHECK 3: right-click on a folder row ──
const rc = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter(
    (n) => n.textContent.trim() === 'Tags' && n.children.length >= 2 && n.getBoundingClientRect().width > 0
  );
  const row = els[els.length - 1];
  if (!row) return null;
  const r = row.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (rc) {
  await page.mouse.click(rc.x, rc.y, { button: 'right' });
  await settle(600);
}
menu = await page.evaluate(() => document.querySelector('[role="menu"]')?.innerText ?? null);
console.log('right-click menu:', JSON.stringify(menu));
await page.screenshot({ path: '/tmp/fb-rightclick2.png' });
// dismiss by clicking the portal backdrop
await page.evaluate(() => {
  const p = document.getElementById('app-web-dropdown-portal-root');
  const backdrop = p?.querySelector('div[aria-hidden]');
  backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await settle(400);

// ── CHECK 4: '+' → New Script → name prompt → create → file editor ──
await page.mouse.click(598, 264);
await settle(600);
await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  const item = [...(m?.querySelectorAll('div') ?? [])].find(
    (n) => n.textContent.trim() === 'New Script'
  );
  item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await settle(800);
console.log('name prompt:', await page.evaluate(() => document.body.innerText.includes('New script file')));
await page.evaluate(() => {
  const input = [...document.querySelectorAll('input')].find(
    (n) => n.getBoundingClientRect().width > 0 && n.placeholder === 'File name'
  );
  input?.focus();
  input?.select();
});
await page.keyboard.sendCharacter('brand new');
await clickText('Create');
await settle(1200);
await page.screenshot({ path: '/tmp/fb-newfile-editor.png' });
console.log(
  'file editor opened:',
  await page.evaluate(() => document.body.innerText.includes('Blocks') || document.body.innerText.includes('Save'))
);

await browser.close();
