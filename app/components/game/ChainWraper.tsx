import React, { PropsWithChildren, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface ChainWraperProps extends PropsWithChildren {
    isDisabled?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
}

interface OverlaySize {
    width: number;
    height: number;
}

interface ChainPoint {
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

const buildChainPoints = ({
    startX,
    startY,
    endX,
    endY,
    startInset,
    endInset,
    spacing,
}: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    startInset: number;
    endInset: number;
    spacing: number;
}): ChainPoint[] => {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);

    if (!length) {
        return [];
    }

    const usableLength = Math.max(length - startInset - endInset, 0);
    const linkCount = Math.max(3, Math.round(usableLength / spacing));
    const unitX = dx / length;
    const unitY = dy / length;
    const baseRotation = (Math.atan2(dy, dx) * 180) / Math.PI;

    return Array.from({ length: linkCount }, (_, index) => {
        const progress = linkCount === 1 ? 0.5 : (index + 0.55) / (linkCount + 0.1);
        const distance = startInset + usableLength * progress;

        return {
            x: startX + unitX * distance,
            y: startY + unitY * distance,
            rotation: baseRotation + (index % 2 === 0 ? 8 : -8),
            scale: 1 - Math.abs(progress - 0.5) * 0.08,
        };
    });
};

const ChainWraper = ({ children, isDisabled = false, className, style }: ChainWraperProps) => {
    const [overlaySize, setOverlaySize] = useState<OverlaySize>({ width: 0, height: 0 });
    const gradientSuffix = useMemo(() => Math.random().toString(36).slice(2, 10), []);

    const chainGradientId = `chain-metal-${gradientSuffix}`;
    const chainShineId = `chain-shine-${gradientSuffix}`;
    const lockGradientId = `lock-body-${gradientSuffix}`;
    const lockStrokeId = `lock-stroke-${gradientSuffix}`;
    const shackleGradientId = `shackle-${gradientSuffix}`;

    const handleLayout = (event: LayoutChangeEvent) => {
        const nextWidth = event.nativeEvent.layout.width;
        const nextHeight = event.nativeEvent.layout.height;

        setOverlaySize((currentSize) => {
            if (currentSize.width === nextWidth && currentSize.height === nextHeight) {
                return currentSize;
            }

            return {
                width: nextWidth,
                height: nextHeight,
            };
        });
    };

    const { width, height } = overlaySize;
    const hasMeasuredBounds = width > 0 && height > 0;

    const linkWidth = Math.max(Math.min(width * 0.16, 72), 44);
    const linkHeight = Math.max(Math.min(linkWidth * 0.42, 24), 16);
    const linkStrokeWidth = Math.max(Math.min(linkHeight * 0.42, 10), 6);
    const edgeBleed = linkWidth * 0.48;
    const centerX = width / 2;
    const centerY = height / 2;
    const lockWidth = Math.max(Math.min(Math.min(width, height) * 0.24, 84), 50);
    const lockBodyHeight = lockWidth * 0.76;
    const centerGap = lockWidth * 0.6;
    const startInset = linkWidth * 0.22;
    const spacing = Math.max(linkWidth * 0.62, 30);

    const topLeftChain = useMemo(
        () => buildChainPoints({
            startX: -edgeBleed,
            startY: -edgeBleed,
            endX: centerX,
            endY: centerY,
            startInset,
            endInset: centerGap,
            spacing,
        }),
        [centerGap, centerX, centerY, edgeBleed, spacing, startInset],
    );
    const topRightChain = useMemo(
        () => buildChainPoints({
            startX: width + edgeBleed,
            startY: -edgeBleed,
            endX: centerX,
            endY: centerY,
            startInset,
            endInset: centerGap,
            spacing,
        }),
        [centerGap, centerX, centerY, edgeBleed, spacing, startInset, width],
    );
    const bottomLeftChain = useMemo(
        () => buildChainPoints({
            startX: -edgeBleed,
            startY: height + edgeBleed,
            endX: centerX,
            endY: centerY,
            startInset,
            endInset: centerGap,
            spacing,
        }),
        [centerGap, centerX, centerY, edgeBleed, height, spacing, startInset],
    );
    const bottomRightChain = useMemo(
        () => buildChainPoints({
            startX: width + edgeBleed,
            startY: height + edgeBleed,
            endX: centerX,
            endY: centerY,
            startInset,
            endInset: centerGap,
            spacing,
        }),
        [centerGap, centerX, centerY, edgeBleed, height, spacing, startInset, width],
    );

    const shackleWidth = lockWidth * 0.54;
    const shackleStrokeWidth = Math.max(lockWidth * 0.12, 7);
    const shackleBottomY = centerY - lockBodyHeight * 0.4;
    const shackleTopY = shackleBottomY - lockWidth * 0.48;
    const shackleLeftX = centerX - shackleWidth / 2;
    const shackleRightX = centerX + shackleWidth / 2;
    const shackleCurveY = shackleTopY + (shackleBottomY - shackleTopY) * 0.42;
    const lockBodyY = centerY - lockBodyHeight * 0.02;
    const keyholeCircleY = lockBodyY + lockBodyHeight * 0.34;
    const keyholeRadius = Math.max(lockWidth * 0.075, 4);
    const keyholeSlotWidth = Math.max(lockWidth * 0.08, 4.5);
    const keyholeSlotHeight = Math.max(lockBodyHeight * 0.22, 12);

    const renderChain = (points: ChainPoint[], prefix: string) => {
        return points.map((point, index) => (
            <G key={`${prefix}-${index}`} transform={`translate(${point.x} ${point.y}) rotate(${point.rotation}) scale(${point.scale})`}>
                <Rect
                    x={-linkWidth / 2 + 1.5}
                    y={-linkHeight / 2 + 2}
                    width={linkWidth}
                    height={linkHeight}
                    rx={linkHeight / 2}
                    fill='none'
                    stroke='rgba(67, 58, 49, 0.24)'
                    strokeWidth={linkStrokeWidth + 2}
                />
                <Rect
                    x={-linkWidth / 2}
                    y={-linkHeight / 2}
                    width={linkWidth}
                    height={linkHeight}
                    rx={linkHeight / 2}
                    fill='none'
                    stroke={`url(#${chainGradientId})`}
                    strokeWidth={linkStrokeWidth}
                />
                <Rect
                    x={-linkWidth / 2 + linkStrokeWidth * 0.24}
                    y={-linkHeight / 2 + linkStrokeWidth * 0.22}
                    width={linkWidth - linkStrokeWidth * 0.48}
                    height={linkHeight - linkStrokeWidth * 0.48}
                    rx={Math.max(linkHeight / 2 - linkStrokeWidth * 0.24, 1)}
                    fill='none'
                    opacity={0.8}
                    stroke={`url(#${chainShineId})`}
                    strokeWidth={Math.max(linkStrokeWidth * 0.22, 1.4)}
                />
            </G>
        ));
    };

    return (
        <View className={className} style={[styles.container, style]} onLayout={handleLayout}>
            <View style={isDisabled ? styles.disabledContent : undefined}>{children}</View>

            {isDisabled && hasMeasuredBounds ? (
                <View pointerEvents='none' style={styles.overlayContainer}>
                    <View style={styles.overlayWash} />
                    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                        <Defs>
                            <LinearGradient id={chainGradientId} x1='0%' y1='0%' x2='100%' y2='100%'>
                                <Stop offset='0%' stopColor='#f6f2ee' />
                                <Stop offset='18%' stopColor='#d4cdc4' />
                                <Stop offset='52%' stopColor='#8e8479' />
                                <Stop offset='82%' stopColor='#d7d1c9' />
                                <Stop offset='100%' stopColor='#6f675f' />
                            </LinearGradient>
                            <LinearGradient id={chainShineId} x1='0%' y1='0%' x2='100%' y2='0%'>
                                <Stop offset='0%' stopColor='rgba(255,255,255,0.2)' />
                                <Stop offset='38%' stopColor='rgba(255,255,255,0.88)' />
                                <Stop offset='100%' stopColor='rgba(255,255,255,0.08)' />
                            </LinearGradient>
                            <LinearGradient id={lockGradientId} x1='0%' y1='0%' x2='100%' y2='0%'>
                                <Stop offset='0%' stopColor='#7a6d61' />
                                <Stop offset='14%' stopColor='#e8dfd2' />
                                <Stop offset='48%' stopColor='#a59686' />
                                <Stop offset='76%' stopColor='#f5ecdf' />
                                <Stop offset='100%' stopColor='#817466' />
                            </LinearGradient>
                            <LinearGradient id={lockStrokeId} x1='0%' y1='0%' x2='0%' y2='100%'>
                                <Stop offset='0%' stopColor='#f8f4ef' />
                                <Stop offset='100%' stopColor='#76695d' />
                            </LinearGradient>
                            <LinearGradient id={shackleGradientId} x1='0%' y1='0%' x2='100%' y2='100%'>
                                <Stop offset='0%' stopColor='#c8bfb4' />
                                <Stop offset='45%' stopColor='#f6f0e8' />
                                <Stop offset='100%' stopColor='#7a7065' />
                            </LinearGradient>
                        </Defs>

                        {renderChain(topLeftChain, 'top-left')}
                        {renderChain(topRightChain, 'top-right')}
                        {renderChain(bottomLeftChain, 'bottom-left')}
                        {renderChain(bottomRightChain, 'bottom-right')}

                        <Path
                            d={`M ${shackleLeftX} ${shackleBottomY} V ${shackleCurveY} C ${shackleLeftX} ${shackleTopY}, ${shackleRightX} ${shackleTopY}, ${shackleRightX} ${shackleCurveY} V ${shackleBottomY}`}
                            fill='none'
                            stroke='rgba(58, 49, 41, 0.22)'
                            strokeWidth={shackleStrokeWidth + 3}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            transform='translate(1.5 2)'
                        />
                        <Path
                            d={`M ${shackleLeftX} ${shackleBottomY} V ${shackleCurveY} C ${shackleLeftX} ${shackleTopY}, ${shackleRightX} ${shackleTopY}, ${shackleRightX} ${shackleCurveY} V ${shackleBottomY}`}
                            fill='none'
                            stroke={`url(#${shackleGradientId})`}
                            strokeWidth={shackleStrokeWidth}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />
                        <Path
                            d={`M ${shackleLeftX + shackleStrokeWidth * 0.18} ${shackleBottomY - shackleStrokeWidth * 0.18} V ${shackleCurveY} C ${shackleLeftX + shackleStrokeWidth * 0.18} ${shackleTopY + shackleStrokeWidth * 0.14}, ${shackleRightX - shackleStrokeWidth * 0.18} ${shackleTopY + shackleStrokeWidth * 0.14}, ${shackleRightX - shackleStrokeWidth * 0.18} ${shackleCurveY} V ${shackleBottomY - shackleStrokeWidth * 0.18}`}
                            fill='none'
                            opacity={0.72}
                            stroke='rgba(255,255,255,0.58)'
                            strokeWidth={Math.max(shackleStrokeWidth * 0.22, 1.4)}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        />

                        <Rect
                            x={centerX - lockWidth / 2 + 1.8}
                            y={lockBodyY + 2.2}
                            width={lockWidth}
                            height={lockBodyHeight}
                            rx={lockWidth * 0.16}
                            fill='rgba(59, 50, 43, 0.28)'
                        />
                        <Rect
                            x={centerX - lockWidth / 2}
                            y={lockBodyY}
                            width={lockWidth}
                            height={lockBodyHeight}
                            rx={lockWidth * 0.16}
                            fill={`url(#${lockGradientId})`}
                            stroke={`url(#${lockStrokeId})`}
                            strokeWidth={1.5}
                        />
                        <Path
                            d={`M ${centerX - lockWidth * 0.2} ${lockBodyY + lockBodyHeight * 0.14} H ${centerX + lockWidth * 0.2}`}
                            stroke='rgba(255,255,255,0.28)'
                            strokeWidth={1.4}
                            strokeLinecap='round'
                        />
                        <Circle cx={centerX} cy={keyholeCircleY} r={keyholeRadius} fill='rgba(72, 60, 49, 0.78)' />
                        <Rect
                            x={centerX - keyholeSlotWidth / 2}
                            y={keyholeCircleY + keyholeRadius * 0.5}
                            width={keyholeSlotWidth}
                            height={keyholeSlotHeight}
                            rx={keyholeSlotWidth / 2}
                            fill='rgba(72, 60, 49, 0.78)'
                        />
                    </Svg>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    disabledContent: {
        opacity: 0.45,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    overlayWash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(247, 242, 235, 0.16)',
    },
});

export default ChainWraper;
