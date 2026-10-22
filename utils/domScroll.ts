/**
 * scrollIntoView walks EVERY scrollable ancestor — so revealing a cell inside
 * a horizontally-scrolling table can drag the whole page sideways. This
 * scopes the movement: horizontal scrolling only ever happens inside the
 * NEAREST x-scrollable ancestor (a table rail / column view), while vertical
 * scrolling centers through every y-scrollable ancestor plus the window.
 * Outer scrollers can never shift sideways.
 *
 * Ancestor scrolls apply instantly so each delta is computed against settled
 * layout; only the final viewport scroll animates.
 */
export const scrollIntoViewBounded = (
  el: HTMLElement,
  { block = 'center', pad = 8 }: { block?: 'start' | 'center' | 'nearest'; pad?: number } = {}
) => {
  const scrollable = (n: HTMLElement, axis: 'x' | 'y') => {
    const cs = getComputedStyle(n);
    const ov = axis === 'x' ? cs.overflowX : cs.overflowY;
    const room = axis === 'x' ? n.scrollWidth - n.clientWidth : n.scrollHeight - n.clientHeight;
    return room > 1 && (ov === 'auto' || ov === 'scroll');
  };
  const dy = (er: DOMRect, vr: DOMRect) =>
    block === 'center'
      ? er.top + er.height / 2 - (vr.top + vr.height / 2)
      : block === 'start'
        ? er.top - vr.top - pad
        : er.top < vr.top + pad
          ? er.top - vr.top - pad
          : er.bottom > vr.bottom - pad
            ? er.bottom - vr.bottom + pad
            : 0;

  // Horizontal: only the nearest x-scroller is allowed to move.
  let x = el.parentElement;
  while (x && !scrollable(x, 'x')) x = x.parentElement;
  if (x) {
    const xr = x.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    x.scrollLeft += er.left + er.width / 2 - (xr.left + xr.width / 2);
  }

  // Vertical: center/reveal inside every y-scrollable ancestor, nearest first.
  let y = el.parentElement;
  while (y && y !== document.documentElement && y !== document.body) {
    if (scrollable(y, 'y')) {
      y.scrollTop += dy(el.getBoundingClientRect(), y.getBoundingClientRect());
    }
    y = y.parentElement;
  }

  // Finally bring it into the viewport — vertically only, never sideways.
  const er = el.getBoundingClientRect();
  const top =
    block === 'center'
      ? er.top + er.height / 2 - window.innerHeight / 2
      : block === 'start'
        ? er.top - pad
        : er.top < pad
          ? er.top - pad
          : er.bottom > window.innerHeight - pad
            ? er.bottom - window.innerHeight + pad
            : 0;
  if (Math.abs(top) > 1) window.scrollBy({ top, behavior: 'smooth' });
};
