import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserList } from 'hooks/useUserList';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import NewspaperColumnDialog from './NewspaperColumnDialog';
import { Usepaper } from 'types/usepaper';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const defaultUsepaper: Usepaper = {
    columns: [],
};

const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
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

    useEffect(() => {
        if (usepaper.state.isSyncing) {
            return;
        }

        if (!usepaper.value || usepaper.value.columns.length === 0) {
            setUsepaper(minimumUsepaper);
            return;
        }

        if (usepaper.value.columns.length === 1) {
            setUsepaper({
                columns: [...usepaper.value.columns, ''],
            });
        }
    }, [setUsepaper, usepaper]);

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
            <Column>
                <Column className='rounded-xl border-2 border-border bg-[#efe4c6] p-5' gap={4}>
                    <Row className='items-center justify-between flex-wrap' gap={3}>
                        <Column gap={1}>
                            <Row className='items-center' gap={2}>
                                <Newspaper size={22} color='#2b2112' />
                                <PoppinsText weight='bold' className='text-2xl'>The Wolfs Point Times</PoppinsText>
                            </Row>
                            <PoppinsText varient='subtext'>Write markdown columns and preview them like a newspaper.</PoppinsText>
                        </Column>

                        <AppButton variant='black' className='w-40 h-8' onPress={addColumn}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Column</PoppinsText>
                        </AppButton>
                    </Row>

                    <ScrollView horizontal className='pb-2'>
                        <Row gap={0} className='w-min rounded-xl border-2 border-border bg-[#f8f3e6]'>
                            {newspaperColumns.map((columnMarkdown, columnIndex) => (
                                <Column
                                    key={columnIndex}
                                    gap={0}
                                    className={`w-80 ${columnIndex !== newspaperColumns.length - 1 ? 'border-r border-border' : ''}`}
                                >
                                    <Row className='h-12 items-center justify-between border-b border-border bg-[#eadcb8] px-3' gap={2}>
                                        <PoppinsText weight='medium'>Column {columnIndex + 1}</PoppinsText>
                                        <AppButton
                                            variant='grey'
                                            className='w-6 max-h-6 mr-[0.1rem]'
                                            onPress={() => removeColumn(columnIndex)}
                                        >
                                            <PoppinsText weight='bold' color='white' className='text-xl'>-</PoppinsText>
                                        </AppButton>
                                    </Row>

                                    <Pressable className='min-h-120 p-4' onPress={() => openColumn(columnIndex)}>
                                        <Column className='min-h-108 justify-between' gap={4}>
                                            <Column gap={3}>
                                                {columnMarkdown.trim().length > 0 ? (
                                                    <MarkdownRenderer markdown={columnMarkdown} textAlign='justify' />
                                                ) : (
                                                    <Column className='border-2 border-dashed border-border/50 bg-[#fffaf0] p-4 rounded-lg min-h-40 items-center justify-center'>
                                                        <PoppinsText className='text-center opacity-60'>Open this column to start writing markdown.</PoppinsText>
                                                    </Column>
                                                )}
                                            </Column>

                                            <Row className='items-center justify-between border-t border-border pt-3' gap={2}>
                                                <PoppinsText varient='subtext'>Tap column to edit</PoppinsText>
                                                <PoppinsText
                                                    weight='medium'
                                                    style={{
                                                        textDecorationLine: 'underline',
                                                        textDecorationStyle: 'dotted',
                                                    }}
                                                >
                                                    Edit Story
                                                </PoppinsText>
                                            </Row>
                                        </Column>
                                    </Pressable>
                                </Column>
                            ))}
                        </Row>
                    </ScrollView>
                </Column>
            </Column>

            {selectedColumnIndex !== null && (
                <NewspaperColumnDialog
                    isOpen={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setSelectedColumnIndex(null);
                        }
                    }}
                    columnIndex={selectedColumnIndex}
                    currentMarkdown={newspaperColumns[selectedColumnIndex] ?? ''}
                    setColumnMarkdown={setColumnMarkdown}
                />
            )}
        </>
    );
};

export default NewspaperPageOPERATOR;
