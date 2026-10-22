import assert from 'node:assert/strict';
import { launch } from 'puppeteer';

// Only exercise the disposable simulator, never real game/session writes.
const browser = await launch({ headless: true, defaultViewport: { width: 1360, height: 950 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
const samples = [];

const textColors = (pattern) =>
  page.evaluate((source) => {
    const match = new RegExp(source, 'i');
    return [...document.querySelectorAll('[dir="auto"]')]
      .filter((node) => node.childElementCount === 0 && match.test(node.textContent.trim()))
      .filter((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      })
      .map((node) => ({
        label: node.textContent.trim(),
        color: getComputedStyle(node).color,
        inlineColor: node.style.color,
      }));
  }, pattern);

const clickText = async (pattern) => {
  const element = await page.waitForFunction(
    (source) => {
      const match = new RegExp(source, 'i');
      return [...document.querySelectorAll('[tabindex],button')].find((node) => {
        if (!match.test(node.textContent.trim())) return false;
        const bounds = node.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          node.contains(
            document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          )
        );
      });
    },
    {},
    pattern
  );
  await element.asElement().click();
  await settle();
};

try {
  await page.goto(process.argv[2] ?? 'http://localhost:8083', {
    waitUntil: 'networkidle2',
    timeout: 120000,
  });
  assert.equal(await page.evaluate(() => !!window.__simDb), true, 'Refusing a non-simulator page');
  await page.waitForSelector('[data-testid="game-SIMOP1234"]');
  await page.click('[data-testid="game-SIMOP1234"]');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[dir="auto"]')].some((node) =>
      /^start sim$/i.test(node.textContent.trim())
    )
  );
  samples.push(
    ...(await textColors('^start sim$')).map((sample) => ({
      ...sample,
      expected: 'rgba(255, 255, 255, 0.7)',
    }))
  );
  await clickText('^start sim$');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[dir="auto"]')].some((node) =>
      /^Day \d+ of \d+$/.test(node.textContent.trim())
    )
  );

  for (const width of [1360, 390]) {
    await page.setViewport({ width, height: 950 });
    await settle();
    const day = await textColors('^Day \\d+ of \\d+$');
    const actions = await textColors('^(?:leave|end)(?: sim)?$|^1 (?:HR|MIN)$');
    assert.ok(day.length > 0, 'The simulation day caption must be rendered');
    assert.ok(actions.length >= 4, 'Both time-step and session action labels must be rendered');
    samples.push(
      ...day.map((sample) => ({ ...sample, width, expected: 'rgba(255, 255, 255, 0.5)' }))
    );
    samples.push(
      ...actions.map((sample) => ({ ...sample, width, expected: 'rgba(255, 255, 255, 0.7)' }))
    );
    await page.screenshot({ path: `/tmp/wolf-text-colors-${width}.png` });
  }

  // Close buttons elsewhere use an explicit rgb() prop rather than a theme token.
  await page.setViewport({ width: 1360, height: 950 });
  await settle();
  const dateButton = await page.waitForFunction(() => {
    const day = [...document.querySelectorAll('[dir="auto"]')].find(
      (node) => node.childElementCount === 0 && /^Day \d+ of \d+$/.test(node.textContent.trim())
    );
    return day?.closest('[tabindex="0"]');
  });
  await dateButton.asElement().click();
  await page.waitForSelector('[aria-label="Close"]');
  const closeColor = await page.$eval('[aria-label="Close"]', (button) => {
    const text = button.querySelector('[dir="auto"]');
    return {
      label: 'Dialog close glyph',
      color: getComputedStyle(text).color,
      inlineColor: text.style.color,
    };
  });
  samples.push({ ...closeColor, expected: 'rgb(246, 238, 219)' });
  console.table(samples);
  for (const sample of samples) {
    assert.equal(sample.color, sample.expected, `${sample.label} must retain its explicit color`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: explicit rgba/rgb colors survive FontText resolution on desktop and mobile');
} finally {
  await browser.close();
}
