import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, Settings2 } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import { useList, useValue } from 'hooks/useData';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { useToast } from 'contexts/ToastContext';
import ShadowScrollView from '../ui/ShadowScrollView';
import NewspaperColumnCell from './newspaperPageOperator/NewspaperColumnCell';
import type { PendingColumnOpen } from 'hooks/usePendingColumnOpen';
import ImportDraftDialog from './newspaperPageOperator/ImportDraftDialog';
import NewspaperSectionOptionsDialog from './newspaperPageOperator/NewspaperSectionOptionsDialog';
import NewspaperSectionDivider from './newspaperPageOperator/NewspaperSectionDivider';
import DisableableButton from '../ui/buttons/DisableableButton';
import AppButton from '../ui/buttons/AppButton';
import PressLogo from '../ui/icons/Press';
import { NewspaperDividerStyle, NewspaperSectionDefaults, NewspaperTitleFont, Usepaper } from 'types/usepaper';
import {
  createNewspaperSection,
  getNewspaperSections,
  hasNewspaperContent,
  resolveDividerStyle,
  resolveTitleFont,
  withNewspaperSections,
} from '../../../utils/newspaperSections';

interface NewspaperWritingViewProps {
  gameId: string; // This will now be in format "originalGameId-day-year-month-day"
  /** Which day this view renders. Used to match pending restore requests. */
  dayIndex: number;
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
  /** A pending "open this column" request from a minimized card, kept at the
   *  page level so it survives this view unmounting on day switches. */
  pendingColumnOpen?: PendingColumnOpen | null;
  /** Requests opening a column — lives at page level so minimized cards can
   *  still restore after this view unmounts. */
  onRequestColumnOpen?: (dayIndex: number, sectionIndex: number, columnIndex: number) => void;
  /** Clears the pending request once the target cell has opened. */
  onConsumePendingColumnOpen?: () => void;
}

const minimumUsepaper: Usepaper = {
  columns: ['', ''],
};

const NewspaperWritingView = ({
  gameId,
  dayIndex,
  realGameId,
  importSourceLabel,
  importDraft,
  isImportDraftLoading,
  onImportDraft,
  pendingColumnOpen,
  onRequestColumnOpen,
  onConsumePendingColumnOpen,
}: NewspaperWritingViewProps) => {
  const { executeCommand } = useUndoRedo();
  const { showToast } = useToast();
  const [optionsSectionIndex, setOptionsSectionIndex] = useState<number | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const [newspaper, setNewspaper] = useList<Usepaper>('newspaper', gameId, {
    privacy: 'PUBLIC',
    defaultValue: minimumUsepaper,
  });

  const [sectionDefaults] = useValue<NewspaperSectionDefaults>('newspaperSectionDefaults');

  const storedUsepaper = newspaper?.value;
  const resolvedUsepaper = storedUsepaper?.sections?.length || storedUsepaper?.columns?.length
    ? storedUsepaper
    : minimumUsepaper;
  const sections = getNewspaperSections(resolvedUsepaper);
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

  const updateSections = (
    nextSections: typeof sections,
    description: string,
    previousUsepaper = createUndoSnapshot(resolvedUsepaper),
  ) => {
    const nextUsepaper = withNewspaperSections(previousUsepaper, createUndoSnapshot(nextSections));
    executeCommand({
      action: () => setNewspaper(createUndoSnapshot(nextUsepaper)),
      undoAction: () => setNewspaper(createUndoSnapshot(previousUsepaper)),
      description,
    });
  };

  const setColumnMarkdown = (sectionIndex: number, columnIndex: number, markdown: string) => {
    const nextSections = createUndoSnapshot(sections);
    nextSections[sectionIndex].columns[columnIndex] = markdown;
    updateSections(nextSections, 'Update Newspaper Column');
  };

  const addColumn = (sectionIndex: number) => {
    if (sections[sectionIndex].columns.length >= 8) {
      showToast('Too many columns — maximum 8 per section');
      return;
    }
    const nextSections = createUndoSnapshot(sections);
    nextSections[sectionIndex].columns.push('');
    updateSections(nextSections, 'Add Newspaper Column');
  };

  const removeColumn = (sectionIndex: number, columnIndex: number) => {
    if (sections[sectionIndex].columns.length <= 1) {
      return;
    }
    const nextSections = createUndoSnapshot(sections);
    nextSections[sectionIndex].columns.splice(columnIndex, 1);
    updateSections(nextSections, 'Remove Newspaper Column');
  };

  const addSection = () => {
    const defaultTitleFont = resolveTitleFont({ titleFont: sectionDefaults?.value?.titleFont });
    const defaultDividerStyle = resolveDividerStyle({ dividerStyle: sectionDefaults?.value?.dividerStyle });
    updateSections(
      [...createUndoSnapshot(sections), createNewspaperSection(['', ''], defaultTitleFont, defaultDividerStyle)],
      'Add Newspaper Section',
    );
  };

  const removeSection = (sectionIndex: number) => {
    if (sections.length <= 1) {
      return;
    }
    const nextSections = createUndoSnapshot(sections);
    nextSections.splice(sectionIndex, 1);
    updateSections(nextSections, 'Remove Newspaper Section');
  };

  const setSectionTitleFont = (sectionIndex: number, titleFont: NewspaperTitleFont) => {
    const nextSections = createUndoSnapshot(sections);
    nextSections[sectionIndex].titleFont = titleFont;
    updateSections(nextSections, 'Change Newspaper Title Font');
  };

  const setSectionDividerStyle = (sectionIndex: number, dividerStyle: NewspaperDividerStyle) => {
    const nextSections = createUndoSnapshot(sections);
    nextSections[sectionIndex].dividerStyle = dividerStyle;
    updateSections(nextSections, 'Change Newspaper Divider Style');
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
              isEnabled={hasNewspaperContent(importDraft)}
              enabledText={`Import draft from ${importSourceLabel}`}
              disabledText={`${importSourceLabel} draft is blank`}
              onPress={() => setIsImportDialogOpen(true)}
              className="min-w-[240px] px-4"
              enabledVariant="outline"
            />
          )}
        </Row>
        <View className="border-border/20 border-b" />
      </Column>

      <ShadowScrollView
        direction="horizontal"
        extensionPercent={0}
        className="w-full"
        scrollViewClassName="w-full px-4"
        horizontal>
        <Column className="w-227.5 gap-6">
          <View className="items-center justify-center px-8">
            <PressLogo width="100%" />
          </View>
          {sections.map((section, sectionIndex) => (
            <Column key={section.id} className="w-full gap-3">
              {sectionIndex > 0 && <NewspaperSectionDivider />}
              <Row className="items-center justify-between gap-3 px-2">
                <FontText weight="bold" className="text-lg">
                  Section {sectionIndex + 1}
                </FontText>
                <Row className="items-center gap-2">
                  <AppButton
                    variant="outline"
                    className="h-9 px-3"
                    onPress={() => setOptionsSectionIndex(sectionIndex)}>
                    <Row className="items-center gap-1.5">
                      <Settings2 size={16} color="rgb(46, 41, 37)" />
                      <FontText weight="medium" className="text-sm">Options</FontText>
                    </Row>
                  </AppButton>
                  <AppButton
                    variant="filled"
                    className="h-9 px-3"
                    onPress={() => addColumn(sectionIndex)}>
                    <Row className="items-center gap-1.5">
                      <Plus size={16} color="white" />
                      <FontText weight="medium" color="white" className="text-sm">Add Column</FontText>
                    </Row>
                  </AppButton>
                </Row>
              </Row>
              <Row className="border-border w-full items-stretch gap-0 overflow-hidden rounded-xl border-2">
                {section.columns.map((columnMarkdown, columnIndex) => (
                  <NewspaperColumnCell
                    key={columnIndex}
                    gameId={gameId}
                    editorGameId={realGameId ?? gameId}
                    section={section}
                    sectionIndex={sectionIndex}
                    columnIndex={columnIndex}
                    columnMarkdown={columnMarkdown}
                    onSubmitMarkdown={(markdown) => setColumnMarkdown(sectionIndex, columnIndex, markdown)}
                    onRemove={() => removeColumn(sectionIndex, columnIndex)}
                    isPendingOpen={
                      // Wait for this day's newspaper to finish syncing so the
                      // dialog opens with real content instead of flashing the
                      // default/empty value first.
                      newspaper?.state?.isSyncing === false &&
                      pendingColumnOpen?.dayIndex === dayIndex &&
                      pendingColumnOpen?.sectionIndex === sectionIndex &&
                      pendingColumnOpen?.columnIndex === columnIndex
                    }
                    onConsumePendingOpen={() => onConsumePendingColumnOpen?.()}
                    onRequestOpen={() => onRequestColumnOpen?.(dayIndex, sectionIndex, columnIndex)}
                  />
                ))}
              </Row>
            </Column>
          ))}
          <View className="items-center pb-2">
            <AppButton variant="accent" className="h-11 min-w-48 px-5" onPress={addSection}>
              <Row className="items-center gap-2">
                <Plus size={18} color="white" />
                <FontText weight="bold" color="white">Add Section</FontText>
              </Row>
            </AppButton>
          </View>
        </Column>
      </ShadowScrollView>

      {optionsSectionIndex !== null && sections[optionsSectionIndex] && (
        <NewspaperSectionOptionsDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) setOptionsSectionIndex(null);
          }}
          sectionNumber={optionsSectionIndex + 1}
          titleFont={sections[optionsSectionIndex].titleFont}
          dividerStyle={sections[optionsSectionIndex].dividerStyle}
          onTitleFontChange={(font) => setSectionTitleFont(optionsSectionIndex, font)}
          onDividerStyleChange={(style) => setSectionDividerStyle(optionsSectionIndex, style)}
          onDelete={() => removeSection(optionsSectionIndex)}
          canDelete={sections.length > 1}
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
