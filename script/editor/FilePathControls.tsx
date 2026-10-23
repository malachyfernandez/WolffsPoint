import React from 'react';
import { Pressable } from 'react-native';
import { Code2, FileText, FolderSearch, Tag, Zap } from 'lucide-react-native';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import { fileName, folderOfPath } from '../../utils/scriptFiles';
import type { ScriptFileContext } from './ScriptEditorDialog';

export default function FilePathControls({
  context,
  readOnly,
  onOptions,
  onBrowse,
  onOptionsHover,
  onBrowseHover,
}: {
  context: ScriptFileContext;
  readOnly: boolean;
  onOptions: () => void;
  onBrowse: () => void;
  onOptionsHover: (hovered: boolean) => void;
  onBrowseHover: (hovered: boolean) => void;
}) {
  const Icon = context.isTagFile
    ? Tag
    : context.fileRole === 'trigger'
      ? Zap
      : context.fileKind === 'markdown'
        ? FileText
        : Code2;
  return (
    <Row className="flex-wrap items-center gap-1">
      <Icon size={13} color="rgb(46, 41, 37)" />
      {!!folderOfPath(context.filePath ?? '') && (
        <FontText variant="subtext" className="text-xs">
          {folderOfPath(context.filePath ?? '')}/
        </FontText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="File options"
        onPress={readOnly ? undefined : onOptions}
        onHoverIn={() => !readOnly && onOptionsHover(true)}
        onHoverOut={() => onOptionsHover(false)}
        className="border-subtle-border bg-text/5 hover:bg-text/10 rounded-lg border px-2.5 py-1.5">
        <FontText weight="medium" className="text-xs">
          {fileName(context.filePath ?? '')}
        </FontText>
      </Pressable>
      {!readOnly && context.onSwitchFile && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit a different file"
          onPress={onBrowse}
          onHoverIn={() => onBrowseHover(true)}
          onHoverOut={() => onBrowseHover(false)}
          className="hover:bg-text/10 h-8 w-8 items-center justify-center rounded-md">
          <FolderSearch size={15} color="rgb(46, 41, 37)" />
        </Pressable>
      )}
    </Row>
  );
}
