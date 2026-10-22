import React from 'react';
import { TextInput } from 'react-native';
import Row from '../../layout/Row';
import Column from '../../layout/Column';
import { EditorPane } from './EditorPane';
import { PreviewPaneSideBySide } from './PreviewPaneSideBySide';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface SideBySideLayoutProps {
  draftBody: string;
  draftTitle: string;
  includeTitle: boolean;
  previewInputState: Record<string, string | undefined>;
  setPreviewInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
  onBodyChange: (body: string) => void;
  onSelectionChange: (selection: SelectionRange) => void;
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
  /** When true, the editor is non-editable (view-only) and only the preview pane is shown. */
  readOnly?: boolean;
  /** Optional ref forwarded to the body text input. */
  inputRef?: React.Ref<TextInput>;
}

export function SideBySideLayout({
  draftBody,
  draftTitle,
  includeTitle,
  previewInputState,
  setPreviewInputState,
  onBodyChange,
  onSelectionChange,
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
}: SideBySideLayoutProps) {
  return (
    <Row className="min-h-0 flex-1 gap-4">
      <EditorPane
        value={draftBody}
        onBodyChange={onBodyChange}
        onSelectionChange={onSelectionChange}
        onBold={onBold}
        onItalic={onItalic}
        onLink={onLink}
        onImage={onImage}
        onMore={onMore}
        onScript={onScript}
        scriptLabel={scriptLabel}
        onVariable={onVariable}
        readOnly={readOnly}
        inputRef={inputRef}
      />

      <Column className={`min-w-0 flex-1 gap-4`}>
        {renderPreview ? (
          renderPreview()
        ) : (
          <PreviewPaneSideBySide
            markdown={draftBody}
            title={draftTitle}
            includeTitle={includeTitle}
            inputState={previewInputState}
            setInputState={setPreviewInputState}
            centered={centered}
            showPreviewAsPlayer={showPreviewAsPlayer}
            onPreviewAsPlayer={onPreviewAsPlayer}
          />
        )}
      </Column>
    </Row>
  );
}
export default SideBySideLayout;
