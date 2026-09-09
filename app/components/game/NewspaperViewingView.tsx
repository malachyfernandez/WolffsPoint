import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import PlaceholderCard from '../ui/PlaceholderCard';
import PressLogo from '../ui/icons/Press';
import { Newspaper, ZoomIn, ZoomOut, Maximize } from 'lucide-react-native';
import { useFindListItems } from 'hooks/useData';
import ShadowScrollView from '../ui/ShadowScrollView';
import { Usepaper } from 'types/usepaper';
import { getNewspaperDayItemId } from '../../../utils/newspaperControl';

interface NewspaperViewingViewProps {
    dayIndex: number;
    gameId: string;
    ownerUserId: string;
    TILE_SIZE: number;
    roundBottom?: boolean;
}

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NEWSPAPER_WIDTH = 910;
const CONTENT_PADDING = 32; // p-4 * 2 sides
const COLUMN_GAP = 16; // gap-4
const SCROLL_PADDING = 40; // px-5 * 2 sides
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;

const NewspaperViewingView = ({ dayIndex, gameId, ownerUserId, TILE_SIZE, roundBottom }: NewspaperViewingViewProps) => {
    const usepaperRecords = useFindListItems<Usepaper>("newspaper", {
        itemId: getNewspaperDayItemId(gameId, dayIndex),
        userIds: ownerUserId ? [ownerUserId] : [''],
        returnTop: 1,
    });

    const isLoading = usepaperRecords === undefined;

    const resolvedUsepaper = usepaperRecords?.[0]?.value?.columns?.length
        ? usepaperRecords[0].value
        : minimumUsepaper;

    const isSkipped = Boolean(resolvedUsepaper.skipped);
    const newspaperColumns = resolvedUsepaper.columns;
    const hasContent = newspaperColumns.some(column => column.trim().length > 0);

    const [zoom, setZoom] = useState(1);
    const [containerWidth, setContainerWidth] = useState(0);
    const [scrollX, setScrollX] = useState(0);
    const [pendingScrollX, setPendingScrollX] = useState<number | null>(null);

    const animatedZoom = useSharedValue(1);
    const scrollViewRef = useRef<any>(null);

    const singleColumnWidth = useMemo(() => {
        const n = Math.max(newspaperColumns.length, 1);
        return (NEWSPAPER_WIDTH - CONTENT_PADDING - (n - 1) * COLUMN_GAP) / n;
    }, [newspaperColumns.length]);

    const defaultZoom = useMemo(() => {
        if (!containerWidth) return 1;
        const availableWidth = containerWidth - SCROLL_PADDING;
        return Math.min(Math.max((availableWidth / singleColumnWidth) * 0.85, MIN_ZOOM), 1);
    }, [containerWidth, singleColumnWidth]);

    const viewportWidth = Math.max(containerWidth - SCROLL_PADDING, 0);

    const animateTo = (value: number) => {
        animatedZoom.value = withTiming(value, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
        });
    };

    useEffect(() => {
        setZoom(defaultZoom);
        animateTo(defaultZoom);
        setPendingScrollX(0);
    }, [defaultZoom]);

    // After width updates in the DOM, set scroll position to keep center point centered
    useLayoutEffect(() => {
        if (pendingScrollX !== null && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ x: pendingScrollX, y: 0, animated: false });
            setPendingScrollX(null);
        }
    }, [pendingScrollX]);

    const zoomTo = (nextZoom: number) => {
        // Calculate the unscaled content point at the center of the viewport
        const centerScaled = scrollX + viewportWidth / 2;
        const centerUnscaled = centerScaled / zoom;
        // New scroll position so that same content point stays centered
        const newScrollX = Math.max(0, centerUnscaled * nextZoom - viewportWidth / 2);
        setZoom(nextZoom);
        setPendingScrollX(newScrollX);
        animateTo(nextZoom);
    };

    const zoomIn = () => zoomTo(Math.min(zoom + ZOOM_STEP, MAX_ZOOM));
    const zoomOut = () => zoomTo(Math.max(zoom - ZOOM_STEP, MIN_ZOOM));
    const resetZoom = () => zoomTo(defaultZoom);

    const isAtMinZoom = zoom <= MIN_ZOOM + 0.001;
    const isAtMaxZoom = zoom >= MAX_ZOOM - 0.001;
    const isAtDefault = Math.abs(zoom - defaultZoom) < 0.001;

    const animatedScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: animatedZoom.value }],
        transformOrigin: 'left top',
    }));

    const zoomButtonClass = 'h-9 w-9 items-center justify-center rounded-full border border-border/30 active:bg-text/5';

    return (
        <View
            className='sm:mx-0 -mx-2'
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {isLoading ? (
                <Column className='gap-4 items-center justify-center py-24'>
                    <LoadingText text='Loading newspaper' />
                </Column>
            ) : isSkipped ? (
                <PlaceholderCard>
                    <Column className='gap-3 items-center'>
                        <Newspaper size={48} color='rgb(46, 41, 37)' />
                        <FontText weight='bold' className='text-xl text-center'>
                            No newspaper for this day
                        </FontText>
                        <FontText variant='subtext' className='text-center'>
                            The newspaper has been skipped for this day.
                        </FontText>
                    </Column>
                </PlaceholderCard>
            ) : !hasContent ? (
                <PlaceholderCard>
                    <Column className='gap-3 items-center'>
                        <Newspaper size={48} color='rgb(46, 41, 37)' />
                        <FontText weight='bold' className='text-xl text-center'>
                            No newspaper yet
                        </FontText>
                        <FontText variant='subtext' className='text-center'>
                            The newspaper hasn't been made for this day. Check back later.
                        </FontText>
                    </Column>
                </PlaceholderCard>
            ) : !containerWidth ? (
                <Column className='gap-4 items-center justify-center py-24'>
                    <LoadingText text='Loading newspaper' />
                </Column>
            ) : (
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
                        onScroll={(e: any) => setScrollX(e.nativeEvent.contentOffset.x)}
                    >
                        <View style={{ width: NEWSPAPER_WIDTH * zoom }}>
                            <Animated.View
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
                                        {newspaperColumns.map((columnMarkdown, columnIndex) => (
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
                        </View>
                    </ShadowScrollView>
                </>
            )}
        </View>
    );
};

export default NewspaperViewingView;
