import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Run against EXPO_PUBLIC_SIM=1 only. Never exercise writes on a live game.
const url = process.argv[2] ?? 'http://localhost:8082';
const browser = await launch({
  headless: true,
  defaultViewport: { width: 1280, height: 950 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && /Maximum update depth|Uncaught Error/.test(message.text())) {
    errors.push(message.text());
  }
});
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// Portal DOM order is not stack order. Only click the frontmost matching control.
const clickText = async (text) => {
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
    { timeout: 10_000 },
    text
  );
  await control.asElement().click();
  await settle();
};
const fill = async (selector, value) => {
  await settle(100);
  await page.$eval(selector, (element) => {
    element.focus();
    element.select();
  });
  await page.keyboard.sendCharacter(value);
  await page.waitForFunction(
    (target, expected) => document.querySelector(target)?.value === expected,
    {},
    selector,
    value
  );
};
const body = () => page.$eval('textarea', (element) => element.value);

try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120_000 });
  assert.equal(
    await page.evaluate(() => !!window.__simDb),
    true,
    'Refusing to test a non-sim server'
  );
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForSelector('[data-testid="gametab-files"]');
  await settle(1500);
  const morningWrites = () =>
    page.evaluate(
      () =>
        window.__simDb.stats.mutationLog.filter((entry) =>
          entry.name.includes('morningMessagesList:SIMOP1234')
        ).length
    );
  const initialWrites = await morningWrites();
  assert.ok(initialWrites < 10, 'Morning-message normalization must not create a write loop');
  await settle(1000);
  assert.equal(
    await morningWrites(),
    initialWrites,
    'Idle renders must not write morning messages'
  );
  await page.click('[data-testid="gametab-files"]');
  await page.waitForSelector('[aria-label="New Folder"]');
  await page.click('[aria-label="New Folder"]');
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder="Folder name"]');
    return (
      input === document.activeElement &&
      input.selectionStart === 0 &&
      input.selectionEnd === input.value.length &&
      input.value === 'New folder'
    );
  });
  await page.keyboard.sendCharacter('Templates');
  await clickText('Create');
  const folders = await page.evaluate(
    () =>
      [...window.__simDb.vars.values()].find((row) => row.key === 'scriptFiles-SIMOP1234')?.value
        .folders
  );
  assert.ok(
    folders.includes('Templates'),
    'The list toolbar must create the folder in the current path'
  );
  assert.equal(
    folders.some((folder) => folder.includes('[object Object]')),
    false
  );
  await page.waitForSelector('[aria-label="New Markdown"]');
  await page.click('[aria-label="New Markdown"]');
  await page.waitForSelector('input[placeholder="File name"]');
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder="File name"]');
    return (
      input === document.activeElement &&
      input.selectionStart === 0 &&
      input.selectionEnd === input.value.length &&
      input.value.length > 0
    );
  });
  await fill('input[placeholder="File name"]', 'Markdown UI Regression');
  await clickText('Create');
  await page.waitForSelector('textarea');
  await settle();

  await fill('textarea', 'Unsaved hello ');
  await page.click('[aria-label="Insert variable"]');
  await settle();
  await clickText('Create input...');
  await clickText('Text inputDefaults to a text value');
  await fill('input[placeholder="variableName"]', 'Name');
  await fill('input[placeholder="default"]', 'Ada');
  await clickText('Done');
  assert.equal(await body(), 'Unsaved hello /*markdownVariable: "Name"*/');
  await page.$eval('textarea', (element) =>
    element.setSelectionRange(element.value.length, element.value.length)
  );
  await page.click('[aria-label="Insert variable"]');
  await clickText('Name');
  assert.equal((await body()).match(/markdownVariable: "Name"/g).length, 2);

  await page.click('[aria-label="Source editor"]');
  await settle(700);
  await clickText('Text');
  assert.match(await body(), /FileInput/);
  assert.match(await body(), /Unsaved hello/);
  const source = [
    'FileInput({NAME = "Name", DEFAULT = "Ada"});',
    'FileInput({NAME = "Count", DEFAULT = 3});',
    'Variable({NAME = "total", VALUE = Inputs.entry("Count").toNumber * 2});',
    'CreateMarkdown({CONTENT = Markdown(`Hello /*markdownVariable: "Name"*/. Total: /*markdownVariable: "Total"*/`, "Total" = total)});',
  ].join('\n');
  await fill('textarea', source);
  await page.click('[aria-label="Markdown editor"]');
  await settle(700);
  assert.match(await body(), /markdownVariable: "Total"/);
  assert.ok(await page.evaluate(() => document.body.innerText.includes('Hello Ada. Total: 6')));

  await clickText('Name');
  await fill('input[placeholder="variableName"]', 'Recipient');
  await clickText('Save');
  assert.match(await body(), /markdownVariable: "Recipient"/);
  assert.doesNotMatch(await body(), /markdownVariable: "Name"/);

  await page.hover('[aria-label="Bold"]');
  await settle();
  const boldTooltipVisible = await page.evaluate(() =>
    [...document.querySelectorAll('body > div')].some(
      (node) =>
        node.style.position === 'fixed' && node.style.opacity === '1' && node.textContent === 'Bold'
    )
  );
  if (!boldTooltipVisible) {
    console.error(
      'Tooltip diagnostics:',
      await page.evaluate(() => ({
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        buttons: [...document.querySelectorAll('[aria-label="Bold"]')].map((node) => {
          const bounds = node.getBoundingClientRect();
          const top = document.elementFromPoint(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2
          );
          return {
            html: node.outerHTML.slice(0, 500),
            bounds: bounds.toJSON(),
            hovered: node.matches(':hover'),
            top: top?.outerHTML.slice(0, 250),
          };
        }),
        tooltips: [...document.querySelectorAll('body > div')]
          .filter((node) => node.style.position === 'fixed')
          .map((node) => ({ text: node.textContent, style: node.style.cssText })),
      }))
    );
  }
  assert.ok(boldTooltipVisible, 'Hovering Bold should show the shared tooltip');
  await page.evaluate(() =>
    window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch' }))
  );
  await settle();
  assert.equal(
    await page.evaluate(() =>
      [...document.querySelectorAll('body > div')].some(
        (node) =>
          node.style.position === 'fixed' &&
          node.style.opacity === '1' &&
          node.textContent === 'Bold'
      )
    ),
    false
  );

  await page.setViewport({ width: 390, height: 844 });
  await settle();
  for (const label of ['Markdown editor', 'Source editor', 'Insert variable', 'Add input']) {
    const box = await page.$eval(`[aria-label="${label}"]`, (node) => {
      const bounds = node.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right };
    });
    assert.ok(box.left >= 0 && box.right <= 390, `${label} overflows the mobile dialog`);
  }
  await page.setViewport({ width: 1280, height: 950 });
  await page.click('[aria-label="Save"]');
  await settle();
  const snapshots = await page.evaluate(() =>
    [...window.__simDb.vars.values()]
      .filter((record) => record.key?.startsWith('saveHistory:scriptFile:'))
      .flatMap((record) => record.value)
  );
  assert.ok(snapshots.length > 0);
  assert.match(snapshots[0].value.scriptText, /NAME = "Recipient"/);
  assert.match(snapshots[0].value.scriptText, /VALUE = \(?Inputs\.entry\("Count"\)/);

  await clickText('Recipient');
  await clickText('Remove');
  assert.equal(
    await page.$eval('input[placeholder="variableName"]', (element) => element.value),
    'Recipient'
  );
  assert.ok(await page.evaluate(() => document.body.innerText.includes('is still used')));
  await fill('input[placeholder="default"]', 'Grace');
  await clickText('Save');
  await page.click('[aria-label="Save"]');
  await settle();
  await page.click('[aria-label="Save history"]');
  await settle();
  const oldVersion = await page.waitForFunction(() =>
    [...document.querySelectorAll('[tabindex]')].find((element) => {
      const box = element.getBoundingClientRect();
      return (
        !element.querySelector('[tabindex]') &&
        element.textContent.includes('DEFAULT = "Ada"') &&
        box.width > 0 &&
        element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
      );
    })
  );
  await oldVersion.asElement().click();
  await clickText('Replace');
  const stillPublished = await page.evaluate(
    () =>
      [...window.__simDb.vars.values()].find((record) => record.key === 'scriptFiles-SIMOP1234')
        ?.value
  );
  assert.ok(
    Object.values(stillPublished.files).some((file) => file.source.includes('DEFAULT = "Grace"'))
  );
  // A delayed published update must not replace the restored, unsaved draft.
  await page.evaluate(() => {
    const key = 'scriptFiles-SIMOP1234';
    const current = [...window.__simDb.vars.values()].find((record) => record.key === key);
    const value = structuredClone(current.value);
    for (const file of Object.values(value.files)) {
      file.source = file.source.replace('"Grace"', '"Published echo"');
      file.updatedAt += 1;
    }
    window.__simDb.runMutation('user_vars:set', { key, value, privacy: 'PUBLIC' });
  });
  await settle();

  await page.click('[aria-label="Source editor"]');
  await settle(700);
  await clickText('Text');
  const validSource = await body();
  assert.match(validSource, /DEFAULT = "Ada"/);
  assert.doesNotMatch(validSource, /DEFAULT = "Grace"/);
  assert.doesNotMatch(validSource, /Published echo/);
  await fill('textarea', 'CreateMarkdown({CONTENT =');
  await page.click('[aria-label="Markdown editor"]');
  await settle();
  assert.equal(await body(), 'CreateMarkdown({CONTENT =');
  await page.click('[aria-label="Save"]');
  await settle();
  const stored = await page.evaluate(
    () =>
      [...window.__simDb.vars.values()].find((record) => record.key === 'scriptFiles-SIMOP1234')
        ?.value
  );
  assert.ok(
    Object.values(stored.files).every((file) => file.source !== 'CreateMarkdown({CONTENT =')
  );
  await fill('textarea', validSource);
  await page.click('[aria-label="Markdown editor"]');
  await settle(700);
  await clickText('Cancel');
  await page.waitForFunction(() => document.body.innerText.includes('Unsaved Changes'));
  assert.deepEqual(errors, []);
  console.log(
    'Markdown editor UI: input creation/insertion, drafts, calculations, rename, tooltips, mobile layout, full-source history, invalid-source guard, and unsaved-close checks passed.'
  );
} catch (error) {
  console.error((await page.evaluate(() => document.body.innerText)).slice(-1800));
  throw error;
} finally {
  await browser.close();
}
