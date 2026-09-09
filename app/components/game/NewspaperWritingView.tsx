import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import FontText from '../ui/text/FontText';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useList, useValue } from 'hooks/useData';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { useToast } from 'contexts/ToastContext';
import ShadowScrollView from '../ui/ShadowScrollView';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import NewspaperColumnEmptyState from './newspaperPageOperator/NewspaperColumnEmptyState';
import NewspaperColumnFooter from './newspaperPageOperator/NewspaperColumnFooter';
import NewspaperColumnHeader from './newspaperPageOperator/NewspaperColumnHeader';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';
import ImportDraftDialog from './newspaperPageOperator/ImportDraftDialog';
import DisableableButton from '../ui/buttons/DisableableButton';
import PressLogo from '../ui/icons/Press';
import { Usepaper } from 'types/usepaper';

interface NewspaperWritingViewProps {
  gameId: string; // This will now be in format "originalGameId-day-year-month-day"
  /** The actual game ID (not the composite newspaper day ID). Used for loading
   *  script data (players, roles, etc.) via InputOptionsProvider. */
  realGameId?: string;
  /** When provided, shows an "Import draft from [sourceLabel]" button. */
  importSourceLabel?: string;
  /** The other person's draft to preview in the import dialog, or null if blank. */
  importDraft?: Usepaper | null;
  /** Whether the other person's draft is still loading. */
  isImportDraftLoading?: boolean;
  /** Called when the user confirms importing the draft. */
  onImportDraft?: (draft: Usepaper) => void;
}

const defaultUsepaper: Usepaper = {
  columns: [],
};

const minimumUsepaper: Usepaper = {
  columns: ['', ''],
};

const NewspaperWritingView = ({
  gameId,
  realGameId,
  importSourceLabel,
  importDraft,
  isImportDraftLoading,
  onImportDraft,
}: NewspaperWritingViewProps) => {
  const { executeCommand } = useUndoRedo();
  const { showToast } = useToast();
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [newspaper, setNewspaper] = useList<Usepaper>('newspaper', gameId, {
    privacy: 'PUBLIC',
    defaultValue: minimumUsepaper,
  });

  const resolvedUsepaper = newspaper?.value?.columns?.length ? newspaper.value : minimumUsepaper;

  const newspaperColumns = resolvedUsepaper.columns;
  const isSkipped = Boolean(resolvedUsepaper.skipped);

  const toggleSkip = () => {
    const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
    const nextUsepaper = createUndoSnapshot(previousUsepaper);
    nextUsepaper.skipped = !isSkipped;

    executeCommand({
      action: () => setNewspaper(createUndoSnapshot(nextUsepaper)),
      undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
      description: isSkipped ? 'Unskip newspaper' : 'Skip newspaper',
    });
  };

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
      <Column className="w-full gap-4 px-4">
        <Row className="items-center justify-between gap-x-2 gap-y-6 flex-wrap">
          <Pressable onPress={toggleSkip} className="flex-row items-center gap-2 px-4">
            <View
              className={`h-5 w-5 items-center justify-center rounded border ${isSkipped ? 'bg-text border-text' : 'border-border bg-background'}`}>
              {isSkipped && (
                <FontText weight="bold" color="white" className="text-xs">
                  ✓
                </FontText>
              )}
            </View>
            <FontText weight="medium" className={isSkipped ? '' : 'opacity-70'}>
              Skip newspaper for this day
            </FontText>
          </Pressable>
          {importSourceLabel && onImportDraft && (
            <DisableableButton
              isEnabled={Boolean(importDraft?.columns?.some((c) => c.trim().length > 0))}
              enabledText={`Import draft from ${importSourceLabel}`}
              disabledText={`${importSourceLabel} draft is blank`}
              onPress={() => setIsImportDialogOpen(true)}
              className="min-w-[240px] px-4"
              enabledVariant="outline-alt"
            />
          )}
        </Row>
        <View className='border-b border-border/20' />
        <NewspaperPageHeader onAddColumn={addColumn} />
      </Column>

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
                          <InputOptionsProvider gameId={realGameId ?? gameId} showInputs={false}>
                            <MarkdownRenderer markdown={columnMarkdown} textAlign="justify" />
                          </InputOptionsProvider>
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
          gameId={realGameId ?? gameId}
          showScript
          isPreviewSideBySide={true}
        />
      )}

      {importSourceLabel && onImportDraft && (
        <ImportDraftDialog
          isOpen={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          draft={importDraft ?? null}
          isLoading={Boolean(isImportDraftLoading)}
          sourceLabel={importSourceLabel}
          realGameId={realGameId ?? gameId}
          onConfirmImport={() => {
            if (importDraft) {
              const previousUsepaper = createUndoSnapshot(resolvedUsepaper);
              const importedDraft = createUndoSnapshot(importDraft);
              executeCommand({
                action: () => setNewspaper(createUndoSnapshot(importedDraft)),
                undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
                description: `Import ${importSourceLabel} Draft`,
              });
              onImportDraft(importDraft);
            }
          }}
        />
      )}
    </>
  );
};

export default NewspaperWritingView;
