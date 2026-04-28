import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useList, useValue } from 'hooks/useData';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { useToast } from 'contexts/ToastContext';
import ShadowScrollView from '../ui/ShadowScrollView';
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
    const { showToast } = useToast();
    const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [newspaper, setNewspaper] = useList<Usepaper>("newspaper", gameId, { privacy: "PUBLIC", defaultValue: minimumUsepaper });

    const resolvedUsepaper = newspaper?.value?.columns?.length
        ? newspaper.value
        : minimumUsepaper;

    const newspaperColumns = resolvedUsepaper.columns;

    const setColumnMarkdown = (columnIndex: number, markdown: string) => {
        const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
        const nextUsepaper = createUndoSnapshot(previousUsepaper);

        nextUsepaper.columns[columnIndex] = markdown;

        executeCommand({
            action: () => setNewspaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
            description: 'Update Newspaper Column',
        });
    };

    const addColumn = () => {
        if (newspaperColumns.length >= 8) {
            showToast('Too many columns — maximum 8');
            return;
        }

        const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
        const nextUsepaper = createUndoSnapshot(previousUsepaper);

        nextUsepaper.columns.push('');

        executeCommand({
            action: () => setNewspaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
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
            action: () => setNewspaper(createUndoSnapshot(nextUsepaper)),
            undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
            description: 'Remove Newspaper Column',
        });
    };

    const openColumn = (columnIndex: number) => {
        setSelectedColumnIndex(columnIndex);
        setIsDialogOpen(true);
    };

    return (
        <>
            <ShadowScrollView direction='horizontal' extensionPercent={0} className='w-full' scrollViewClassName='w-full px-4' horizontal>
                    <Column className='gap-4 w-[910px]'>
                        <View className='items-center justify-center px-8'>
                            <PressLogo width="100%" />
                        </View>
                        <NewspaperPageHeader onAddColumn={addColumn} />
                        <View className='w-full'>
                            <Row className='gap-0 w-full rounded-xl border-2 border-border items-stretch overflow-hidden'>
                                {newspaperColumns.map((columnMarkdown, columnIndex) => (
                                    <Column
                                        key={columnIndex}
                                        className={`gap-0 flex-1 shrink bg-background ${columnIndex !== newspaperColumns.length - 1 ? 'border-r border-border' : ''}`}
                                    >
                                        <NewspaperColumnHeader
                                            columnIndex={columnIndex}
                                            onRemove={() => removeColumn(columnIndex)}
                                            showRemove={newspaperColumns.length > 1}
                                        />

                                        <Pressable className='flex-1 min-h-120 p-4 bg-inner-background' onPress={() => openColumn(columnIndex)}>
                                            <Column className='gap-4 h-full justify-between'>
                                                <Column className='gap-3'>
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
            </ShadowScrollView>

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
