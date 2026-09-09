import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import PlaceholderCard from '../ui/PlaceholderCard';
import { Newspaper } from 'lucide-react-native';
import { useFindListItems } from 'hooks/useData';
import { Usepaper } from 'types/usepaper';
import { getNewspaperDayItemId } from '../../../utils/newspaperControl';
import NewspaperZoomableView from './newspaperPageOperator/NewspaperZoomableView';

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

    if (isLoading) {
        return (
            <Column className='gap-4 items-center justify-center py-24'>
                <LoadingText text='Loading newspaper' />
            </Column>
        );
    }

    if (isSkipped) {
        return (
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
        );
    }

    if (!hasContent) {
        return (
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
        );
    }

    return (
        <View className='sm:mx-0 -mx-2'>
            <NewspaperZoomableView
                columns={newspaperColumns}
                gameId={gameId}
                TILE_SIZE={TILE_SIZE}
                roundBottom={roundBottom}
            />
        </View>
    );
};

export default NewspaperViewingView;
