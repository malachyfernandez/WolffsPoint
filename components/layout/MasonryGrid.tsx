import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { extractGapStyle } from './gapStyle';

interface MasonryGridProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  // Auto column count: as many minColumnWidth-wide columns as fit (default 280)
  minColumnWidth?: number;
  // Fixed column count override (skips minColumnWidth calculation)
  columnCount?: number;
  // Numeric gaps take precedence over gap-* className tokens
  gap?: number;
  gapX?: number;
  gapY?: number;
}

// Masonry layout for React Native (no built-in equivalent). Each item renders
// absolutely positioned once its height is measured via onLayout, and is placed
// into the currently shortest column. Items stay mounted in place, so heights
// re-measure and reflow automatically when content or width changes.
//
// Renders every item (no virtualization) - intended for tens of items, not
// hundreds. Zero-height items (renderItem returning null) take up no space.
function MasonryGrid<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  style,
  minColumnWidth = 280,
  columnCount: fixedColumnCount,
  gap,
  gapX,
  gapY,
}: MasonryGridProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (prev === width ? prev : width));
  }, []);

  const handleItemLayout = useCallback((key: string, event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setHeights((prev) => (prev[key] === height ? prev : { ...prev, [key]: height }));
  }, []);

  const classNameGap = extractGapStyle(className);
  const asNumber = (value: string | number | undefined) =>
    typeof value === 'number' ? value : undefined;
  const resolvedGapX =
    gapX ?? gap ?? asNumber(classNameGap?.columnGap) ?? asNumber(classNameGap?.gap) ?? 16;
  const resolvedGapY =
    gapY ?? gap ?? asNumber(classNameGap?.rowGap) ?? asNumber(classNameGap?.gap) ?? 16;

  const columnCount = Math.max(
    1,
    fixedColumnCount ??
      Math.min(
        items.length || 1,
        Math.floor((containerWidth + resolvedGapX) / (minColumnWidth + resolvedGapX))
      )
  );
  const columnWidth = Math.max(
    0,
    (containerWidth - resolvedGapX * (columnCount - 1)) / columnCount
  );

  const { positions, gridHeight } = useMemo(() => {
    const columnHeights = new Array<number>(columnCount).fill(0);
    const positions: Record<string, { left: number; top: number; measured: boolean }> = {};

    for (const item of items) {
      const key = keyExtractor(item);
      const height = heights[key];

      let shortestColumn = 0;
      for (let c = 1; c < columnCount; c++) {
        if (columnHeights[c] < columnHeights[shortestColumn]) {
          shortestColumn = c;
        }
      }

      positions[key] = {
        left: shortestColumn * (columnWidth + resolvedGapX),
        top: columnHeights[shortestColumn],
        measured: height !== undefined,
      };

      // Zero-height items (e.g. renderItem returned null) take up no space
      if (height) {
        columnHeights[shortestColumn] += height + resolvedGapY;
      }
    }

    return {
      positions,
      gridHeight: Math.max(0, Math.max(...columnHeights) - resolvedGapY),
    };
  }, [items, heights, columnCount, columnWidth, resolvedGapX, resolvedGapY, keyExtractor]);

  return (
    <View
      className={className}
      onLayout={handleContainerLayout}
      style={[{ width: '100%', height: gridHeight }, style]}>
      {containerWidth > 0 &&
        items.map((item, index) => {
          const key = keyExtractor(item);
          const position = positions[key];
          const measured = position?.measured ?? false;
          return (
            <View
              key={key}
              onLayout={(event) => handleItemLayout(key, event)}
              pointerEvents={measured ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                width: columnWidth,
                opacity: measured ? 1 : 0,
              }}>
              {renderItem(item, index)}
            </View>
          );
        })}
    </View>
  );
}

export default MasonryGrid;
