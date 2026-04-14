import { useMemo } from 'react';

interface OverlaySize {
    width: number;
    height: number;
}

interface ChainLockDimensions {
    linkWidth: number;
    linkHeight: number;
    linkStrokeWidth: number;
    edgeBleed: number;
    centerX: number;
    centerY: number;
    lockWidth: number;
    lockBodyHeight: number;
    centerGap: number;
    startInset: number;
    spacing: number;
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

export const useChainLockDimensions = (overlaySize: OverlaySize): ChainLockDimensions | null => {
    const { width, height } = overlaySize;
    const hasMeasuredBounds = width > 0 && height > 0;

    return useMemo(() => {
        if (!hasMeasuredBounds) {
            return null;
        }

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

        return {
            linkWidth,
            linkHeight,
            linkStrokeWidth,
            edgeBleed,
            centerX,
            centerY,
            lockWidth,
            lockBodyHeight,
            centerGap,
            startInset,
            spacing,
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
        };
    }, [width, height, hasMeasuredBounds]);
};
