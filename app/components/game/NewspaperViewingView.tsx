import React from 'react';
import { ScrollView, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Usepaper } from 'types/usepaper';

interface NewspaperViewingViewProps {
    gameId: string;
}

const defaultUsepaper: Usepaper = {
    columns: [],
};

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperViewingView = ({ gameId }: NewspaperViewingViewProps) => {
    const [usepaper] = useUserList<Usepaper>({
        key: 'usepaper',
        itemId: gameId,
        privacy: 'PUBLIC',
        defaultValue: defaultUsepaper,
    });

    const resolvedUsepaper = usepaper?.value?.columns?.length
        ? usepaper.value
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
