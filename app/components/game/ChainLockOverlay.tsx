import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

interface ChainPoint {
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

interface ChainLockOverlayProps {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    linkWidth: number;
    linkHeight: number;
    linkStrokeWidth: number;
    centerGap: number;
    startInset: number;
    spacing: number;
    edgeBleed: number;
    lockWidth: number;
    lockBodyHeight: number;
    shackleWidth: number;
    shackleStrokeWidth: number;
    shackleBottomY: number;
    shackleTopY: number;
    shackleLeftX: number;
    shackleRightX: number;
    shackleCurveY: number;
    lockBodyY: number;
    keyholeCircleY: number;
    keyholeRadius: number;
    keyholeSlotWidth: number;
    keyholeSlotHeight: number;
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

const renderChain = (points: ChainPoint[], prefix: string, chainColor: string, linkWidth: number, linkHeight: number, linkStrokeWidth: number) => {
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
                stroke={chainColor}
                strokeWidth={linkStrokeWidth}
            />
        </G>
    ));
};

const ChainLockOverlay = ({
    width,
    height,
    centerX,
    centerY,
    linkWidth,
    linkHeight,
    linkStrokeWidth,
    centerGap,
    startInset,
    spacing,
    edgeBleed,
    lockWidth,
    lockBodyHeight,
    shackleWidth,
    shackleStrokeWidth,
    shackleBottomY,
    shackleTopY,
    shackleLeftX,
    shackleRightX,
    shackleCurveY,
    lockBodyY,
    keyholeCircleY,
    keyholeRadius,
    keyholeSlotWidth,
    keyholeSlotHeight,
}: ChainLockOverlayProps) => {
    const topLeftChain = buildChainPoints({
        startX: -edgeBleed,
        startY: -edgeBleed,
        endX: centerX,
        endY: centerY,
        startInset,
        endInset: centerGap,
        spacing,
    });

    const topRightChain = buildChainPoints({
        startX: width + edgeBleed,
        startY: -edgeBleed,
        endX: centerX,
        endY: centerY,
        startInset,
        endInset: centerGap,
        spacing,
    });

    const bottomLeftChain = buildChainPoints({
        startX: -edgeBleed,
        startY: height + edgeBleed,
        endX: centerX,
        endY: centerY,
        startInset,
        endInset: centerGap,
        spacing,
    });

    const bottomRightChain = buildChainPoints({
        startX: width + edgeBleed,
        startY: height + edgeBleed,
        endX: centerX,
        endY: centerY,
        startInset,
        endInset: centerGap,
        spacing,
    });

    return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {/* Render chains first (behind the lock) */}
            {renderChain(topLeftChain, 'top-left', '#4A5568', linkWidth, linkHeight, linkStrokeWidth)}
            {renderChain(topRightChain, 'top-right', '#5A6778', linkWidth, linkHeight, linkStrokeWidth)}
            {renderChain(bottomLeftChain, 'bottom-left', '#6A7988', linkWidth, linkHeight, linkStrokeWidth)}
            {renderChain(bottomRightChain, 'bottom-right', '#718096', linkWidth, linkHeight, linkStrokeWidth)}

            {/* Render lock on top of chains */}
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
                d={`M ${shackleLeftX} ${shackleBottomY + 10} V ${shackleCurveY + 10} C ${shackleLeftX} ${shackleTopY + 10}, ${shackleRightX} ${shackleTopY + 10}, ${shackleRightX} ${shackleCurveY + 10} V ${shackleBottomY + 10}`}
                fill='none'
                stroke='#5B0000'
                strokeWidth={shackleStrokeWidth}
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
                fill='#8B0000'
                stroke='#8B0000'
                strokeWidth={1.5}
            />
            <Path
                d={`M ${centerX - lockWidth * 0.2} ${lockBodyY + lockBodyHeight * 0.14} H ${centerX + lockWidth * 0.2}`}
                stroke='rgba(255,255,255,0.28)'
                strokeWidth={1.4}
                strokeLinecap='round'
            />
            <Circle cx={centerX} cy={keyholeCircleY} r={keyholeRadius} fill='#000000' />
            <Rect
                x={centerX - keyholeSlotWidth / 2}
                y={keyholeCircleY + keyholeRadius * 0.5}
                width={keyholeSlotWidth}
                height={keyholeSlotHeight}
                rx={keyholeSlotWidth / 2}
                fill='#000000'
            />
        </Svg>
    );
};

export default ChainLockOverlay;
