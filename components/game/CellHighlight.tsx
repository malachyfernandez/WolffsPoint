import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { PlacementCellKind } from '../../utils/scriptFiles';
import { scrollIntoViewBounded } from '../../utils/domScroll';

/** A pending "go to cell" request, set when a Files-tab placement chip is
 *  tapped. The matching cell flashes an outline and scrolls into view; the
 *  request self-clears after a few seconds (see OperatorGamePage) so rows
 *  that mount late (lazy tabs, progressive mounting) still catch it. */
export interface CellHighlightRequest {
  cellKind: PlacementCellKind;
  /** Stable identity: role name for role cells, lowercase email for mornings. */
  targetKey?: string;
  /** morningMessage only: the 1-based day index. */
  day?: number;
  /** Bumped per request so re-tapping the same chip re-flashes. */
  nonce: number;
}

export const CellHighlightContext = createContext<CellHighlightRequest | null>(null);

export const useCellHighlightRequest = () => useContext(CellHighlightContext);

/** Does this request point at the cell described by `match`? Undefined
 *  request fields are wildcards (e.g. voteDefault matches by kind alone). */
export const isCellHighlightMatch = (
  req: CellHighlightRequest | null,
  match: { cellKind: PlacementCellKind; targetKey?: string; day?: number }
): boolean =>
  req !== null &&
  req.cellKind === match.cellKind &&
  (req.targetKey === undefined || req.targetKey === match.targetKey) &&
  (req.day === undefined || req.day === match.day);

/** Absolute-fill outline that pulses then fades when `active` goes true for
 *  the current request: also scrolls the cell into view (bounded: vertical
 *  scrolls climb every ancestor + the window, horizontal movement is capped
 *  at the nearest scroller so the page itself can never shift; on native it
 *  just flashes). Render inside a
 *  `position: relative` cell container. */
export const CellHighlight = ({ active }: { active: boolean }) => {
  const req = useContext(CellHighlightContext);
  const ref = useRef<View>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active || !req) return;
    setShown(true);
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0.25, duration: 280, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0.25, duration: 280, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: false }),
      Animated.delay(500),
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setShown(false);
    });
    // Bounded scroll: the cell may live in a horizontally-scrolling table —
    // plain scrollIntoView would drag the whole page sideways to reach it.
    const scroll = () => {
      const el = ref.current as unknown as HTMLElement | null;
      if (el) scrollIntoViewBounded(el);
    };
    // Two passes: the first can land while the tab switch is still settling.
    const t1 = setTimeout(scroll, 200);
    const t2 = setTimeout(scroll, 700);
    return () => {
      anim.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, req, opacity]);

  if (!shown) return null;
  return (
    <Animated.View
      ref={ref}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 10,
          borderWidth: 2,
          borderRadius: 6,
          borderColor: '#4a6a8a',
          backgroundColor: 'rgba(74, 106, 138, 0.15)',
          opacity,
        },
      ]}
    />
  );
};
