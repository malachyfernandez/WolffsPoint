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

  const [newspaper, setNewspaper] = useList<Usepaper>('newspaper', gameId, {
    privacy: 'PUBLIC',
    defaultValue: minimumUsepaper,
  });

  const resolvedUsepaper = newspaper?.value?.columns?.length ? newspaper.value : minimumUsepaper;

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
      <ShadowScrollView
        direction="horizontal"
        extensionPercent={0}
        className="w-full"
        scrollViewClassName="w-full px-4"
        horizontal>
        <Column className="w-[910px] gap-4">
          <View className="items-center justify-center px-8">
            <PressLogo width="100%" />
          </View>
          <NewspaperPageHeader onAddColumn={addColumn} />
          <View className="w-full">
            <Row className="border-border w-full items-stretch gap-0 overflow-hidden rounded-xl border-2">
              {newspaperColumns.map((columnMarkdown, columnIndex) => (
                <Column
                  key={columnIndex}
                  className={`bg-background flex-1 shrink gap-0 ${columnIndex !== newspaperColumns.length - 1 ? 'border-border border-r' : ''}`}>
                  <NewspaperColumnHeader
                    columnIndex={columnIndex}
                    onRemove={() => removeColumn(columnIndex)}
                    showRemove={newspaperColumns.length > 1}
                  />

                  <Pressable
                    className="min-h-120 bg-inner-background flex-1 p-4"
                    onPress={() => openColumn(columnIndex)}>
                    <Column className="h-full justify-between gap-4">
                      <Column className="gap-3">
                        {columnMarkdown.trim().length > 0 ? (
                          <MarkdownRenderer markdown={columnMarkdown} textAlign="justify" />
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
          submitLabel="Save Column"
          initialMarkdown={newspaperColumns[selectedColumnIndex] ?? ''}
          onSubmit={({ markdown }) => setColumnMarkdown(selectedColumnIndex, markdown)}
          showScript
          isPreviewSideBySide={true}
        />
      )}
    </>
  );
};

export default NewspaperWritingView;
