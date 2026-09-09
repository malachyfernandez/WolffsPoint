import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue, withTiming, Easing, scrollTo } from 'react-native-reanimated';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import PressLogo from '../../ui/icons/Press';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react-native';
import ShadowScrollView from '../../ui/ShadowScrollView';

interface NewspaperZoomableViewProps {
    columns: string[];
    gameId: string;
    TILE_SIZE: number;
    roundBottom?: boolean;
}

const NEWSPAPER_WIDTH = 910;
const CONTENT_PADDING = 32;
const COLUMN_GAP = 16;
const SCROLL_PADDING = 40;
const ZOOM_FACTOR = 1.25;
const MAX_ZOOM = 3;

const NewspaperZoomableView = ({ columns, gameId, TILE_SIZE, roundBottom }: NewspaperZoomableViewProps) => {
    const [zoom, setZoom] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);

    const animatedZoom = useSharedValue(1);
    const animatedScrollX = useSharedValue(0);
    const centerUnscaled = useSharedValue(0);
    const unscaledContentHeight = useSharedValue(0);
    const scrollViewRef = useAnimatedRef<any>();

    const singleColumnWidth = useMemo(() => {
        const n = Math.max(columns.length, 1);
        return (NEWSPAPER_WIDTH - CONTENT_PADDING - (n - 1) * COLUMN_GAP) / n;
    }, [columns.length]);

    const minZoom = useMemo(() => {
        if (!containerWidth) return 0.2;
        return (containerWidth - SCROLL_PADDING) / NEWSPAPER_WIDTH;
    }, [containerWidth]);

    const defaultZoom = useMemo(() => {
        if (!containerWidth) return 1;
        const availableWidth = containerWidth - SCROLL_PADDING;
        if (singleColumnWidth / 0.85 <= availableWidth) {
            return 1;
        }
        return Math.max((availableWidth / singleColumnWidth) * 0.85, minZoom);
    }, [containerWidth, singleColumnWidth, minZoom]);

    const viewportWidth = Math.max(containerWidth - SCROLL_PADDING, 0);

    const animateTo = (value: number) => {
        animatedZoom.value = withTiming(value, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
        });
    };

    useEffect(() => {
        centerUnscaled.value = 0;
        setZoom(defaultZoom);
        animateTo(defaultZoom);
    }, [defaultZoom]);

    useAnimatedReaction(
        () => animatedZoom.value,
        (z) => {
            const targetX = Math.max(0, centerUnscaled.value * z - viewportWidth / 2);
            scrollTo(scrollViewRef, targetX, 0, false);
        },
    );

    const zoomTo = (nextZoom: number) => {
        centerUnscaled.value = (animatedScrollX.value + viewportWidth / 2) / zoom;
        setZoom(nextZoom);
        animateTo(nextZoom);
    };

    const zoomIn = () => zoomTo(Math.min(zoom * ZOOM_FACTOR, MAX_ZOOM));
    const zoomOut = () => zoomTo(Math.max(zoom / ZOOM_FACTOR, minZoom));
    const resetZoom = () => zoomTo(defaultZoom);

    const isAtMinZoom = zoom <= minZoom + 0.001;
    const isAtMaxZoom = zoom >= MAX_ZOOM - 0.001;
    const isAtDefault = Math.abs(zoom - defaultZoom) < 0.001;

    const animatedScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: animatedZoom.value }],
        transformOrigin: 'left top',
    }));
    const animatedWidthStyle = useAnimatedStyle(() => ({
        width: NEWSPAPER_WIDTH * animatedZoom.value,
        height: unscaledContentHeight.value * animatedZoom.value,
    }));

    const zoomButtonClass = 'h-9 w-9 items-center justify-center rounded-full border border-border/30 active:bg-text/5';

    return (
        <View
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {!containerWidth ? null : (
                <>
                    <Row className='gap-2 justify-center pb-3'>
                        <Pressable
                            onPress={zoomOut}
                            disabled={isAtMinZoom}
                            className={`${zoomButtonClass} ${isAtMinZoom ? 'opacity-30' : ''}`}
                        >
                            <ZoomOut size={18} color='rgb(46, 41, 37)' />
                        </Pressable>
                        <Pressable
                            onPress={resetZoom}
                            disabled={isAtDefault}
                            className={`${zoomButtonClass} ${isAtDefault ? 'opacity-30' : ''}`}
                        >
                            <Maximize size={18} color='rgb(46, 41, 37)' />
                        </Pressable>
                        <Pressable
                            onPress={zoomIn}
                            disabled={isAtMaxZoom}
                            className={`${zoomButtonClass} ${isAtMaxZoom ? 'opacity-30' : ''}`}
                        >
                            <ZoomIn size={18} color='rgb(46, 41, 37)' />
                        </Pressable>
                    </Row>

                    <ShadowScrollView
                        ref={scrollViewRef}
                        extensionPercent={0}
                        direction='horizontal'
                        className='w-full'
                        scrollViewClassName='w-full px-5'
                        horizontal
                        scrollEventThrottle={16}
                        onScroll={(e: any) => { animatedScrollX.value = e.nativeEvent.contentOffset.x; }}
                    >
                        <Animated.View style={animatedWidthStyle}>
                            <Animated.View
                                onLayout={(e) => { unscaledContentHeight.value = e.nativeEvent.layout.height; }}
                                className={`py-4 ${roundBottom ? 'rounded-2xl' : 'rounded-t-2xl'}`}
                                style={[animatedScaleStyle, {
                                    width: NEWSPAPER_WIDTH,
                                    // @ts-ignore: web-only CSS
                                    backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                                    backgroundRepeat: 'repeat',
                                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                                }]}
                            >
                                <Column className='gap-4 w-[910px]'>
                                    <View className='items-center justify-center px-8'>
                                        <PressLogo width="100%" />
                                    </View>
                                    <Row className='gap-4 w-full p-4'>
                                        {columns.map((columnMarkdown, columnIndex) => (
                                            <Column
                                                key={columnIndex}
                                                className='gap-4 flex-1 shrink'
                                            >
                                                {columnMarkdown.trim().length > 0 && (
                                                    <InputOptionsProvider gameId={gameId} showInputs={false}>
                                                        <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                                    </InputOptionsProvider>
                                                )}
                                            </Column>
                                        ))}
                                    </Row>
                                </Column>
                            </Animated.View>
                        </Animated.View>
                    </ShadowScrollView>
                </>
            )}
        </View>
    );
};

export default NewspaperZoomableView;
