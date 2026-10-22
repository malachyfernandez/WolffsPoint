import React, { useEffect, useRef } from 'react';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, ScrollView } from 'react-native';

interface ShadowScrollViewProps {
  children: React.ReactNode;
  className?: string;
  scrollViewClassName?: string;
  direction?: 'vertical' | 'horizontal';
  topFade?: number;
  bottomFade?: number;
  leftFade?: number;
  rightFade?: number;
  extensionPercent?: number;
  horizontal?: boolean;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  style?: any;
  contentContainerStyle?: any;
  scrollViewComponent?: React.ComponentType<any>;
  [key: string]: any;
}

const ShadowScrollView = React.forwardRef<any, ShadowScrollViewProps>(
  (
    {
      children,
      className,
      scrollViewClassName,
      horizontal,
      pointerEvents,
      scrollViewComponent: ScrollViewComponent = ScrollView,
      ...scrollViewProps
    },
    ref
  ) => {
    // On web the forwarded ref resolves to the scrollable DOM node itself
    // (react-native-web patches scrollTo etc. onto it). Keep a local copy so
    // the wheel listener below can attach to it.
    const scrollNodeRef = useRef<any>(null);
    const setScrollRef = (node: any) => {
      scrollNodeRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    // Web: hidden-scrollbar horizontal strips otherwise can't be scrolled
    // with a mouse wheel, only trackpads and shift+wheel work natively.
    // Redirect vertical wheel deltas to scrollLeft; at the edges the event
    // is left alone so an enclosing scroller (or the page) still moves.
    useEffect(() => {
      if (Platform.OS !== 'web' || !horizontal) return;
      const node = scrollNodeRef.current as HTMLElement | null;
      if (!node || typeof node.addEventListener !== 'function') return;
      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
        const max = node.scrollWidth - node.clientWidth;
        if (max <= 0) return;
        const next = Math.min(max, Math.max(0, node.scrollLeft + e.deltaY));
        if (next === node.scrollLeft) return;
        e.preventDefault();
        node.scrollLeft = next;
      };
      node.addEventListener('wheel', onWheel, { passive: false });
      return () => node.removeEventListener('wheel', onWheel);
    }, [horizontal]);

    return (
      <ScrollShadow LinearGradientComponent={LinearGradient} className={className}>
        <ScrollViewComponent
          ref={setScrollRef}
          className={scrollViewClassName}
          horizontal={horizontal}
          {...scrollViewProps}
          style={[scrollViewProps.style, pointerEvents ? { pointerEvents } : null]}>
          {children}
        </ScrollViewComponent>
      </ScrollShadow>
    );
  }
);

export default ShadowScrollView;
