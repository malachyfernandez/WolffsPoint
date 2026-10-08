import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { List } from 'lucide-react-native';
import { useBodyReportEnabled } from 'contexts/BodyReadinessContext';

interface StickyTocButtonProps {
  onPress: () => void;
  isOpen?: boolean;
}

// Exact same geometry as the lucide `List` icon rendered by the inline button.
const LIST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(46,41,37)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;

const REST_BG = 'rgba(46, 41, 37, 0.05)';
const ON_HOVER_BG = 'rgba(46, 41, 37, 0.1)';

// Tuned base offsets. A runtime offset is applied automatically:
// when the measured new-y would be < 30 the offset is 0, otherwise -30.
const X_BUFFER = 0;
const SWITCH_LINE = 40;
const Y_BASE = 20;

/** Walk up the DOM to find the element that actually scrolls. */
const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

/** True if `el` (or an ancestor up to `boundary`) is fixed/sticky positioned. */
const isFixedOverlay = (el: Element, boundary: Element | null): boolean => {
  let node: Element | null = el;
  while (node && node !== boundary && node !== document.body) {
    const pos = window.getComputedStyle(node).position;
    if (pos === 'fixed' || pos === 'sticky') return true;
    node = node.parentElement;
  }
  return false;
};

/**
 * Web-only table-of-contents button. Once the inline button scrolls under the
 * fixed site header, a fixed-position clone docks just below the header's
 * bottom edge.
 *
 * Performance notes (previously this polled a ~900-call `elementFromPoint`
 * scan on a 200ms interval AND every scroll event):
 * - The dock position (header bottom edge) is layout-derived, not
 *   scroll-derived, so the hit-test scan now runs only on mount, resize, and
 *   dialog open/close.
 * - Stuck/unstuck detection is an IntersectionObserver on the inline button's
 *   wrapper, with `rootMargin` placing the crossing line at the dock. Scroll
 *   events only update the floating clone's X position (one rect read).
 */
const StickyTocButton = ({ onPress, isOpen = false }: StickyTocButtonProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const floatingElRef = useRef<HTMLDivElement | null>(null);
  const onPressRef = useRef(onPress);

  // Latest measured dock geometry.
  const posRef = useRef({ left: 0, top: 0 });
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const lastScrollLeftRef = useRef(-1);
  const offsetRef = useRef(0);

  const [isStuck, setIsStuck] = useState(false);
  // Bumped whenever the dock line is re-measured so the observer effect
  // rebuilds with the fresh rootMargin.
  const [dockVersion, setDockVersion] = useState(0);

  // While the TOC dialog is open the floating button fades out and the
  // stuck-state measurement is frozen (the dialog covers the inline button).
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const wasOpenRef = useRef(false);

  // False inside a hidden keep-alive tab pane. Hidden panes keep real layout
  // geometry (translated offscreen, not display:none), so the width===0 bail
  // below no longer detects them — gate the listeners/observers entirely or
  // every scroll anywhere in the app does layout work in this hidden pane.
  const bodyEnabled = useBodyReportEnabled();

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  // Create the floating TOC element on body.
  useEffect(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    floatingElRef.current = el;

    const handleClick = () => onPressRef.current();
    el.addEventListener('click', handleClick);

    return () => {
      el.remove();
      floatingElRef.current = null;
    };
  }, []);

  // Style/show the floating element (same size, colors, icon as the inline button).
  useEffect(() => {
    const el = floatingElRef.current;
    if (!el) return;

    const show = isStuck && !isOpen;
    el.innerHTML = '';
    el.onmouseenter = null;
    el.onmouseleave = null;

    el.style.cssText = `
            position: fixed;
            left: ${posRef.current.left}px;
            top: ${posRef.current.top}px;
            width: 40px;
            height: 40px;
            border-radius: 9999px;
            background: ${REST_BG};
            display: flex;
            opacity: ${show ? '1' : '0'};
            pointer-events: ${show ? 'auto' : 'none'};
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            cursor: pointer;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            transition: ${isStuck ? 'opacity 0.3s, background 0.3s' : 'none'};
            user-select: none;
        `;
    el.innerHTML = LIST_SVG;
    el.onmouseenter = () => {
      el.style.background = ON_HOVER_BG;
    };
    el.onmouseleave = () => {
      el.style.background = REST_BG;
    };
  }, [isStuck, isOpen]);

  // Measure the dock line (bottom edge of the fixed header, found by
  // hit-testing straight down at the button's center-x until real scrollable
  // content is hit) + horizontal position. Rare events only — the dock is a
  // function of layout, not scroll position.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !bodyEnabled) return;

    const measure = () => {
      const btn = node.parentElement as HTMLElement | null;
      if (!btn) return;
      const btnRect = btn.getBoundingClientRect();
      const el = floatingElRef.current;

      // Tab hidden / not laid out yet.
      if (btnRect.width === 0) return;

      const scrollParent = findScrollParent(node);
      scrollParentRef.current = scrollParent;
      const scrollLeft = scrollParent ? scrollParent.scrollLeft : window.scrollX;
      posRef.current.left = btnRect.left + scrollLeft + X_BUFFER;
      if (el) el.style.left = `${posRef.current.left}px`;

      // Let hit-tests pass through the floating element so it can't occlude
      // its own measurements (which would make it drift down).
      if (el) el.style.pointerEvents = 'none';

      let dockTop = 0;
      if (scrollParent) {
        const cx = btnRect.left + btnRect.width / 2;
        for (let y = 0; y < window.innerHeight; y += 1) {
          const hit = document.elementFromPoint(cx, y);
          if (
            hit &&
            (hit === scrollParent || scrollParent.contains(hit)) &&
            !isFixedOverlay(hit, scrollParent)
          ) {
            dockTop = y;
            break;
          }
        }
      }

      if (el) el.style.pointerEvents = '';

      const measuredTop = dockTop + Y_BASE;
      const offset = measuredTop < 30 ? 0 : -30;
      offsetRef.current = offset;

      posRef.current = {
        left: btnRect.left + scrollLeft + X_BUFFER,
        top: measuredTop + offset,
      };
      if (el) {
        el.style.left = `${posRef.current.left}px`;
        el.style.top = `${posRef.current.top}px`;
      }
      setDockVersion((v) => v + 1);
    };

    // The dock geometry shifts on resize and when the TOC dialog closes
    // (page reflow). Keep the position fresh on horizontal scroll too —
    // that's one rect read, not a scan.
    let measureRaf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(measureRaf);
      measureRaf = requestAnimationFrame(measure);
    };
    const updateXOnly = () => {
      const scrollParent = scrollParentRef.current;
      const scrollLeft = scrollParent ? scrollParent.scrollLeft : window.scrollX;
      // Skip entirely on vertical-only scrolls — the clone's X can't move.
      // (A rect read + style write per scroll event thrashes layout.)
      if (scrollLeft === lastScrollLeftRef.current) return;
      lastScrollLeftRef.current = scrollLeft;
      const btn = node.parentElement as HTMLElement | null;
      if (!btn) return;
      const btnRect = btn.getBoundingClientRect();
      if (btnRect.width === 0) return;
      posRef.current.left = btnRect.left + scrollLeft + X_BUFFER;
      const el = floatingElRef.current;
      if (el) el.style.left = `${posRef.current.left}px`;
    };

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      // Dialog open — it covers the screen, so a hit-scan would measure the
      // dialog instead of the header. Freeze dock geometry; keep X in sync.
      updateXOnly();
      window.addEventListener('resize', updateXOnly);
      window.addEventListener('scroll', updateXOnly, true);
    } else {
      // Re-measure the dock now (or once the close animation settles — the
      // 1s delay preserves the old "don't snap back mid-animation" feel).
      settleTimer = setTimeout(measure, wasOpen ? 1000 : 0);
      window.addEventListener('resize', scheduleMeasure);
      window.addEventListener('scroll', updateXOnly, true);
    }

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      cancelAnimationFrame(measureRaf);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('resize', updateXOnly);
      window.removeEventListener('scroll', updateXOnly, true);
    };
  }, [isOpen, bodyEnabled]);

  // Stuck detection: the button is "stuck" once its midpoint rises above the
  // dock line (dockTop + SWITCH_LINE + offset). IntersectionObserver does the
  // crossing test in the compositor — zero per-scroll JS.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !bodyEnabled || typeof IntersectionObserver === 'undefined') return;
    const btn = node.parentElement;
    const scrollParent = scrollParentRef.current;
    if (!btn) return;

    // Fold the switch line into the root margin: shrink the root's top edge
    // so the button "leaves" the root exactly when its midpoint crosses the
    // switch line. `rootMargin` is relative to the root's own top edge —
    // dockTop measured that edge already (the scan lands on the container's
    // first visible content row), so it must not be added again here.
    const switchPx = SWITCH_LINE + offsetRef.current - btn.clientHeight / 2;
    const rootMargin = `-${Math.max(switchPx, 0)}px 0px 0px 0px`;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isOpenRef.current) return; // frozen while dialog is open
        const entry = entries[0];
        // Rect height 0 (hidden/unlaid-out pane) reports non-intersecting;
        // only accept the signal when the button has real geometry.
        if (btn.getBoundingClientRect().width === 0) return;
        setIsStuck(!entry.isIntersecting);
      },
      { root: scrollParent, rootMargin, threshold: 0 }
    );
    observer.observe(btn);
    return () => observer.disconnect();
  }, [dockVersion, bodyEnabled]);

  return (
    <View className="relative h-10 w-10">
      <div
        ref={sentinelRef}
        style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }}
      />
      <Pressable
        testID="rulebook-toc-btn"
        onPress={onPress}
        style={{ opacity: isStuck ? 0 : 1, pointerEvents: isStuck ? 'none' : 'auto' }}
        className="bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full">
        <List size={20} color="rgb(46, 41, 37)" />
      </Pressable>
    </View>
  );
};

export default StickyTocButton;
