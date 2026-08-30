import React from 'react';
import { useWindowDimensions } from 'react-native';
import Column from '../../layout/Column';
import { TitleInputSection } from './TitleInputSection';
import { TabSelector } from './TabSelector';
import { SideBySideLayout } from './SideBySideLayout';
import { TabbedLayout } from './TabbedLayout';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface MainContentProps {
  includeTitle: boolean;
  titleInputLabel: string;
  titleInputPlaceholder: string;
  draftTitle: string;
  draftBody: string;
  isPreviewSideBySide: boolean;
  activeTab: string;
  showInputs: boolean;
  previewInputState: Record<string, string | undefined>;
  setPreviewInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
  setDraftTitle: (title: string) => void;
  setDraftBody: (body: string) => void;
  setSelection: (selection: SelectionRange) => void;
  onTabChange: (tab: string) => void;
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onImage: () => void;
  onInput: () => void;
  onMore: () => void;
  onScript?: () => void;
  onVariable?: () => void;
  centered?: boolean;
  showPreviewAsPlayer?: boolean;
  onPreviewAsPlayer?: () => void;
  /** Custom preview renderer. If provided, replaces the default markdown preview. */
  renderPreview?: () => React.ReactNode;
}

export function MainContent({
  includeTitle,
  titleInputLabel,
  titleInputPlaceholder,
  draftTitle,
  draftBody,
  isPreviewSideBySide,
  activeTab,
  showInputs,
  previewInputState,
  setPreviewInputState,
  setDraftTitle,
  setDraftBody,
  setSelection,
  onTabChange,
  onBold,
  onItalic,
  onLink,
  onImage,
  onInput,
  onMore,
  onScript,
  onVariable,
  centered = false,
  showPreviewAsPlayer = false,
  onPreviewAsPlayer,
  renderPreview,
}: MainContentProps) {
  const { width } = useWindowDimensions();
  const isSideBySide = width > 800;
  return (
    <Column className="-mx-3 min-h-0 flex-1 gap-4 pt-3 sm:mx-0">
      {includeTitle ? (
        <TitleInputSection
          label={titleInputLabel}
          placeholder={titleInputPlaceholder}
          value={draftTitle}
          onChangeText={setDraftTitle}
        />
      ) : null}

      {!isSideBySide ? <TabSelector value={activeTab} onValueChange={onTabChange} /> : null}

      {isSideBySide ? (
        <SideBySideLayout
          draftBody={draftBody}
          draftTitle={draftTitle}
          includeTitle={includeTitle}
          showInputs={showInputs}
          previewInputState={previewInputState}
          setPreviewInputState={setPreviewInputState}
          onBodyChange={setDraftBody}
          onSelectionChange={setSelection}
          onBold={onBold}
          onItalic={onItalic}
          onLink={onLink}
          onImage={onImage}
          onInput={onInput}
          onMore={onMore}
          onScript={onScript}
          onVariable={onVariable}
          centered={centered}
          showPreviewAsPlayer={showPreviewAsPlayer}
          onPreviewAsPlayer={onPreviewAsPlayer}
          renderPreview={renderPreview}
        />
      ) : (
        <TabbedLayout
          draftBody={draftBody}
          draftTitle={draftTitle}
          includeTitle={includeTitle}
          showInputs={showInputs}
          activeTab={activeTab}
          previewInputState={previewInputState}
          setPreviewInputState={setPreviewInputState}
          onBodyChange={setDraftBody}
          onSelectionChange={setSelection}
          onTabChange={onTabChange}
          onBold={onBold}
          onItalic={onItalic}
          onLink={onLink}
          onImage={onImage}
          onInput={onInput}
          onMore={onMore}
          onScript={onScript}
          onVariable={onVariable}
          centered={centered}
          showPreviewAsPlayer={showPreviewAsPlayer}
          onPreviewAsPlayer={onPreviewAsPlayer}
          renderPreview={renderPreview}
        />
      )}
    </Column>
  );
}
export default MainContent;
