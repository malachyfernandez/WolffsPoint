import React, { PropsWithChildren, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import ChainLockOverlay from './ChainLockOverlay';
import { useChainLockDimensions } from './useChainLockDimensions';
import GuildedFrame from '../ui/chrome/GuildedFrame';

interface ChainWraperProps extends PropsWithChildren {
    isDisabled?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
}

interface OverlaySize {
    width: number;
    height: number;
}

const ChainWraper = ({ children, isDisabled = false, className, style }: ChainWraperProps) => {
    const [overlaySize, setOverlaySize] = useState<OverlaySize>({ width: 0, height: 0 });

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

    const dimensions = useChainLockDimensions(overlaySize);
    const hasMeasuredBounds = dimensions !== null;

    if (!isDisabled) {
        return (
            <View className={`${className} rounded-2xl`} style={[styles.container, style]} onLayout={handleLayout}>
                <View style={isDisabled ? styles.disabledContent : undefined}>{children}</View>

                {isDisabled && hasMeasuredBounds && dimensions ? (
                    <View pointerEvents='none' style={styles.overlayContainer}>
                        <ChainLockOverlay
                            width={overlaySize.width}
                            height={overlaySize.height}
                            centerX={dimensions.centerX}
                            centerY={dimensions.centerY}
                            linkWidth={dimensions.linkWidth}
                            linkHeight={dimensions.linkHeight}
                            linkStrokeWidth={dimensions.linkStrokeWidth}
                            centerGap={dimensions.centerGap}
                            startInset={dimensions.startInset}
                            spacing={dimensions.spacing}
                            edgeBleed={dimensions.edgeBleed}
                            lockWidth={dimensions.lockWidth}
                            lockBodyHeight={dimensions.lockBodyHeight}
                            shackleWidth={dimensions.shackleWidth}
                            shackleStrokeWidth={dimensions.shackleStrokeWidth}
                            shackleBottomY={dimensions.shackleBottomY}
                            shackleTopY={dimensions.shackleTopY}
                            shackleLeftX={dimensions.shackleLeftX}
                            shackleRightX={dimensions.shackleRightX}
                            shackleCurveY={dimensions.shackleCurveY}
                            lockBodyY={dimensions.lockBodyY}
                            keyholeCircleY={dimensions.keyholeCircleY}
                            keyholeRadius={dimensions.keyholeRadius}
                            keyholeSlotWidth={dimensions.keyholeSlotWidth}
                            keyholeSlotHeight={dimensions.keyholeSlotHeight}
                        />
                        <View style={styles.overlayWash} />
                    </View>
                ) : null}
            </View>
        );
    }

    return (
        <GuildedFrame variant="silver" className={`${className}`} >
            <View className={`${className} rounded-2xl overflow-hidden`} style={[styles.container, style]} onLayout={handleLayout}>
                <View style={isDisabled ? styles.disabledContent : undefined}>{children}</View>

                {isDisabled && hasMeasuredBounds && dimensions ? (
                    <View pointerEvents='none' style={styles.overlayContainer}>
                        <ChainLockOverlay
                            width={overlaySize.width}
                            height={overlaySize.height}
                            centerX={dimensions.centerX}
                            centerY={dimensions.centerY}
                            linkWidth={dimensions.linkWidth}
                            linkHeight={dimensions.linkHeight}
                            linkStrokeWidth={dimensions.linkStrokeWidth}
                            centerGap={dimensions.centerGap}
                            startInset={dimensions.startInset}
                            spacing={dimensions.spacing}
                            edgeBleed={dimensions.edgeBleed}
                            lockWidth={dimensions.lockWidth}
                            lockBodyHeight={dimensions.lockBodyHeight}
                            shackleWidth={dimensions.shackleWidth}
                            shackleStrokeWidth={dimensions.shackleStrokeWidth}
                            shackleBottomY={dimensions.shackleBottomY}
                            shackleTopY={dimensions.shackleTopY}
                            shackleLeftX={dimensions.shackleLeftX}
                            shackleRightX={dimensions.shackleRightX}
                            shackleCurveY={dimensions.shackleCurveY}
                            lockBodyY={dimensions.lockBodyY}
                            keyholeCircleY={dimensions.keyholeCircleY}
                            keyholeRadius={dimensions.keyholeRadius}
                            keyholeSlotWidth={dimensions.keyholeSlotWidth}
                            keyholeSlotHeight={dimensions.keyholeSlotHeight}
                        />
                        <View style={styles.overlayWash} />
                    </View>
                ) : null}
            </View>
        </GuildedFrame>
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
        backgroundColor: 'rgba(0, 0, 0, 0)',
    },
});

export default ChainWraper;
