import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserListGet } from 'hooks/useUserListGet';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Usepaper } from 'types/usepaper';
import prettyLog from 'utils/prettyLog';

interface NewspaperViewingViewProps {
    itemId: string;
}

const defaultUsepaper: Usepaper = {
    columns: [],
};

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperViewingView = ({ itemId }: NewspaperViewingViewProps) => {
    // Extract base gameId from day-specific ID (e.g., "JfsX3u79-day-1" -> "JfsX3u79")
    const baseGameId = itemId.split('-day-')[0];

    // Get the operator userId for this game (using base gameId)
    const gameRows = useUserListGet<string[]>({
        key: "games",
        itemId: baseGameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;

    // Get the operator's newspaper data (using full day-specific itemId)
    const usepaperRecords = useUserListGet<Usepaper>({
        key: 'usepaper',
        itemId: itemId,
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const resolvedUsepaper = usepaperRecords?.[0]?.value?.columns?.length
        ? usepaperRecords[0].value
        : minimumUsepaper;

    const newspaperColumns = resolvedUsepaper.columns;

    const hasContent = newspaperColumns.some(column => column.trim().length > 0);


    return (
        <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='w-full'>
            <ScrollView horizontal={true} className='w-full'>
                <Column gap={4} className='w-[950px]'>
                    <Row gap={4} className='w-full p-4'>
                        {newspaperColumns.map((columnMarkdown, columnIndex) => (
                            <Column
                                key={columnIndex}
                                gap={4}
                                className='flex-1 shrink'
                            >
                                {columnMarkdown.trim().length > 0 ? (
                                    <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                ) : (
                                    <PoppinsText varient='subtext' className='text-muted text-center'>
                                        Empty column
                                    </PoppinsText>
                                )}
                            </Column>
                        ))}
                    </Row>
                </Column>
            </ScrollView>
        </ScrollShadow>
    );
};

export default NewspaperViewingView;
