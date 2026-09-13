import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import Column from '../layout/Column';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperPreviousDayVoteSummary, { useIsPreviousDayVoteSummaryReady } from './NewspaperPreviousDayVoteSummary';
import { useHasPreviousDayVotes } from '../../../hooks/useHasPreviousDayVotes';
import LoadingText from '../ui/loading/LoadingText';
import { useFindListItems } from '../../../hooks/useData';
import { Usepaper } from '../../../types/usepaper';
import { getNewspaperDayItemId } from '../../../utils/newspaperControl';

const NEWSPAPER_TEXTURE_URL = 'https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey';
const loadedImageUrls = new Set<string>();
const imageLoadPromises = new Map<string, Promise<boolean>>();
const minimumUsepaper: Usepaper = { columns: ['', ''] };

const preloadImage = (url: string) => {
    if (loadedImageUrls.has(url)) {
        return Promise.resolve(true);
    }

    const existingPromise = imageLoadPromises.get(url);
    if (existingPromise) {
        return existingPromise;
    }

    const promise = Image.prefetch(url)
        .then((result) => {
            const loaded = Platform.OS === 'web' || result;
            if (loaded) {
                loadedImageUrls.add(url);
            }
            imageLoadPromises.delete(url);
            return loaded;
        })
        .catch(() => {
            imageLoadPromises.delete(url);
            return false;
        });

    imageLoadPromises.set(url, promise);
    return promise;
};

const getMarkdownImageUrls = (columns: string[]) => {
    const urls = new Set<string>();
    const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;

    columns.forEach((column) => {
        for (const match of column.matchAll(imagePattern)) {
            if (match[1].trim()) {
                urls.add(match[1].trim());
            }
        }
    });

    return [...urls];
};

interface NewspaperDayViewProps {
    gameId: string;
    dayIndex: number;
    ownerUserId: string;
    onReady?: () => void;
}

const NewspaperDayView = ({ gameId, dayIndex, ownerUserId, onReady }: NewspaperDayViewProps) => {
    const [loadedAssetKey, setLoadedAssetKey] = useState<string | null>(null);
    const [layoutReadyKey, setLayoutReadyKey] = useState<string | null>(null);
    const TILE_SIZE = 600;
    const usepaperRecords = useFindListItems<Usepaper>('newspaper', {
        itemId: getNewspaperDayItemId(gameId, dayIndex),
        userIds: ownerUserId ? [ownerUserId] : [''],
        returnTop: 1,
    });
    const resolvedUsepaper = usepaperRecords?.[0]?.value?.columns?.length
        ? usepaperRecords[0].value
        : minimumUsepaper;
    const hasVoteSummary = useHasPreviousDayVotes(gameId, dayIndex);
    const isVoteSummaryReady = useIsPreviousDayVoteSummaryReady(gameId, dayIndex);
    const showVoteSummary = hasVoteSummary === true;
    const assetUrls = useMemo(
        () => [NEWSPAPER_TEXTURE_URL, ...getMarkdownImageUrls(resolvedUsepaper.columns)],
        [resolvedUsepaper.columns],
    );
    const assetKey = `${dayIndex}:${assetUrls.join('|')}`;
    const isDataReady = usepaperRecords !== undefined
        && hasVoteSummary !== undefined
        && isVoteSummaryReady;
    const hasNewspaperContent = !resolvedUsepaper.skipped
        && resolvedUsepaper.columns.some((column) => column.trim().length > 0);
    const areAssetsReady = isDataReady && loadedAssetKey === assetKey;
    const isFullyReady = areAssetsReady && (!hasNewspaperContent || layoutReadyKey === assetKey);

    useEffect(() => {
        if (!isDataReady) {
            return;
        }

        let isMounted = true;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;

        const loadAssets = () => {
            void Promise.all(assetUrls.map(preloadImage)).then((results) => {
                if (!isMounted) {
                    return;
                }

                if (results.every(Boolean)) {
                    setLoadedAssetKey(assetKey);
                } else {
                    retryTimeout = setTimeout(loadAssets, 1000);
                }
            });
        };

        loadAssets();

        return () => {
            isMounted = false;
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, [assetKey, assetUrls, isDataReady]);

    useEffect(() => {
        if (isFullyReady) {
            onReady?.();
        }
    }, [isFullyReady, onReady]);

    if (!areAssetsReady) {
        return (
            <Column className='min-h-190 items-center justify-center'>
                <LoadingText text='Loading newspaper' />
            </Column>
        );
    }

    return (
        <Column className='gap-4 w-full relative'>
            {!isFullyReady && (
                <Column className='absolute inset-0 min-h-190 items-center justify-center z-10'>
                    <LoadingText text='Loading newspaper' />
                </Column>
            )}
            <View pointerEvents={isFullyReady ? 'auto' : 'none'} style={{ opacity: isFullyReady ? 1 : 0 }}>
                <Column className='gap-0 min-h-190'>
                    <NewspaperViewingView
                        gameId={gameId}
                        usepaper={resolvedUsepaper}
                        TILE_SIZE={TILE_SIZE}
                        roundBottom={!showVoteSummary}
                        onReady={() => setLayoutReadyKey(assetKey)}
                    />
                    {showVoteSummary && (
                        <View className='px-5 sm:mx-0 -mx-2'>
                            <View className='rounded-b-2xl' style={{
                                // @ts-ignore: web-only CSS
                                backgroundImage: `url('${NEWSPAPER_TEXTURE_URL}')`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                            }}>
                                <NewspaperPreviousDayVoteSummary dayIndex={dayIndex} gameId={gameId} />
                            </View>
                        </View>
                    )}
                </Column>
            </View>
        </Column>
    );
};

export default NewspaperDayView;
