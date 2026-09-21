import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedRef, useAnimatedStyle, useSharedValue, withTiming, Easing, scrollTo } from 'react-native-reanimated';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import PressLogo from '../../ui/icons/Press';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react-native';
import ShadowScrollView from '../../ui/ShadowScrollView';
import { Usepaper } from 'types/usepaper';
import { getNewspaperSections } from 'utils/newspaperSections';
import NewspaperSectionDivider from './NewspaperSectionDivider';
import { TornPaperBackground, TornPaperEdgeDefs } from '../../ui/TornPaperEdge';
import { isMobileWeb } from 'utils/browser';

interface NewspaperZoomableViewProps {
    usepaper: Usepaper;
    gameId: string;
    TILE_SIZE: number;
    roundBottom?: boolean;
    onReady?: () => void;
}

const NEWSPAPER_WIDTH = 910;
const CONTENT_PADDING = 32;
const COLUMN_GAP = 16;
const SCROLL_PADDING = 40;
const ZOOM_FACTOR = 1.25;
const MAX_ZOOM = 3;
// Room around the sheet so the displaced torn edge isn't clipped by the
// horizontal scroll view's overflow.
const TORN_BLEED = 10;
const NEWSPAPER_TEXTURE_URL =
    'https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey';

const NewspaperZoomableView = ({ usepaper, gameId, TILE_SIZE, onReady }: NewspaperZoomableViewProps) => {
    const sections = getNewspaperSections(usepaper);
    const mobileWeb = isMobileWeb();
    const [zoom, setZoom] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);

    const animatedZoom = useSharedValue(1);
    const animatedScrollX = useSharedValue(0);
    const centerUnscaled = useSharedValue(0);
    const unscaledContentHeight = useSharedValue(0);
    const scrollViewRef = useAnimatedRef<any>();

    const maxSectionColumnCount = Math.max(...sections.map((section) => section.columns.length), 1);
    const singleColumnWidth = useMemo(() => {
        return (NEWSPAPER_WIDTH - CONTENT_PADDING - (maxSectionColumnCount - 1) * COLUMN_GAP) / maxSectionColumnCount;
    }, [maxSectionColumnCount]);

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

    const animateTo = useCallback((value: number) => {
        animatedZoom.value = withTiming(value, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
        });
    }, [animatedZoom]);

    useEffect(() => {
        centerUnscaled.value = 0;
        setZoom(defaultZoom);
        animatedZoom.value = defaultZoom;
    }, [animatedZoom, centerUnscaled, defaultZoom]);

    // Fallback: some browsers (Safari iOS) may not fire onLayout for elements
    // inside an opacity:0 container, which would deadlock the fade-in. Call
    // onReady after a short delay as a safety net.
    useEffect(() => {
        if (!containerWidth) return;
        const timeout = setTimeout(() => onReady?.(), 300);
        return () => clearTimeout(timeout);
    }, [containerWidth, onReady]);

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
        transform: [{ scale: animatedZoom.value }, { rotate: '-0.3deg' }],
        transformOrigin: 'left top',
    }));
    const animatedWidthStyle = useAnimatedStyle(() => ({
        width: NEWSPAPER_WIDTH * animatedZoom.value,
        height: unscaledContentHeight.value * animatedZoom.value,
    }));

    const zoomButtonClass = 'h-9 w-9 items-center justify-center rounded-[4px] border border-border/50 bg-text/5 active:bg-text/15';

    return (
        <View
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <TornPaperEdgeDefs />
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
                        bottomFade={mobileWeb ? 0 : 22}
                        leftFade={mobileWeb ? 0 : undefined}
                        rightFade={mobileWeb ? 0 : undefined}
                        direction='horizontal'
                        className='w-full'
                        scrollViewClassName='w-full px-[10px]'
                        contentContainerStyle={{ marginRight: 20 }}
                        horizontal
                        scrollEventThrottle={16}
                        onScroll={(e: any) => { animatedScrollX.value = e.nativeEvent.contentOffset.x; }}
                    >
                        <Animated.View style={animatedWidthStyle}>
                            <View
                                onLayout={(e) => {
                                    unscaledContentHeight.value = e.nativeEvent.layout.height;
                                    onReady?.();
                                }}
                                style={[
                                    { padding: TORN_BLEED, paddingBottom: TORN_BLEED + 14 },
                                    Platform.OS === 'web' && !mobileWeb
                                        // @ts-ignore: web-only CSS
                                        ? { filter: 'drop-shadow(0px 10px 14px rgba(0, 0, 0, 0.35))' }
                                        : {},
                                ]}
                            >
                            <Animated.View
                                className='relative'
                                style={[animatedScaleStyle, {
                                    width: NEWSPAPER_WIDTH,
                                }]}
                            >
                                <TornPaperBackground textureUrl={NEWSPAPER_TEXTURE_URL} tileSize={TILE_SIZE} />
                                <Column className='gap-4 w-227.5 py-4'>
                                    <View className='items-center justify-center px-8'>
                                        <PressLogo width="100%" />
                                    </View>
                                    {sections.map((section, sectionIndex) => (
                                        <Column key={section.id} className='w-full gap-2'>
                                            {sectionIndex > 0 && <NewspaperSectionDivider />}
                                            <Row className='gap-4 w-full px-4 py-3'>
                                                {section.columns.map((columnMarkdown, columnIndex) => (
                                                    <Column
                                                        key={columnIndex}
                                                        className='gap-4 flex-1 shrink'
                                                    >
                                                        {columnMarkdown.trim().length > 0 && (
                                                            <InputOptionsProvider gameId={gameId} showInputs={false}>
                                                                <MarkdownRenderer
                                                                    markdown={columnMarkdown}
                                                                    textAlign='justify'
                                                                    newspaperTitleFont={section.titleFont}
                                                                    newspaperDividerStyle={section.dividerStyle}
                                                                />
                                                            </InputOptionsProvider>
                                                        )}
                                                    </Column>
                                                ))}
                                            </Row>
                                        </Column>
                                    ))}
                                </Column>
                            </Animated.View>
                            </View>
                        </Animated.View>
                    </ShadowScrollView>
                </>
            )}
        </View>
    );
};

export default NewspaperZoomableView;
