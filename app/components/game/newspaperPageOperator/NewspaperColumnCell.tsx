import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import MarkdownEditorDialog from '../MarkdownEditorDialog';
import NewspaperColumnEmptyState from './NewspaperColumnEmptyState';
import NewspaperColumnFooter from './NewspaperColumnFooter';
import NewspaperColumnHeader from './NewspaperColumnHeader';
import type { ResolvedNewspaperSection } from '../../../../utils/newspaperSections';

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
}: NewspaperColumnCellProps) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const isLastColumn = columnIndex === section.columns.length - 1;

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
            />
        </Column>
    );
};

export default NewspaperColumnCell;
