import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import PressLogo from '../ui/icons/Press';
import { useUserListGet } from 'hooks/useUserListGet';
import ShadowScrollView from '../ui/ShadowScrollView';
import { Usepaper } from 'types/usepaper';
import { getNewspaperDayItemId } from '../../../utils/newspaperControl';

interface NewspaperViewingViewProps {
    dayIndex: number;
    gameId: string;
    ownerUserId: string;
    TILE_SIZE: number;
}

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperViewingView = ({ dayIndex, gameId, ownerUserId, TILE_SIZE }: NewspaperViewingViewProps) => {
    const usepaperRecords = useUserListGet<Usepaper>({
        key: 'usepaper',
        itemId: getNewspaperDayItemId(gameId, dayIndex),
        userIds: ownerUserId ? [ownerUserId] : [''],
        returnTop: 1,
    });

    const isLoading = usepaperRecords === undefined;

    if (isLoading) {
        return (
            <Column className='gap-4 items-center justify-center py-24'>
                <LoadingText text='Loading newspaper' />
            </Column>
        );
    }

    const resolvedUsepaper = usepaperRecords?.[0]?.value?.columns?.length
        ? usepaperRecords[0].value
        : minimumUsepaper;

    const newspaperColumns = resolvedUsepaper.columns;

    const hasContent = newspaperColumns.some(column => column.trim().length > 0);

    return (
        <View className=''>
            <ShadowScrollView extensionPercent={0} direction='horizontal' className='w-full' scrollViewClassName='w-full px-5' horizontal>
                <View className='py-4 rounded-t-2xl' style={{
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
                                    {columnMarkdown.trim().length > 0 ? (
                                        <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                    ) : (
                                        <FontText variant='subtext' className='text-muted text-center'>
                                            Empty column
                                        </FontText>
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
