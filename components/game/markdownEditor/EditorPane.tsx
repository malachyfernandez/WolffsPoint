import React from 'react';
import { TextInput } from 'react-native';
import ShadowScrollView from '../../ui/ShadowScrollView';
import Column from '../../layout/Column';
import TownSquareComposerToolbar from '../townSquare/TownSquareComposerToolbar';
import TownSquareComposerEditorPane from '../townSquare/TownSquareComposerEditorPane';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface EditorPaneProps {
  value: string;
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
  /** When true, the editor is non-editable (view-only) and the toolbar is hidden. */
  readOnly?: boolean;
  /** Optional ref forwarded to the body text input. */
  inputRef?: React.Ref<TextInput>;
}

export function EditorPane({
  value,
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
  readOnly = false,
  inputRef,
}: EditorPaneProps) {
  return (
    <Column className="min-w-0 flex-1 gap-1">
      {!readOnly && (
        <TownSquareComposerToolbar
          onBold={onBold}
          onImage={onImage}
          onItalic={onItalic}
          onLink={onLink}
          onMore={onMore}
          onScript={onScript}
          scriptLabel={scriptLabel}
          onVariable={onVariable}
        />
      )}
      <ShadowScrollView className="flex-1" scrollViewClassName="flex-1 rounded-[24px] py-4">
        <TownSquareComposerEditorPane
          onBodyChange={onBodyChange}
          onSelectionChange={onSelectionChange}
          value={value}
          readOnly={readOnly}
          inputRef={inputRef}
        />
      </ShadowScrollView>
    </Column>
  );
}
export default EditorPane;
