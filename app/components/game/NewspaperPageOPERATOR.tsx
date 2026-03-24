import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserList } from 'hooks/useUserList';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import NewspaperColumnDialog from './NewspaperColumnDialog';
import NewspaperColumnEmptyState from './newspaperPageOperator/NewspaperColumnEmptyState';
import NewspaperColumnFooter from './newspaperPageOperator/NewspaperColumnFooter';
import NewspaperColumnHeader from './newspaperPageOperator/NewspaperColumnHeader';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';
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

            <Column gap={4}>
                <NewspaperPageHeader onAddColumn={addColumn} />

                <ScrollView horizontal className='pb-2'>
                    <Row gap={0} className='w-min rounded-xl border-2 border-border bg-background-inverse'>
                        {newspaperColumns.map((columnMarkdown, columnIndex) => (
                            <Column
                                key={columnIndex}
                                gap={0}
                                className={`w-80 ${columnIndex !== newspaperColumns.length - 1 ? 'border-r border-border' : ''}`}
                            >
                                <NewspaperColumnHeader
                                    columnIndex={columnIndex}
                                    onRemove={() => removeColumn(columnIndex)}
                                />

                                <Pressable className='min-h-120 p-4' onPress={() => openColumn(columnIndex)}>
                                    <Column className='min-h-108 justify-between' gap={4}>
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
                </ScrollView>
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
