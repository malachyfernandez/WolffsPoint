import React, { useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserList } from 'hooks/useUserList';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import NewspaperColumnEmptyState from './newspaperPageOperator/NewspaperColumnEmptyState';
import NewspaperColumnFooter from './newspaperPageOperator/NewspaperColumnFooter';
import NewspaperColumnHeader from './newspaperPageOperator/NewspaperColumnHeader';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';
import PressLogo from '../ui/icons/Press';
import { Usepaper } from 'types/usepaper';

interface NewspaperWritingViewProps {
    gameId: string; // This will now be in format "originalGameId-day-year-month-day"
}

const defaultUsepaper: Usepaper = {
    columns: [],
};

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperWritingView = ({ gameId }: NewspaperWritingViewProps) => {
    const { executeCommand } = useUndoRedo();
    const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [usepaper, setUsepaper] = useUserList<Usepaper>({
        key: 'usepaper',
        itemId: gameId,
        privacy: 'PUBLIC',
        defaultValue: defaultUsepaper,
    });

    const resolvedUsepaper = usepaper?.value?.columns?.length
        ? usepaper.value
        : minimumUsepaper;

    const newspaperColumns = resolvedUsepaper.columns;

    const setColumnMarkdown = (columnIndex: number, markdown: string) => {
        const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
        const nextUsepaper = createUndoSnapshot(previousUsepaper);

        nextUsepaper.columns[columnIndex] = markdown;

        executeCommand({
            action: () => setUsepaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setUsepaper(createUndoSnapshot(previousUsepaper)),
            description: 'Update Newspaper Column',
        });
    };

    const addColumn = () => {
        const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
        const nextUsepaper = createUndoSnapshot(previousUsepaper);

        nextUsepaper.columns.push('');

        executeCommand({
            action: () => setUsepaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setUsepaper(createUndoSnapshot(previousUsepaper)),
            description: 'Add Newspaper Column',
        });
    };

    const removeColumn = (columnIndex: number) => {
        if (newspaperColumns.length <= 1) {
            return;
        }

        const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
        const nextUsepaper = createUndoSnapshot(previousUsepaper);

        nextUsepaper.columns.splice(columnIndex, 1);

        executeCommand({
            action: () => setUsepaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setUsepaper(createUndoSnapshot(previousUsepaper)),
            description: 'Remove Newspaper Column',
        });
    };

    const openColumn = (columnIndex: number) => {
        setSelectedColumnIndex(columnIndex);
        setIsDialogOpen(true);
    };

    return (
        <>
            <ScrollShadow LinearGradientComponent={LinearGradient} className='w-full'>
                <ScrollView horizontal={true} className='w-full'>
                    <Column gap={4} className='w-[950px]'>
                        <View className='items-center justify-center px-8'>
                            <PressLogo width="100%" />
                        </View>
                        <NewspaperPageHeader onAddColumn={addColumn} />
                        <View className='w-full'>
                            <Row gap={0} className='w-full rounded-xl border-2 border-border items-stretch overflow-hidden'>
                                {newspaperColumns.map((columnMarkdown, columnIndex) => (
                                    <Column
                                        key={columnIndex}
                                        gap={0}
                                        className={`flex-1 shrink bg-background ${columnIndex !== newspaperColumns.length - 1 ? 'border-r border-border' : ''}`}
                                    >
                                        <NewspaperColumnHeader
                                            columnIndex={columnIndex}
                                            onRemove={() => removeColumn(columnIndex)}
                                        />

                                        <Pressable className='flex-1 min-h-120 p-4 bg-inner-background' onPress={() => openColumn(columnIndex)}>
                                            <Column className='h-full justify-between' gap={4}>
                                                <Column gap={3}>
                                                    {columnMarkdown.trim().length > 0 ? (
                                                        <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                                    ) : (
                                                        <NewspaperColumnEmptyState />
                                                    )}
                                                </Column>

                                                <NewspaperColumnFooter />
                                            </Column>
                                        </Pressable>
                                    </Column>
                                ))}
                            </Row>
                        </View>
                    </Column>
                </ScrollView>
            </ScrollShadow>

            {selectedColumnIndex !== null && (
                <MarkdownEditorDialog
                    isOpen={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setSelectedColumnIndex(null);
                        }
                    }}
                    title={`Column ${selectedColumnIndex + 1}`}
                    submitLabel='Save Column'
                    initialMarkdown={newspaperColumns[selectedColumnIndex] ?? ''}
                    onSubmit={({ markdown }) => setColumnMarkdown(selectedColumnIndex, markdown)}
                    isPreviewSideBySide={true}
                />
            )}
        </>
    );
};

export default NewspaperWritingView;
