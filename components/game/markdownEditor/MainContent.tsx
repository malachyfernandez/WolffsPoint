import React from 'react';
import { TextInput, useWindowDimensions } from 'react-native';
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
  onMore: () => void;
  onScript?: () => void;
  scriptLabel?: string;
  onVariable?: () => void;
  centered?: boolean;
  showPreviewAsPlayer?: boolean;
  onPreviewAsPlayer?: () => void;
  /** Custom preview renderer. If provided, replaces the default markdown preview. */
  renderPreview?: () => React.ReactNode;
  /** When true, the editor is non-editable (view-only). */
  readOnly?: boolean;
  /** Optional ref forwarded to the body text input. */
  inputRef?: React.Ref<TextInput>;
}

export function MainContent({
  includeTitle,
  titleInputLabel,
  titleInputPlaceholder,
  draftTitle,
  draftBody,
  isPreviewSideBySide,
  activeTab,
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
  onMore,
  onScript,
  scriptLabel,
  onVariable,
  centered = false,
  showPreviewAsPlayer = false,
  onPreviewAsPlayer,
  renderPreview,
  readOnly = false,
  inputRef,
}: MainContentProps) {
  const { width } = useWindowDimensions();
  // Side-by-side halves the toolbar pane. Each optional insert button is
  // ~52px wide in the pane, so each needs ~2x that in window width (plus a
  // small buffer) before the layout can keep the groups on one line.
  const extraToolbarButtons = (onScript ? 1 : 0) + (onVariable ? 1 : 0);
  const isSideBySide = width > 800 + extraToolbarButtons * 120;
  return (
    <Column className={`min-h-0 flex-1 gap-4 pt-3 ${width >= 640 ? 'mx-0' : '-mx-3'}`}>
      {includeTitle && !readOnly ? (
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
          previewInputState={previewInputState}
          setPreviewInputState={setPreviewInputState}
          onBodyChange={setDraftBody}
          onSelectionChange={setSelection}
          onBold={onBold}
          onItalic={onItalic}
          onLink={onLink}
          onImage={onImage}
          onMore={onMore}
          onScript={onScript}
          scriptLabel={scriptLabel}
          onVariable={onVariable}
          centered={centered}
          showPreviewAsPlayer={showPreviewAsPlayer}
          onPreviewAsPlayer={onPreviewAsPlayer}
          renderPreview={renderPreview}
          readOnly={readOnly}
          inputRef={inputRef}
        />
      ) : (
        <TabbedLayout
          draftBody={draftBody}
          draftTitle={draftTitle}
          includeTitle={includeTitle}
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
          onMore={onMore}
          onScript={onScript}
          scriptLabel={scriptLabel}
          onVariable={onVariable}
          centered={centered}
          showPreviewAsPlayer={showPreviewAsPlayer}
          onPreviewAsPlayer={onPreviewAsPlayer}
          renderPreview={renderPreview}
          readOnly={readOnly}
          inputRef={inputRef}
        />
      )}
    </Column>
  );
}
export default MainContent;
