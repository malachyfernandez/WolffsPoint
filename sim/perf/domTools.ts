/**
 * sim/perf/domTools.ts
 *
 * DOM driving helpers for the simulation runner — finding elements by
 * test-id/text, dispatching realistic clicks, scrolling containers.
 */

export function byTestId(id: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
}

/** Deepest element whose trimmed textContent equals the text. */
export function byText(text: string, opts: { within?: ParentNode; exact?: boolean } = {}): HTMLElement | null {
  const root: ParentNode = opts.within ?? document;
  const candidates = Array.from(
    root.querySelectorAll('button, [role="button"], div, span, a, [data-focus-scope] *')
  ) as HTMLElement[];
  const matches = candidates.filter((el) => {
    const own = (el.textContent ?? '').trim();
    if (opts.exact === false) return own.includes(text);
    return own === text;
  });
  // prefer deepest match (least children) then smallest text length
  matches.sort((a, b) => {
    const ad = a.querySelectorAll('*').length;
    const bd = b.querySelectorAll('*').length;
    if (ad !== bd) return ad - bd;
    return (a.textContent ?? '').length - (b.textContent ?? '').length;
  });
  // climb from the deep match to the nearest clickable ancestor-or-self
  for (const el of matches.slice(0, 6)) {
    let node: HTMLElement | null = el;
    for (let i = 0; i < 5 && node; i++) {
      const clickable =
        node.tagName === 'BUTTON' ||
        node.getAttribute('role') === 'button' ||
        node.style.cursor === 'pointer' ||
        (typeof (node as any).onclick === 'function') ||
        node.getAttribute('tabindex') !== null ||
        node.classList.contains('cursor-pointer');
      if (clickable) return node;
      node = node.parentElement;
    }
    return el;
  }
  return null;
}

// Firefox throws "Invalid pointer id" from setPointerCapture/releasePointerCapture
// for synthetic PointerEvents (no real active pointer). React Aria pressables call
// setPointerCapture inside their pointerdown listener regardless of pointerType,
// so every dispatchTap would surface an uncaught error in Firefox/Zen. Swallow
// ONLY that error class — real pointers never throw it, so app behavior is
// unchanged for actual users.
if (typeof Element !== 'undefined' && !(Element.prototype.setPointerCapture as any).__simPatched) {
  const origSet = Element.prototype.setPointerCapture;
  const origRelease = Element.prototype.releasePointerCapture;
  const guard = (fn: (id: number) => void) =>
    function (this: Element, id: number) {
      try {
        return fn.call(this, id);
      } catch (e) {
        if (e instanceof DOMException && /pointer id/i.test(e.name + ' ' + e.message)) return;
        throw e;
      }
    };
  (Element.prototype.setPointerCapture as any) = guard(origSet);
  (Element.prototype.setPointerCapture as any).__simPatched = true;
  (Element.prototype.releasePointerCapture as any) = guard(origRelease);
}

export function dispatchTap(el: Element) {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
  el.dispatchEvent(new MouseEvent('mousedown', base));
  el.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
  el.dispatchEvent(new MouseEvent('mouseup', base));
  el.dispatchEvent(new MouseEvent('click', base));
}

export function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

export function pressEscapeIn(target: Element) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// Dialog state — the tour uses these to VERIFY the page is in the state it
// thinks it is (a leaked dialog silently corrupted scroll measurements before).
// ---------------------------------------------------------------------------

/** Every [role="dialog"] currently rendered and visible. */
export function openDialogs(): HTMLElement[] {
  return (Array.from(document.querySelectorAll('[role="dialog"]')) as HTMLElement[]).filter(
    (d) => !!(d.offsetParent || d.getClientRects().length)
  );
}

/**
 * Close each open dialog the way a user would — its [aria-label="Close"]
 * control — falling back to a targeted Escape on the dialog element.
 * Returns how many dialogs were still open afterwards.
 */
export async function closeOpenDialogs(fallback?: () => void): Promise<number> {
  for (const d of openDialogs()) {
    const btn = d.querySelector('[aria-label="Close" i]') as HTMLElement | null;
    if (btn) dispatchTap(btn);
    else pressEscapeIn(d);
  }
  let still = await waitFor(() => openDialogs().length === 0, 1800);
  if (!still && fallback) {
    fallback();
    still = await waitFor(() => openDialogs().length === 0, 1200);
  }
  return openDialogs().length;
}

/** Scrollables NOT inside an open dialog — page surfaces only. */
export function findPageScrollables() {
  return findScrollables().filter((s) => !s.el.closest('[role="dialog"]'));
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function nextFrame() {
  return new Promise<number>((r) => requestAnimationFrame(r));
}

/** Resolve when predicate() returns truthy, else null after timeout. */
export async function waitFor<T>(predicate: () => T | null | undefined | false, timeoutMs = 5000, pollMs = 16): Promise<T | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    const v = predicate();
    if (v) return v;
    await sleep(pollMs);
  }
  return null;
}

/**
 * Find scrollable elements — the largest first. Returns [element, scrollablePixels].
 */
export function findScrollables(within?: ParentNode): { el: HTMLElement; range: number }[] {
  const root: ParentNode = within ?? document;
  const all = Array.from(root.querySelectorAll('*')) as HTMLElement[];
  const scrollables = all
    .map((el) => {
      const range = el.scrollHeight - el.clientHeight;
      const rangeX = el.scrollWidth - el.clientWidth;
      const style = getComputedStyle(el);
      const canScrollY = /(auto|scroll)/.test(style.overflowY) && range > 40;
      const canScrollX = /(auto|scroll)/.test(style.overflowX) && rangeX > 40;
      if (!canScrollY && !canScrollX) return null;
      return { el, range: Math.max(range, rangeX) };
    })
    .filter(Boolean) as { el: HTMLElement; range: number }[];
  scrollables.sort((a, b) => b.range - a.range);
  return scrollables;
}

/**
 * Drive a scroll of `fraction` of the element's scroll range over `durationMs`,
 * one scrollTop update per frame. Returns the recorded per-frame deltas.
 */
export async function driveScroll(
  el: HTMLElement,
  opts: { fraction?: number; durationMs?: number; reverse?: boolean } = {}
): Promise<{ deltas: number[]; fromTop: number; toTop: number }> {
  const fraction = opts.fraction ?? 0.7;
  const durationMs = opts.durationMs ?? 1500;
  const range = el.scrollHeight - el.clientHeight;
  if (range <= 0) return { deltas: [], fromTop: el.scrollTop, toTop: el.scrollTop };

  const startTop = el.scrollTop;
  const targetTop = opts.reverse
    ? Math.max(0, startTop - range * fraction)
    : Math.min(range, startTop + range * fraction);
  const distance = targetTop - startTop;

  const deltas: number[] = [];
  const t0 = performance.now();
  let last = t0;

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      deltas.push(now - last);
      last = now;
      const progress = Math.min(1, (now - t0) / durationMs);
      // easeInOut so it looks like a flick + decelerate
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      el.scrollTop = startTop + distance * eased;
      if (progress >= 1) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  return { deltas, fromTop: startTop, toTop: el.scrollTop };
}
