import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
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
        circle ? 'h-7 w-7' : 'h-7 w-[52px]'
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
  const pillStripRef = useRef<View>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRegistryRef = useRef<Map<HTMLElement, RowPreviewTarget>>(new Map());
  const lastHoverKeyRef = useRef<string | null>(null);
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

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      setHovered(null);
      lastHoverKeyRef.current = null;
      console.log('[TableRowPreview] HIDE — pill removed after leave delay');
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  const registerRow = useCallback((element: HTMLElement | null, target: RowPreviewTarget) => {
    if (element) rowRegistryRef.current.set(element, target);
    setLayoutTick((tick) => tick + 1);
    return () => {
      if (element) rowRegistryRef.current.delete(element);
      setLayoutTick((tick) => tick + 1);
    };
  }, []);

  const getWrapperLeft = () =>
    (wrapperRef.current as unknown as HTMLElement | null)?.getBoundingClientRect?.().left ?? 0;

  // While touch input is active, every row's pill is always visible — keep
  // their positions fresh as the page scrolls/resizes.
  useEffect(() => {
    if (!isTouchInput || Platform.OS !== 'web') return;
    const bump = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    return () => {
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
    };
  }, [isTouchInput]);

  // Window-level pointer tracking (mouse mode only): any position inside the
  // table area — plus the pill's edge zone — at a registered row's height
  // shows that row's pill.
  useEffect(() => {
    if (Platform.OS !== 'web' || isTouchInput) return;
    const handleMove = (event: MouseEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      const wrapperRect = (
        wrapperRef.current as unknown as HTMLElement | null
      )?.getBoundingClientRect?.();
      if (!wrapperRect) return;

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
        if (hovered) scheduleHide();
        return;
      }

      cancelHide();
      const left = pillLeft;
      const key = `${targetKey(matchTarget)}@${matchRect.top}`;
      if (key !== lastHoverKeyRef.current) {
        lastHoverKeyRef.current = key;
        console.log('[TableRowPreview] HOVER — master report', {
          pointer: { x, y, inZone },
          target: matchTarget,
          rowRect: matchRect,
          wrapperRect: snapshotRect(wrapperRect),
          pillPlacingAt: { top: matchRect.top, left },
          registeredRows: rowRegistryRef.current.size,
          viewport: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
        });
      }
      setHovered((prev) =>
        prev && prev.target === matchTarget && prev.top === matchRect!.top && prev.left === left
          ? prev
          : { top: matchRect!.top, left, target: matchTarget! }
      );
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [cancelHide, scheduleHide, hovered, isTouchInput, pillWidth]);

  // After the pill renders, log where it actually landed vs where we asked.
  useEffect(() => {
    if (!hovered || Platform.OS !== 'web') return;
    const raf = requestAnimationFrame(() => {
      const el = pillStripRef.current as unknown as HTMLElement | null;
      const rect = el?.getBoundingClientRect?.();
      const cs = el ? window.getComputedStyle(el) : null;
      console.log('[TableRowPreview] PILL RENDERED — placement check', {
        expected: { top: hovered.top, left: hovered.left },
        actualRect: rect ? snapshotRect(rect) : null,
        computedStyle: cs
          ? {
              position: cs.position,
              top: cs.top,
              left: cs.left,
              zIndex: cs.zIndex,
              pointerEvents: cs.pointerEvents,
            }
          : null,
        insidePortalRoot: !!el?.closest?.('#app-web-dropdown-portal-root'),
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  const contextValue = React.useMemo(() => ({ registerRow }), [registerRow]);

  // Touch mode shows every registered row's pill at once (deduped by row
  // band — the player and day tables share row heights). Mouse mode shows
  // only the single hovered row's pill.
  const pillItems: { key: string; top: number; left: number; target: RowPreviewTarget }[] = [];
  if (isTouchInput && Platform.OS === 'web') {
    const left = getWrapperLeft() + PILL_INSIDE_PX - pillWidth;
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
            {pillItems.map((item, index) => (
              <View
                key={item.key}
                ref={index === 0 ? pillStripRef : undefined}
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
