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
}

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperViewingView = ({ dayIndex, gameId, ownerUserId }: NewspaperViewingViewProps) => {
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
        <ShadowScrollView direction='horizontal' className='w-full' scrollViewClassName='w-full' horizontal>
                <Column className='gap-4 w-[950px]'>
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
        </ShadowScrollView>
    );
};

export default NewspaperViewingView;
