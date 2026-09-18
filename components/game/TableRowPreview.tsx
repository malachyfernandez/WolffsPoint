import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Eye } from 'lucide-react-native';
import FontText from '../ui/text/FontText';
import PlayerPreviewModal from './markdownEditor/PlayerPreviewModal';
import { WebDropdownPortal } from 'contexts/WebDropdownProvider';
import { useIsTouchInput } from 'hooks/useIsTouchInput';

export type RowPreviewTarget =
  | { kind: 'player'; email: string; dayIndex?: number }
  | { kind: 'role'; roleName: string };

interface RectSnapshot {
  top: number;
  left: number;
  bottom: number;
  width: number;
  height: number;
}

interface TableRowPreviewContextValue {
  /**
   * Rows register their DOM element + preview target. Returns an unregister
   * cleanup. No-op-safe when a table renders outside a TableRowPreview.
   */
  registerRow: (element: HTMLElement | null, target: RowPreviewTarget) => () => void;
}

const TableRowPreviewContext = createContext<TableRowPreviewContextValue | null>(null);

/** Null-safe when a table renders outside a TableRowPreview wrapper. */
export const useTableRowPreview = () => useContext(TableRowPreviewContext);

/** Matches the shared h-12 row height used by every operator table. */
const ROW_HEIGHT = 48;
/** How long the pill lingers after the pointer leaves the row zone, so the
 *  user can settle onto the pill itself without it disappearing. */
const HIDE_DELAY_MS = 300;
/** How far the pill's RIGHT edge sits inside the table area's left edge —
 *  everything left of that pokes outside the tab. */
const PILL_INSIDE_PX = 12;
const PILL_WIDTH_PX = 52;
const CIRCLE_SIZE_PX = 28;
/** Extra horizontal reach left of the pill, so hovering "where the button
 *  should be" shows it even before the pointer is on the pill itself. */
const EDGE_ZONE_PX = 20;
/** Tailwind's `sm` breakpoint — below this the pill is a plain circle. */
const MOBILE_BREAKPOINT_PX = 640;
/** How long after the last scroll event before checking if rows settled. */
const SCROLL_END_MS = 150;
/** Poll interval for the settle check — pills only fade back in once row
 *  positions stop changing between two consecutive measurements. */
const SETTLE_POLL_MS = 80;
/** Max time to keep waiting for rows to settle before showing anyway. */
const SETTLE_MAX_WAIT_MS = 1500;
const FADE_MS = 200;

const snapshotRect = (rect: {
  top: number;
  left: number;
  bottom: number;
  width: number;
  height: number;
}): RectSnapshot => ({
  top: rect.top,
  left: rect.left,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height,
});

const targetKey = (target: RowPreviewTarget) =>
  target.kind === 'player'
    ? `player:${target.email}:${target.dayIndex}`
    : `role:${target.roleName}`;

interface PreviewPillProps {
  onPress: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  /** Mobile (below `sm`) renders a plain icon-only circle — no text swap. */
  circle?: boolean;
}

/**
 * The floating pill itself. Shows just the eye — fixed width so it can't
 * resize — and swaps the eye for the "Preview" text when the pill itself is
 * hovered. In circle mode it's always just the eye.
 */
const PreviewPill = ({ onPress, onHoverIn, onHoverOut, circle = false }: PreviewPillProps) => {
  const [isPillHovered, setIsPillHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => {
        setIsPillHovered(true);
        onHoverIn();
      }}
      onHoverOut={() => {
        setIsPillHovered(false);
        onHoverOut();
      }}
      className={`border-border/40 bg-text/10 items-center justify-center rounded-full border backdrop-blur-sm ${
        circle ? 'h-7 w-7' : 'w-13 h-7'
      }`}>
      {!circle && isPillHovered ? (
        <FontText weight="medium" className="text-[9px]">
          Preview
        </FontText>
      ) : (
        <Eye size={11} color="rgb(46, 41, 37)" />
      )}
    </Pressable>
  );
};

interface TableRowPreviewProps {
  gameId: string;
  children: React.ReactNode;
}

/**
 * Wraps an operator table area (the horizontally-scrolling ShadowScrollView).
 * Renders ONE shared floating "Preview" pill pinned to the left edge of the
 * table area, poking outside the tab.
 *
 * Rows register their DOM element + target; a window-level mousemove resolves
 * which row's vertical band the pointer sits at — so the pill appears when
 * hovering a row, the gap between tables, or the left edge where the pill
 * lives, and it stays put while the tables pan horizontally underneath it.
 */
const TableRowPreview = ({ gameId, children }: TableRowPreviewProps) => {
  const wrapperRef = useRef<View>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRegistryRef = useRef<Map<HTMLElement, RowPreviewTarget>>(new Map());
  const [hovered, setHovered] = useState<{
    top: number;
    left: number;
    target: RowPreviewTarget;
  } | null>(null);
  const [previewTarget, setPreviewTarget] = useState<RowPreviewTarget | null>(null);
  // Bumped to re-measure registered row rects in always-on (touch) mode.
  const [, setLayoutTick] = useState(0);

  const isTouchInput = useIsTouchInput();
  const { width: windowWidth } = useWindowDimensions();
  const isMobileWidth = windowWidth < MOBILE_BREAKPOINT_PX;
  const pillWidth = isMobileWidth ? CIRCLE_SIZE_PX : PILL_WIDTH_PX;

  // Pills fade out while scrolling (they'd lag behind) and while any dialog
  // is open.
  const [isScrolling, setIsScrolling] = useState(false);
  const [dialogsOpen, setDialogsOpen] = useState(false);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredRef = useRef<typeof hovered>(null);
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => setHovered(null), HIDE_DELAY_MS);
  }, [cancelHide]);

  const registerRow = useCallback((element: HTMLElement | null, target: RowPreviewTarget) => {
    if (element) rowRegistryRef.current.set(element, target);
    setLayoutTick((tick) => tick + 1);
    return () => {
      if (element) rowRegistryRef.current.delete(element);
      setLayoutTick((tick) => tick + 1);
    };
  }, []);

  const getWrapperRect = () =>
    (wrapperRef.current as unknown as HTMLElement | null)?.getBoundingClientRect?.();

  // Resolves which registered row (if any) sits at the given pointer position
  // and shows/updates/hides the pill accordingly. Returns whether a row
  // matched.
  const resolvePointer = useCallback(
    (x: number, y: number): boolean => {
      const wrapperRect = getWrapperRect();
      if (!wrapperRect) return false;

      const pillLeft = wrapperRect.left + PILL_INSIDE_PX - pillWidth;
      const inZone = x >= pillLeft - EDGE_ZONE_PX && x <= wrapperRect.right;

      // Prefer the row the pointer is actually over (player vs day row share
      // the same height); fall back to the first row matching the height.
      let matchRect: RectSnapshot | null = null;
      let matchTarget: RowPreviewTarget | null = null;
      if (inZone) {
        let fallbackRect: RectSnapshot | null = null;
        let fallbackTarget: RowPreviewTarget | null = null;
        for (const [el, target] of rowRegistryRef.current) {
          const rect = el.getBoundingClientRect();
          if (y < rect.top || y > rect.bottom) continue;
          if (x >= rect.left && x <= rect.right) {
            matchRect = snapshotRect(rect);
            matchTarget = target;
            break;
          }
          if (!fallbackRect) {
            fallbackRect = snapshotRect(rect);
            fallbackTarget = target;
          }
        }
        matchRect ??= fallbackRect;
        matchTarget ??= fallbackTarget;
      }

      if (!matchRect || !matchTarget) {
        if (hoveredRef.current) scheduleHide();
        return false;
      }

      cancelHide();
      const left = pillLeft;
      setHovered((prev) =>
        prev && prev.target === matchTarget && prev.top === matchRect!.top && prev.left === left
          ? prev
          : { top: matchRect!.top, left, target: matchTarget! }
      );
      return true;
    },
    [cancelHide, scheduleHide, pillWidth]
  );

  // Window-level pointer tracking (mouse mode only).
  useEffect(() => {
    if (Platform.OS !== 'web' || isTouchInput) return;
    const handleMove = (event: MouseEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      resolvePointer(event.clientX, event.clientY);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [resolvePointer, isTouchInput]);

  // Fade pills out the moment VERTICAL scrolling starts (they'd lag behind).
  // Horizontal pans inside the table don't move row bands, so pills stay put.
  // After scroll ends, row positions are polled until they stop changing —
  // pills only fade back in once the rows have actually settled.
  const lastScrollPosRef = useRef<WeakMap<object, { top: number; left: number }>>(new WeakMap());
  const settledTopsRef = useRef<number[] | null>(null);
  const settleStartedAtRef = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const measureRowTops = () => {
      const tops: number[] = [];
      for (const el of rowRegistryRef.current.keys()) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) tops.push(Math.round(rect.top * 10) / 10);
      }
      return tops.sort((a, b) => a - b);
    };

    const recheckThenShow = () => {
      if (isTouchInput) {
        setLayoutTick((tick) => tick + 1);
      } else {
        const pointer = lastPointerRef.current;
        const matched = pointer ? resolvePointer(pointer.x, pointer.y) : false;
        if (!matched) {
          // Pointer left the zone while scrolling — clear now instead of the
          // linger-delay, so the pill never flashes back in before hiding.
          cancelHide();
          setHovered(null);
        }
      }
      // Batched with the re-measure above → pills reappear already positioned.
      setIsScrolling(false);
    };

    const settleCheck = () => {
      const tops = measureRowTops();
      const last = settledTopsRef.current;
      settledTopsRef.current = tops;
      const moved =
        !last ||
        last.length !== tops.length ||
        tops.some((top, i) => Math.abs(top - last[i]) > 0.5);
      const waited = performance.now() - settleStartedAtRef.current;
      if (moved && waited < SETTLE_MAX_WAIT_MS) {
        scrollEndTimerRef.current = setTimeout(settleCheck, SETTLE_POLL_MS);
        return;
      }
      recheckThenShow();
    };

    const armScrollEnd = () => {
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      settleStartedAtRef.current = performance.now();
      scrollEndTimerRef.current = setTimeout(() => {
        // Baseline measurement — the next poll decides settled-or-not.
        settledTopsRef.current = null;
        settleCheck();
      }, SCROLL_END_MS);
    };

    const handleScroll = (event: Event) => {
      const target = (
        event.target === document ? document.documentElement : event.target
      ) as HTMLElement;
      const prev = lastScrollPosRef.current.get(target) ?? {
        top: target.scrollTop,
        left: target.scrollLeft,
      };
      const isVertical = target.scrollTop !== prev.top;
      lastScrollPosRef.current.set(target, { top: target.scrollTop, left: target.scrollLeft });
      if (!isVertical) return;
      setIsScrolling(true);
      if (isTouchInput) setLayoutTick((tick) => tick + 1);
      armScrollEnd();
    };
    const handleResize = () => {
      setIsScrolling(true);
      armScrollEnd();
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isTouchInput, resolvePointer, cancelHide]);

  // Hide pills whenever any dialog is open (all dialogs on these pages are
  // heroui-native ConvexDialogs — Content renders role="dialog" + aria-modal).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const check = () =>
      setDialogsOpen(!!document.querySelector('[role="dialog"][aria-modal="true"]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal'],
    });
    return () => observer.disconnect();
  }, []);

  const contextValue = React.useMemo(() => ({ registerRow }), [registerRow]);

  // Pills fade out while scrolling (they'd lag behind the rows) and while any
  // dialog is open, then fade back in — quick 200ms opacity fade.
  const pillsHidden = isScrolling || dialogsOpen;
  const pillOpacity = useSharedValue(1);
  useEffect(() => {
    pillOpacity.value = withTiming(pillsHidden ? 0 : 1, { duration: FADE_MS });
  }, [pillsHidden, pillOpacity]);
  const pillFadeStyle = useAnimatedStyle(() => ({ opacity: pillOpacity.value }));

  // Touch mode shows every registered row's pill at once (deduped by row
  // band — the player and day tables share row heights). Mouse mode shows
  // only the single hovered row's pill.
  const pillItems: { key: string; top: number; left: number; target: RowPreviewTarget }[] = [];
  if (isTouchInput && Platform.OS === 'web') {
    const left = (getWrapperRect()?.left ?? 0) + PILL_INSIDE_PX - pillWidth;
    const seenTops = new Set<number>();
    for (const [el, target] of rowRegistryRef.current) {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0) continue;
      const top = Math.round(rect.top);
      if (seenTops.has(top)) continue;
      seenTops.add(top);
      pillItems.push({ key: `${targetKey(target)}@${top}`, top: rect.top, left, target });
    }
  } else if (hovered) {
    pillItems.push({
      key: `${targetKey(hovered.target)}@${hovered.top}`,
      top: hovered.top,
      left: hovered.left,
      target: hovered.target,
    });
  }

  return (
    <TableRowPreviewContext.Provider value={contextValue}>
      <View ref={wrapperRef}>
        {children}
        {pillItems.length > 0 && (
          <WebDropdownPortal>
            {/* Inside the portal root (fixed, inset:0 over the viewport) an
                absolute child positions in viewport coordinates. */}
            <Animated.View
              pointerEvents={pillsHidden ? 'none' : 'box-none'}
              style={[{ position: 'absolute', inset: 0 }, pillFadeStyle]}>
              {pillItems.map((item) => (
                <View
                  key={item.key}
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    top: item.top,
                    left: item.left,
                    height: ROW_HEIGHT,
                    justifyContent: 'center',
                  }}>
                  <View pointerEvents="auto">
                    <PreviewPill
                      circle={isMobileWidth}
                      onPress={() => {
                        setPreviewTarget(item.target);
                        setHovered(null);
                      }}
                      onHoverIn={cancelHide}
                      onHoverOut={scheduleHide}
                    />
                  </View>
                </View>
              ))}
            </Animated.View>
          </WebDropdownPortal>
        )}
        <PlayerPreviewModal
          isOpen={previewTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewTarget(null);
          }}
          gameId={gameId}
          playerEmail={previewTarget?.kind === 'player' ? previewTarget.email : undefined}
          roleName={previewTarget?.kind === 'role' ? previewTarget.roleName : undefined}
          initialDayIndex={previewTarget?.kind === 'player' ? previewTarget.dayIndex : undefined}
        />
      </View>
    </TableRowPreviewContext.Provider>
  );
};

export default TableRowPreview;
