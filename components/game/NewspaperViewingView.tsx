import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import FontText from '../ui/text/FontText';
import PlaceholderCard from '../ui/PlaceholderCard';
import { Newspaper } from 'lucide-react-native';
import { Usepaper } from 'types/usepaper';
import NewspaperZoomableView from './newspaperPageOperator/NewspaperZoomableView';
import { hasNewspaperContent } from 'utils/newspaperSections';

interface NewspaperViewingViewProps {
    gameId: string;
    usepaper: Usepaper;
    TILE_SIZE: number;
    roundBottom?: boolean;
    onReady?: () => void;
}

const NewspaperViewingView = ({ gameId, usepaper, TILE_SIZE, roundBottom, onReady }: NewspaperViewingViewProps) => {
    const isSkipped = Boolean(usepaper.skipped);
    const hasContent = hasNewspaperContent(usepaper);

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
                        The newspaper hasn’t been made for this day. Check back later.
                    </FontText>
                </Column>
            </PlaceholderCard>
        );
    }

    return (
        <View className='sm:mx-0 -mx-2'>
            <NewspaperZoomableView
                usepaper={usepaper}
                gameId={gameId}
                TILE_SIZE={TILE_SIZE}
                roundBottom={roundBottom}
                onReady={onReady}
            />
        </View>
    );
};

export default NewspaperViewingView;
