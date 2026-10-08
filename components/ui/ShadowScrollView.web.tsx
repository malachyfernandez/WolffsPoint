import React from 'react';
import { ScrollView } from 'react-native';

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
      direction,
      topFade,
      bottomFade,
      leftFade,
      rightFade,
      extensionPercent = 50,
      horizontal,
      pointerEvents,
      scrollViewComponent: ScrollViewComponent = ScrollView,
      contentContainerStyle,
      ...scrollViewProps
    },
    ref
  ) => {
    const resolvedDirection = direction ?? (horizontal ? 'horizontal' : 'vertical');
    const resolvedTopFade = topFade ?? (resolvedDirection === 'vertical' ? 24 : 0);
    const resolvedBottomFade = bottomFade ?? (resolvedDirection === 'vertical' ? 24 : 0);
    const resolvedLeftFade = leftFade ?? (resolvedDirection === 'horizontal' ? 24 : 0);
    const resolvedRightFade = rightFade ?? (resolvedDirection === 'horizontal' ? 24 : 0);

    const hasVerticalFade = resolvedTopFade + resolvedBottomFade > 0;
    const hasHorizontalFade = resolvedLeftFade + resolvedRightFade > 0;
    const hasAnyFade = hasVerticalFade || hasHorizontalFade;

    // Emit one mask layer per axis that actually fades. Previously BOTH
    // gradients were always composited (maskComposite:intersect), so a
    // vertical-only scroller paid for a second, fully-opaque mask — a whole
    // extra raster of the scroll content on every frame. WebKit masks are
    // expensive enough that this halves real per-frame scroll cost.
    const maskLayers: string[] = [];
    if (hasVerticalFade) {
      maskLayers.push(`linear-gradient(
        to bottom,
        transparent 0px,
        black ${resolvedTopFade}px,
        black calc(100% - ${resolvedBottomFade}px),
        transparent 100%
      )`);
    }
    if (hasHorizontalFade) {
      maskLayers.push(`linear-gradient(
        to right,
        transparent 0px,
        black ${resolvedLeftFade}px,
        black calc(100% - ${resolvedRightFade}px),
        transparent 100%
      )`);
    }
    const maskImage = maskLayers.join(', ');
    const needsIntersect = maskLayers.length > 1;

    const pct = extensionPercent / 100;

    const extendedStyles = {
      marginTop: -resolvedTopFade * pct,
      marginBottom: -resolvedBottomFade * pct,
      marginLeft: -resolvedLeftFade * pct,
      marginRight: -resolvedRightFade * pct,
    };

    const fadePadding = {
      paddingTop: resolvedTopFade * pct,
      paddingBottom: resolvedBottomFade * pct,
      paddingLeft: resolvedLeftFade * pct,
      paddingRight: resolvedRightFade * pct,
    };

    const mergedContentContainerStyle = React.useMemo(() => {
      if (!contentContainerStyle && !extensionPercent) return undefined;
      return {
        ...(contentContainerStyle || {}),
        ...fadePadding,
      };
    }, [contentContainerStyle, fadePadding, extensionPercent]);

    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...extendedStyles,
          ...(hasAnyFade
            ? {
                maskImage,
                WebkitMaskImage: maskImage,
                ...(needsIntersect
                  ? { maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }
                  : {}),
              }
            : {}),
        }}>
        <ScrollViewComponent
          ref={ref}
          className={scrollViewClassName}
          contentContainerStyle={mergedContentContainerStyle}
          horizontal={horizontal}
          {...scrollViewProps}
          style={[scrollViewProps.style, pointerEvents ? { pointerEvents } : null]}>
          {children}
        </ScrollViewComponent>
      </div>
    );
  }
);

export default ShadowScrollView;
