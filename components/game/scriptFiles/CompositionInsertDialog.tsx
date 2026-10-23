import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, FileText, Minus } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import { FileBrowserContent } from './FileBrowserDialog';
import type { useScriptFiles } from '../../../hooks/useScriptFiles';
import type { ScriptFile } from '../../../utils/scriptFiles';
import type { Statement } from '../../../script/lang/ast';
import { emptySpan } from '../../../script/lang/ast';

const span = emptySpan();

type FilesApi = ReturnType<typeof useScriptFiles>;
type Mode = 'files' | 'blocks';

export interface CompositionInsertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filesApi: FilesApi;
  defaultFolder?: string;
  nameBase?: string;
  onInsertFile: (file: ScriptFile) => void;
  onInsertFolder: (path: string) => void;
  onInsertStatement: (statement: Statement) => void;
  /** New files created inside the browser can be edited before insertion. */
  onOpenFile?: (file: ScriptFile) => void;
}

const navButtonStatement = (): Statement => ({
  kind: 'NavButtonStatement',
  label: { kind: 'StringLiteral', value: 'Section', span },
  body: { kind: 'BlockStatement', statements: [], span },
  span,
});

const markdownStatement = (): Statement => ({
  kind: 'ExpressionStatement',
  expression: {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name: 'CreateMarkdown', span },
    arguments: [
      {
        kind: 'NamedArgument',
        name: 'CONTENT',
        value: { kind: 'MarkdownLiteral', value: 'Markdown text', span },
        span,
      },
    ],
    span,
  },
  span,
});

const dividerStatement = (): Statement => ({
  kind: 'ExpressionStatement',
  expression: {
    kind: 'CallExpression',
    callee: { kind: 'IdentifierExpression', name: 'CreateDivider', span },
    arguments: [],
    span,
  },
  span,
});

const ModeButton = ({
  label,
  active,
  first,
  onPress,
}: {
  label: string;
  active: boolean;
  first?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    className={`h-7 w-20 items-center justify-center ${
      active ? 'bg-text/20' : 'hover:bg-text/5'
    } ${first ? '' : 'border-subtle-border border-l'}`}>
    <FontText className="text-xs">{label}</FontText>
  </Pressable>
);

const BlockButton = ({
  icon,
  label,
  subtext,
  tint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  subtext: string;
  /** Category sliver on the card's left edge, matching the script insert
   *  picker's `borderLeftColor` tint. */
  tint: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={{ borderLeftWidth: 3, borderLeftColor: tint }}
    className="border-subtle-border hover:bg-text/5 flex-row items-center rounded-lg border px-3 py-2">
    <Row className="min-w-0 flex-1 items-center gap-3">
      {icon}
      <Column className="min-w-0 flex-1 gap-0.5">
        <FontText weight="medium" className="text-sm">
          {label}
        </FontText>
        <FontText variant="subtext" className="text-xs" numberOfLines={1}>
          {subtext}
        </FontText>
      </Column>
    </Row>
  </Pressable>
);

/** File-or-block chooser for modular display cells. */
const CompositionInsertDialog = ({
  isOpen,
  onOpenChange,
  filesApi,
  defaultFolder,
  nameBase,
  onInsertFile,
  onInsertFolder,
  onInsertStatement,
  onOpenFile,
}: CompositionInsertDialogProps) => {
  const [mode, setMode] = useState<Mode>('files');

  useEffect(() => {
    if (isOpen) setMode('files');
  }, [isOpen]);

  const blocksMode = mode === 'blocks';
  const close = () => onOpenChange(false);

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[75vh] max-w-xl" isSwipeable={false}>
          <CloseButton onPress={close} />
          <DialogHeader
            text="Add content"
            subtext="Choose a file or folder, or switch to Blocks for display items"
          />
          <Column className="min-h-0 flex-1 gap-3">
            {/* Mode toggle sits at the top; the picker fills the rest so the
             *  Choose row stays pinned to the bottom. */}
            <Row className="justify-center">
              <View className="border-subtle-border flex-row overflow-hidden rounded-lg border">
                <ModeButton
                  label="Files"
                  first
                  active={mode === 'files'}
                  onPress={() => setMode('files')}
                />
                <ModeButton label="Blocks" active={blocksMode} onPress={() => setMode('blocks')} />
              </View>
            </Row>
            {mode === 'blocks' ? (
              <Column className="min-h-0 flex-1 gap-2 py-1">
                <BlockButton
                  icon={<ChevronRight size={18} color="#6a4a8a" />}
                  label="Nav Button"
                  subtext="A tappable row that opens another page of content"
                  tint="#6a4a8a"
                  onPress={() => onInsertStatement(navButtonStatement())}
                />
                <BlockButton
                  icon={<FileText size={18} color="#4a6a8a" />}
                  label="Markdown"
                  subtext="Write inline markdown content"
                  tint="#4a6a8a"
                  onPress={() => onInsertStatement(markdownStatement())}
                />
                <BlockButton
                  icon={<Minus size={18} color="#1a1a1a" />}
                  label="Divider"
                  subtext="Add a horizontal divider"
                  tint="#1a1a1a"
                  onPress={() => onInsertStatement(dividerStatement())}
                />
                <View className="flex-1" />
                <Row className="justify-end pt-2">
                  <AppButton variant="outline" className="h-9 w-24" onPress={close}>
                    <FontText weight="medium">Cancel</FontText>
                  </AppButton>
                </Row>
              </Column>
            ) : (
              <View style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}>
                <FileBrowserContent
                  filesApi={filesApi}
                  defaultFolder={defaultFolder}
                  nameBase={nameBase}
                  mode="pick"
                  onPick={onInsertFile}
                  onPickFolder={onInsertFolder}
                  onOpenFile={onOpenFile}
                  onCancel={close}
                />
              </View>
            )}
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default CompositionInsertDialog;
