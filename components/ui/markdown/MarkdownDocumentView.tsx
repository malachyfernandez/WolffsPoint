import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../text/FontText';
import LayoutStateAnimatedView, { fromRight } from '../LayoutStateAnimatedView';
import { documentScreenAtPath, type MarkdownDocumentNode } from '../../../utils/markdownDocument';
import { scrollIntoViewBounded } from '../../../utils/domScroll';
import { PUSHED_SCREEN_TOP_GAP } from './navScreenTopGap';

type Leaf = Exclude<MarkdownDocumentNode, { kind: 'navigation' }>;
type ScrollSnapshot = { element: HTMLElement; top: number; left: number }[];
const scrollAnimTokens = new WeakMap<HTMLElement, number>();

export interface MarkdownDocumentNavigationRequest {
  path: string[];
  targetId?: string;
  nonce: number;
}

const Screen = ({
  children,
  onMounted,
  nativeID,
}: {
  children: React.ReactNode;
  onMounted: () => void;
  nativeID?: string;
}) => {
  useLayoutEffect(() => {
    onMounted();
  }, [onMounted]);
  return (
    <View nativeID={nativeID}>
      <Column className="gap-3">{children}</Column>
    </View>
  );
};

/** A document owns one navigation stack, including all its markdown/script islands. */
const MarkdownDocumentView = ({
  nodes,
  identity,
  renderLeaf,
  screenIdPrefix,
  navigationRequest,
}: {
  nodes: MarkdownDocumentNode[];
  identity: unknown;
  renderLeaf: (node: Leaf) => React.ReactNode;
  screenIdPrefix?: string;
  navigationRequest?: MarkdownDocumentNavigationRequest;
}) => {
  const [path, setPath] = useState<string[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Region floor while a nav transition may still be onscreen — the path is
   *  already [] when the exiting screen runs its pop-out, so the height must
   *  outlive the path itself or the region collapses and the scroll clamps. */
  const [heldMinHeight, setHeldMinHeight] = useState(0);
  const rootRef = useRef<View>(null);
  const snapshots = useRef(new Map<string, { scroll: ScrollSnapshot; focus?: string }>());
  /** Paths pushed by open(): on mount their screen is scrolled up so it
   *  starts at the viewport top when the region top has scrolled past. */
  const pushedPaths = useRef(new Set<string>());
  /** Tallest region height seen while navigating — held as a floor so the
   *  region never collapses to a shorter screen, which would clamp the page
   *  scroll to the bottom mid-transition. */
  const pushedMinHeight = useRef(0);
  const reduceMotionRef = useRef(false);
  reduceMotionRef.current = reduceMotion;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const screen = documentScreenAtPath(nodes, path);
  const key = JSON.stringify(screen.path);
  const rootIdentity = useRef(identity);
  // A changed source must not reuse another subtree at the same AST position.
  const effective = rootIdentity.current === identity ? screen : documentScreenAtPath(nodes, []);
  const effectiveKey = JSON.stringify(effective.path);
  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;
  const requestRef = useRef(navigationRequest);
  requestRef.current = navigationRequest;

  useEffect(() => {
    if (navigationRequest) setPath(navigationRequest.path);
  }, [navigationRequest]);

  useEffect(() => {
    if (rootIdentity.current !== identity) {
      rootIdentity.current = identity;
      snapshots.current.clear();
      pushedPaths.current.clear();
      pushedMinHeight.current = 0;
      setHeldMinHeight(0);
      setPath([]);
    } else if (key !== JSON.stringify(path)) setPath(screen.path);
  }, [identity, key, path, screen.path]);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const back = useCallback(() => {
    setPath(effectiveRef.current.path.slice(0, -1));
  }, []);

  // Release the region floor a beat after the pop-back completes; by then the
  // root screen is laid out and fills the region again.
  useEffect(() => {
    if (path.length || !heldMinHeight) return;
    const timer = setTimeout(() => {
      pushedMinHeight.current = 0;
      setHeldMinHeight(0);
    }, 700);
    return () => clearTimeout(timer);
  }, [path.length, heldMinHeight]);
  useEffect(() => {
    if (!effective.path.length || Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [back, effective.path.length]);

  const mounted = useCallback(() => {
    if (Platform.OS !== 'web') return;
    // Property assignment, not scrollTo: react-native-web patches scrollTo
    // on ScrollView host nodes with its own {x,y,animated} signature, so a
    // {top,left} call gets reinterpreted as a scroll to (0,0). And the
    // scroll-behavior:smooth trick is unreliable here — layout churn from the
    // push/pop transition cancels the browser's animation mid-flight — so the
    // frames are driven by hand and the target is re-clamped every frame.
    const animate = !reduceMotionRef.current;
    const assignTop = (el: HTMLElement, top: number) => {
      const from = el.scrollTop;
      if (!animate || Math.abs(top - from) < 2) {
        el.scrollTop = top;
        return;
      }
      const token = (scrollAnimTokens.get(el) ?? 0) + 1;
      scrollAnimTokens.set(el, token);
      const duration = Math.min(600, Math.max(250, Math.abs(top - from) * 0.4));
      const start = performance.now();
      const tick = () => {
        if (scrollAnimTokens.get(el) !== token || !el.isConnected) return;
        const target = Math.max(0, Math.min(top, el.scrollHeight - el.clientHeight));
        const k = Math.min(1, (performance.now() - start) / duration);
        el.scrollTop = from + (target - from) * (1 - Math.pow(1 - k, 3));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const snapshot = snapshots.current.get(JSON.stringify(effectiveRef.current.path));
    for (const entry of snapshot?.scroll ?? []) {
      if (entry.element.isConnected) {
        assignTop(entry.element, entry.top);
        entry.element.scrollLeft = entry.left;
      }
    }
    if (snapshot?.focus) document.getElementById(snapshot.focus)?.focus({ preventScroll: true });
    // A just-pushed screen: if the region top has scrolled above the usable
    // viewport top, lift the scroll so the screen starts there instead of the
    // user staring at held region space. The usable top is below any overlay
    // chrome pinned to the viewport (game header, code chip), plus breathing
    // room. Scrolling only ever moves up here, and it animates alongside the
    // push transition.
    const pathKey = JSON.stringify(effectiveRef.current.path);
    if (pushedPaths.current.delete(pathKey)) {
      const root = rootRef.current as unknown as HTMLElement | null;
      const rect = root?.getBoundingClientRect();
      let overlayBottom = 0;
      if (root && rect) {
        // Topmost scrollable ancestor: anything reached before a fixed
        // ancestor while walking up is document content, not pinned chrome.
        let scrollRoot: Element | null = null;
        for (let el = root.parentElement; el; el = el.parentElement) {
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            scrollRoot = el;
          }
        }
        const fixedOverlay = (hit: Element): Element | null => {
          if (hit === root || hit.contains(root) || root.contains(hit)) return null;
          for (let el: Element | null = hit; el && el !== document.body; el = el.parentElement) {
            if (el === scrollRoot) return null;
            if (getComputedStyle(el).position === 'fixed') return el;
          }
          return null;
        };
        // Scan a strip down the viewport at several x samples (chrome like
        // the sim button only covers the left edge): keep the deepest fixed
        // overlay's bottom edge, stop at the first in-flow content hit.
        const scanDepth = Math.min(window.innerHeight * 0.6, 240);
        for (const fraction of [0.04, 0.25, 0.5, 0.75, 0.96]) {
          const x = rect.left + Math.max(8, Math.min(rect.width - 8, rect.width * fraction));
          for (let y = 2; y < scanDepth; y += 8) {
            const hit = document.elementFromPoint(x, y);
            if (!hit) break;
            const overlay = fixedOverlay(hit);
            if (!overlay) break;
            const overlayRect = overlay.getBoundingClientRect();
            if (overlayRect.bottom > y) y = Math.floor(overlayRect.bottom);
            if (
              overlayRect.bottom > overlayBottom &&
              overlayRect.bottom < window.innerHeight * 0.6
            ) {
              overlayBottom = overlayRect.bottom;
            }
          }
        }
      }
      const targetTop = overlayBottom + PUSHED_SCREEN_TOP_GAP;
      let lift = rect ? Math.max(0, targetTop - rect.top) : 0;
      let el = root?.parentElement ?? null;
      while (el && lift > 0) {
        if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
          const take = Math.min(lift, el.scrollTop);
          if (take > 0) {
            assignTop(el, el.scrollTop - take);
            lift -= take;
          }
        }
        el = el.parentElement;
      }
    }
    const request = requestRef.current;
    if (
      request?.targetId &&
      JSON.stringify(request.path) === JSON.stringify(effectiveRef.current.path)
    ) {
      requestAnimationFrame(() => {
        const el = document.getElementById(request.targetId!);
        if (el) scrollIntoViewBounded(el, { block: 'start' });
      });
    }
  }, []);

  const open = (node: Extract<MarkdownDocumentNode, { kind: 'navigation' }>, focus: string) => {
    const scroll: ScrollSnapshot = [];
    const nextPath = [...effective.path, node.id];
    if (Platform.OS === 'web') {
      pushedPaths.current.add(JSON.stringify(nextPath));
      const root = rootRef.current as unknown as HTMLElement | null;
      if (root) {
        pushedMinHeight.current = Math.max(
          pushedMinHeight.current,
          root.getBoundingClientRect().height
        );
        setHeldMinHeight(pushedMinHeight.current);
      }
      let element = root;
      while (element) {
        if (
          element.scrollHeight > element.clientHeight ||
          element.scrollWidth > element.clientWidth
        ) {
          scroll.push({ element, top: element.scrollTop, left: element.scrollLeft });
        }
        element = element.parentElement;
      }
    }
    snapshots.current.set(effectiveKey, { scroll, focus });
    setPath(nextPath);
  };

  const animation = reduceMotion
    ? {
        forward: { entering: { duration: 0 }, exiting: { duration: 0 } },
        backward: { entering: { duration: 0 }, exiting: { duration: 0 } },
      }
    : fromRight;

  // Retain ancestor options while pushing/popping so the existing page-tree
  // animator can transition between adjacent depths without mounting hidden pages.
  const screens = Array.from(
    { length: Math.max(path.length, effective.path.length) + 1 },
    (_, depth) => documentScreenAtPath(nodes, effective.path.slice(0, depth))
  ).filter(
    (entry, index, all) =>
      all.findIndex((other) => JSON.stringify(other.path) === JSON.stringify(entry.path)) === index
  );

  return (
    <View
      ref={rootRef}
      className="min-w-0 overflow-hidden"
      style={heldMinHeight ? { minHeight: heldMinHeight } : undefined}>
      <LayoutStateAnimatedView.Container contentSized stateVar={effectiveKey}>
        {screens.map((entry) => {
          const screenId = JSON.stringify(entry.path);
          return (
            <LayoutStateAnimatedView.OptionContainer
              key={screenId}
              page={entry.path.length + 1}
              pushInAnimation={animation}>
              <LayoutStateAnimatedView.Option stateValue={screenId}>
                <Screen
                  key={screenId}
                  onMounted={mounted}
                  nativeID={
                    screenIdPrefix && entry.path.length
                      ? `${screenIdPrefix}-nav-${encodeURIComponent(entry.path[entry.path.length - 1])}`
                      : undefined
                  }>
                  {entry.path.length > 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Back"
                      onPress={(event) => {
                        event.stopPropagation();
                        back();
                      }}
                      className="self-start py-2">
                      <Row className="items-center gap-2">
                        <ChevronLeft size={18} color="currentColor" />
                        <FontText weight="bold">{entry.title}</FontText>
                      </Row>
                    </Pressable>
                  )}
                  {entry.nodes.map((node) => {
                    if (node.kind !== 'navigation')
                      return <React.Fragment key={node.id}>{renderLeaf(node)}</React.Fragment>;
                    const focus = `markdown-${id}-${encodeURIComponent(node.id)}`;
                    return (
                      <Pressable
                        key={node.id}
                        nativeID={focus}
                        accessibilityRole="button"
                        accessibilityLabel={node.label}
                        onPress={(event) => {
                          event.stopPropagation();
                          open(node, focus);
                        }}
                        className="border-subtle-border bg-text/5 hover:bg-text/10 flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3">
                        <FontText weight="medium" className="min-w-0 flex-1">
                          {node.label}
                        </FontText>
                        <ChevronRight size={18} color="currentColor" />
                      </Pressable>
                    );
                  })}
                </Screen>
              </LayoutStateAnimatedView.Option>
            </LayoutStateAnimatedView.OptionContainer>
          );
        })}
      </LayoutStateAnimatedView.Container>
    </View>
  );
};

export default MarkdownDocumentView;
