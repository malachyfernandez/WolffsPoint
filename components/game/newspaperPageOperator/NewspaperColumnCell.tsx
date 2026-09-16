import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import MarkdownEditorDialog from '../MarkdownEditorDialog';
import NewspaperColumnEmptyState from './NewspaperColumnEmptyState';
import NewspaperColumnFooter from './NewspaperColumnFooter';
import NewspaperColumnHeader from './NewspaperColumnHeader';
import type { ResolvedNewspaperSection } from 'utils/newspaperSections';

interface NewspaperColumnCellProps {
    /** Composite newspaper day ID (e.g. "gameId-day-year-month-day"). Used for historyKey. */
    gameId: string;
    /** The actual game ID used for script data (players, roles, etc.). */
    editorGameId: string;
    section: ResolvedNewspaperSection;
    sectionIndex: number;
    columnIndex: number;
    columnMarkdown: string;
    onSubmitMarkdown: (markdown: string) => void;
    onRemove: () => void;
    /** True when a pending restore request targets this cell. The cell opens
     *  its editor and consumes the request (clears it at the page level). */
    isPendingOpen: boolean;
    onConsumePendingOpen: () => void;
    /** Called when this column's minimized card is clicked. Must reach
     *  page-level state so it still works after this cell unmounts on a day
     *  switch. */
    onRequestOpen: () => void;
}

/**
 * A single newspaper column cell. Each cell owns its own MarkdownEditorDialog
 * instance, so minimize/restore always reopens THIS column's dialog — the same
 * per-instance pattern TagCellDisplay uses for table cells. A shared dialog
 * driven by a "selected column" state would restore whichever column was
 * selected last instead.
 */
const NewspaperColumnCell = ({
    gameId,
    editorGameId,
    section,
    sectionIndex,
    columnIndex,
    columnMarkdown,
    onSubmitMarkdown,
    onRemove,
    isPendingOpen,
    onConsumePendingOpen,
    onRequestOpen,
}: NewspaperColumnCellProps) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const isLastColumn = columnIndex === section.columns.length - 1;

    // A minimized editor from another day lands here once this day mounts.
    useEffect(() => {
        if (isPendingOpen) {
            setIsEditorOpen(true);
            onConsumePendingOpen();
        }
    }, [isPendingOpen, onConsumePendingOpen]);

    return (
        <Column
            className={`bg-background flex-1 shrink gap-0 ${!isLastColumn ? 'border-border border-r' : ''}`}>
            <NewspaperColumnHeader
                columnIndex={columnIndex}
                onRemove={onRemove}
                showRemove={section.columns.length > 1}
            />
            <Pressable
                className="min-h-120 bg-inner-background flex-1 p-4"
                onPress={() => setIsEditorOpen(true)}>
                <Column className="h-full justify-between gap-4">
                    <Column className="gap-3">
                        {columnMarkdown.trim().length > 0 ? (
                            <InputOptionsProvider gameId={editorGameId} showInputs={false}>
                                <MarkdownRenderer
                                    markdown={columnMarkdown}
                                    textAlign="justify"
                                    newspaperTitleFont={section.titleFont}
                                    newspaperDividerStyle={section.dividerStyle}
                                />
                            </InputOptionsProvider>
                        ) : (
                            <NewspaperColumnEmptyState />
                        )}
                    </Column>
                    <NewspaperColumnFooter />
                </Column>
            </Pressable>

            <MarkdownEditorDialog
                isOpen={isEditorOpen}
                onOpenChange={setIsEditorOpen}
                title={`Section ${sectionIndex + 1}, Column ${columnIndex + 1}`}
                initialMarkdown={columnMarkdown ?? ''}
                onSubmit={({ markdown }) => onSubmitMarkdown(markdown)}
                gameId={editorGameId}
                showScript
                isPreviewSideBySide={true}
                newspaperTitleFont={section.titleFont}
                newspaperDividerStyle={section.dividerStyle}
                historyKey={`newspaperColumn:${gameId}:${section.id}:${columnIndex}`}
                onRestore={onRequestOpen}
            />
        </Column>
    );
};

export default NewspaperColumnCell;
