import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import PlaceholderCard from '../ui/PlaceholderCard';
import PressLogo from '../ui/icons/Press';
import { Newspaper } from 'lucide-react-native';
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
            <ShadowScrollView extensionPercent={0} direction='horizontal' className='w-full' scrollViewClassName='w-full px-5' horizontal>
                <View className={`py-4 ${roundBottom ? 'rounded-2xl' : 'rounded-t-2xl'}`} style={{
                    // @ts-ignore: web-only CSS
                    backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                }}>
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
                </View>
            </ShadowScrollView>
        </View>
    );
};

export default NewspaperViewingView;
