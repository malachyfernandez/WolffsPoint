import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Disposable, in-memory simulator only. Never run editor writes against a live game.
const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 1100 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));
const visible = (node) => {
  const box = node.getBoundingClientRect();
  return box.width && box.height;
};
const clickText = async (text, leaf = false) => {
  const handle = await page.waitForFunction(
    (target, onlyLeaf) =>
      [...document.querySelectorAll(onlyLeaf ? 'div' : '[tabindex],button')].find((node) => {
        const box = node.getBoundingClientRect();
        return (
          (!onlyLeaf || !node.children.length) &&
          node.textContent.trim() === target &&
          box.width &&
          box.height &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      }),
    { timeout: 15000 },
    text,
    leaf
  );
  await handle.asElement().click();
  await settle();
};
const clickLabel = async (label, index = 0) => {
  const controls = await page.$$(`[aria-label="${label}"]`);
  const shown = [];
  for (const control of controls) {
    if (
      await control.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return (
          box.width &&
          box.height &&
          node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
        );
      })
    )
      shown.push(control);
  }
  assert.ok(shown[index], `Missing ${label} #${index}`);
  await shown[index].click();
  await settle();
};
const editInput = async (index, value) => {
  const fields = await page.$$('input[placeholder="PLAYER"]');
  const shown = [];
  for (const field of fields) {
    if (await field.evaluate(visible)) shown.push(field);
  }
  assert.ok(shown[index], `Missing PLAYER input #${index}`);
  await shown[index].click({ clickCount: 3 });
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  await settle();
};
const clickFileWrapper = async (label, kind = 'files') => {
  const chip = await page.waitForSelector(`[aria-label="${label}"]`);
  const point = await chip.evaluate((node) => {
    const wrapper = node.closest('[data-swapable]');
    wrapper.scrollIntoView({ block: 'center' });
    const box = wrapper.getBoundingClientRect();
    // The wrapper's padding is outside the filename/selector hit targets.
    return { x: box.left + 3, y: box.top + box.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await settle();
  await page.waitForFunction(() =>
    document.body.innerText.includes('Swap Expression: file module')
  );
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('Choose a file')),
    false,
    'The module wrapper swaps the expression, not the selected file'
  );
  assert.equal(
    await page.evaluate(() => document.body.innerText.includes('argument 1')),
    false,
    'File previews must render a chooser, not a generic function argument'
  );
  assert.ok(
    await page.evaluate(
      (description) => document.body.innerText.includes(description),
      kind === 'files' ? 'Write a live-linked file module' : 'Encode a tag name as a tag string'
    ),
    'All valid module choices appear immediately in Suggested'
  );
  const invalidTabs = [
    'Variables',
    'Functions',
    'Numbers',
    'Operators',
    'Boolean',
    'List',
    'Text',
    kind === 'files' ? 'Data' : 'Files',
  ];
  assert.deepEqual(
    await page.evaluate(
      (labels) =>
        [...document.querySelectorAll('[role="button"],button')]
          .filter((node) => {
            const box = node.getBoundingClientRect();
            return (
              labels.includes(node.textContent.trim()) &&
              box.width &&
              box.height &&
              node.contains(
                document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
              )
            );
          })
          .map((node) => node.textContent.trim()),
      invalidTabs
    ),
    [],
    'Only compatible category tabs should be offered'
  );
};

try {
  for (const role of ['trigger', 'display']) {
    await page.goto(process.argv[2] ?? 'http://localhost:8084', {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });
    assert.equal(
      await page.evaluate(() => !!window.__simDb),
      true,
      'Refusing writes outside the offline simulator'
    );
    await page.evaluate((fileRole) => {
      const db = window.__simDb;
      const game = 'SIMOP1234';
      const source = `UpdateCell({PLAYERS = players, COLUMNTYPE = "day",
        DAY = ${fileRole === 'trigger' ? 'placedDay' : 'currentDay'}, COLUMN = "morningMessage"}) {
        Add File({ID = ""});
        Each cellContents { Add File({ID = ""}); }
      }`;
      const notice = (id, path) => ({
        id,
        path,
        kind: 'markdown',
        updatedAt: 1,
        source:
          'FileInput({NAME = "PLAYER", DEFAULT = "Original"}); CreateMarkdown({CONTENT = Markdown(`Hello /*markdownVariable: "PLAYER"*/`)});',
      });
      db.seedVar(db.viewerUserId, `scriptFiles-${game}`, {
        files: {
          host: {
            id: 'host',
            path: fileRole === 'trigger' ? 'tags/Operations' : 'Operations',
            kind: 'script',
            role: fileRole,
            source:
              fileRole === 'trigger'
                ? `Tag({NAME = "Operations", COLOR = "Red"});\n${source}`
                : source,
            updatedAt: 1,
          },
          notice: notice('notice', 'Notice'),
          other: notice('other', 'Other'),
        },
        folders: [],
      });
      db.seedVar(db.viewerUserId, 'scriptFiles:openOnClick', 'single');
      db.seedVar(db.viewerUserId, 'scriptFiles:browserView', 'list');
      db.seedListItem(db.viewerUserId, 'cellModuleVersion', game, 1);
    }, role);
    await page.waitForSelector('[data-testid="game-SIMOP1234"]');
    await page.click('[data-testid="game-SIMOP1234"]');
    await page.waitForSelector('[data-testid="gametab-files"]');
    await settle(1500);
    await page.click('[data-testid="gametab-files"]');
    await settle(1200);
    if (role === 'trigger') await clickText('Tags', true);
    await clickText('Operations', true);
    await page.waitForSelector('[aria-label="Select file"]');

    await clickFileWrapper('Select file');
    await clickLabel('Close');
    await settle();

    // Empty file name opens the explorer directly, not Add/Swap Expression.
    await clickLabel('Select file');
    await page.waitForFunction(() => document.body.innerText.includes('Choose a file'));
    await clickText('Notice', true);
    await page.waitForSelector('input[placeholder="PLAYER"]');
    await editInput(0, 'Alice');
    const inputSwap = await page.waitForFunction(() => {
      let node = document.querySelector('input[placeholder="PLAYER"]')?.parentElement;
      while (node) {
        const button = [...node.querySelectorAll('[role="button"]')].find(
          (control) => control.textContent.trim() === '+'
        );
        if (button) return button;
        node = node.parentElement;
      }
      return null;
    });
    await inputSwap.asElement().click();
    await page.waitForFunction(() => document.body.innerText.includes('Swap Expression'));
    assert.equal(
      await page.evaluate(() => document.body.innerText.includes('Choose a file')),
      false,
      'Changing a file input still opens the expression picker'
    );
    await page.keyboard.press('Escape');
    await settle();

    // The right-hand selector also works before a reference has been selected.
    await clickLabel('Change file', 1);
    await page.waitForFunction(() => document.body.innerText.includes('Choose a file'));
    await clickText('Notice', true);
    await editInput(1, 'Bob');

    // Selected filename opens its editor. Returning retains both input overrides.
    await clickLabel('Open Notice');
    await page.waitForFunction(() => document.body.innerText.includes('Hello'));
    assert.equal(
      await page.evaluate(() => document.body.innerText.includes('Choose a file')),
      false
    );
    await clickText('Cancel');
    await page.waitForSelector('input[placeholder="PLAYER"]');

    // Only the selector retargets; existing overrides win over the new defaults.
    await clickLabel('Change file');
    await page.waitForFunction(() => document.body.innerText.includes('Choose a file'));
    await clickText('Other', true);
    assert.deepEqual(
      await page.$$eval('input[placeholder="PLAYER"]', (nodes) =>
        nodes.filter((node) => node.getBoundingClientRect().width).map((node) => node.value)
      ),
      ['Alice', 'Bob']
    );

    // Nested cell operations offer only cell actions, variables and control/data flow.
    await clickText('For Cell', true);
    await page.waitForFunction(() => document.body.innerText.includes('Swap Block: For Cell'));
    await clickText('Control');
    assert.equal(
      await page.evaluate(() => document.body.innerText.includes('Return a value from a function')),
      false
    );
    for (const forbidden of [
      'Return',
      'CreateMarkdown',
      'CreateTextInput',
      'Files',
      'Inputs',
      'Display',
    ]) {
      assert.equal(
        await page.evaluate(
          (label) =>
            [...document.querySelectorAll('[tabindex],button')].some((node) => {
              const box = node.getBoundingClientRect();
              return (
                box.width &&
                box.height &&
                node.textContent.trim() === label &&
                node.contains(
                  document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
                )
              );
            }),
          forbidden
        ),
        false,
        `${role}: ${forbidden} must not be offered as a loop statement`
      );
    }
    await page.keyboard.press('Escape');
    await settle();
    await page.setViewport({ width: 390, height: 844 });
    await settle();
    assert.ok(
      await page.$$eval('input[placeholder="PLAYER"]', (nodes) =>
        nodes
          .filter((node) => node.getBoundingClientRect().width)
          .every((node) => {
            const box = node.getBoundingClientRect();
            return box.left >= 0 && box.right <= window.innerWidth + 1;
          })
      ),
      `${role}: file inputs must stay within the mobile viewport`
    );
    await page.setViewport({ width: 1360, height: 1100 });
    await settle();
    await clickText('Done');
    const saved = await page.evaluate(
      () =>
        window.__simDb.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value.files.host
          .source
    );
    assert.match(saved, /ID = "other"/);
    assert.match(saved, /player = "Alice"/i);
    assert.match(saved, /player = "Bob"/i);
    assert.doesNotMatch(saved, /Return/);

    // Changing to a Tags column must not trap either file operation in the explorer.
    await page.evaluate(() => {
      const db = window.__simDb;
      const game = 'SIMOP1234';
      const doc = db.runQuery('user_vars:get', { key: `scriptFiles-${game}` }).value;
      db.runMutation('user_lists:set', {
        key: 'userTableTitle',
        itemId: game,
        value: {
          extraUserColumns: [],
          extraDayColumns: ['Tags'],
          extraDayColumnTypes: ['tags'],
        },
      });
      db.runMutation('user_vars:set', {
        key: `scriptFiles-${game}`,
        value: {
          ...doc,
          files: {
            ...doc.files,
            host: {
              ...doc.files.host,
              updatedAt: Date.now(),
              source: doc.files.host.source.replace('COLUMN = "morningMessage"', 'COLUMN = "Tags"'),
            },
          },
        },
      });
    });
    await settle();
    await clickText('Operations', true);
    await page.waitForFunction(() =>
      document.body.innerText.includes('requires a tag(...) module, not a file')
    );
    for (const label of ['Open Other', 'Open Notice']) {
      await clickFileWrapper(label, 'tags');
      await clickText('Data');
      await clickText('Encode a tag name as a tag string', true);
      await settle();
    }
    assert.equal(
      await page.evaluate(() =>
        document.body.innerText.includes('requires a tag(...) module, not a file')
      ),
      false,
      'Both all-cell and per-cell file values can be replaced with tags'
    );
    await clickText('Done');
    const swapped = await page.evaluate(
      () =>
        window.__simDb.runQuery('user_vars:get', { key: 'scriptFiles-SIMOP1234' }).value.files.host
          .source
    );
    assert.equal((swapped.match(/Add tag\(/g) ?? []).length, 2);
    assert.doesNotMatch(swapped, /Add File\(/);

    // Scalar columns expose only per-cell replacement; disabled choices explain why.
    await page.evaluate((fileRole) => {
      const db = window.__simDb;
      const key = 'scriptFiles-SIMOP1234';
      const doc = db.runQuery('user_vars:get', { key }).value;
      const body =
        'UpdateCell({PLAYERS = players, COLUMNTYPE = "day", DAY = 0, COLUMN = "voteMultiplier"}) { Each cellContents { Replace 1; } }';
      db.runMutation('user_vars:set', {
        key,
        value: {
          ...doc,
          files: {
            ...doc.files,
            host: {
              ...doc.files.host,
              source:
                fileRole === 'trigger'
                  ? `Tag({NAME = "Operations", COLOR = "Red"});\n${body}`
                  : body,
              updatedAt: Date.now(),
            },
          },
        },
      });
    }, role);
    await settle();
    await clickText('Operations', true);
    await page.waitForFunction(() => document.body.innerText.includes('voteMultiplier'));
    await clickText('For each cell', true);
    const allDisabled = await page.$$eval('[data-testid^="insert-item-For All Cells"]', (nodes) =>
      nodes
        .filter(
          (node) => Number(getComputedStyle(node).opacity) < 1 && node.getBoundingClientRect().width
        )
        .map((node) => node.textContent)
    );
    assert.equal(allDisabled.length, 3, 'All scalar For All Cells actions are disabled');
    assert.ok(allDisabled.every((text) => text.includes('Use For each cell')));
    await page.click('[data-testid="insert-item-For All Cells - Add"]');
    assert.ok(
      await page.evaluate(() => document.body.innerText.includes('Swap Block: For each cell'))
    );
    await clickLabel('Close');
    await clickText('For Cell', true);
    assert.equal(
      await page.$$eval(
        '[data-testid^="insert-item-For Cell"]',
        (nodes) =>
          nodes.filter(
            (node) =>
              Number(getComputedStyle(node).opacity) < 1 && node.getBoundingClientRect().width
          ).length
      ),
      2,
      'Only Add and Remove are disabled inside a scalar loop'
    );
    assert.ok(await page.evaluate(() => document.body.innerText.includes('Replace With')));
    await clickLabel('Close');
    await clickText('Replace With');
    const disabledOptions = await page.$$eval('[role="option"][aria-disabled="true"]', (nodes) =>
      nodes.map((node) => node.textContent.trim())
    );
    assert.deepEqual(disabledOptions, ['Add', 'Remove']);
    await page.click('[role="option"][aria-disabled="true"]');
    assert.ok(
      await page.evaluate(() =>
        document.body.innerText.includes('Use Replace With instead of Add or Remove')
      )
    );
    const replaceOption = await page.waitForSelector('[role="option"][aria-disabled="false"]');
    await replaceOption.click();
    await settle();
    const numberSwap = await page.waitForFunction(() => {
      const field = [...document.querySelectorAll('input')].find(
        (node) => node.value === '1' && node.getBoundingClientRect().width
      );
      let node = field?.parentElement;
      while (node) {
        const button = [...node.querySelectorAll('[role="button"]')].find(
          (control) => control.textContent.trim() === '+'
        );
        if (button) return button;
        node = node.parentElement;
      }
      return null;
    });
    await numberSwap.asElement().click();
    await page.waitForFunction(() => document.body.innerText.includes('Swap Expression'));
    for (const invalid of [
      'Write a live-linked file module',
      'Encode a tag name as a tag string',
      'All players in the game',
    ]) {
      assert.equal(
        await page.evaluate((text) => document.body.innerText.includes(text), invalid),
        false
      );
    }
    await clickLabel('Close');
    await clickText('Done');
    console.log(
      `${role}: all/cell file picking, inputs, open/retarget, module swapping and loop choices passed`
    );
  }
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(await page.evaluate(() => document.body.innerText));
  throw error;
} finally {
  await browser.close();
}
