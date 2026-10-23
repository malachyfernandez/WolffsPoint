import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, Code2, FileText, Folder, FolderPlus } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
import ShadowScrollView from '../../ui/ShadowScrollView';
import {
  fileName,
  folderOfPath,
  isProtectedFolder,
  isValidFileName,
  joinFilePath,
  type ScriptFilesIndex,
} from '../../../utils/scriptFiles';
import { folderLabel } from './FileBrowserDialog';

interface MoveToDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  index: ScriptFilesIndex;
  /** What's being moved (header label). */
  itemLabel: string;
  /** Folder the item lives in now: Move Here is a no-op there. */
  itemFolder?: string;
  /** Moving a folder: its path + descendants can't be destinations. */
  excludePath?: string;
  /** Create a folder inside the folder currently being viewed (macOS-style). */
  onCreateFolder?: (path: string) => void;
  /** Confirm: move the item into the folder currently being viewed. */
  onMoveHere: (folder: string) => void;
}

/**
 * "Move to" sheet - a stripped file browser: folders navigate, files show
 * dimmed for context, file manipulation is gone, but New Folder stays
 * (like Finder's move sheet). The footer acts on the folder being viewed.
 */
const MoveToDialog = ({
  isOpen,
  onOpenChange,
  index,
  itemLabel,
  itemFolder = '',
  excludePath,
  onCreateFolder,
  onMoveHere,
}: MoveToDialogProps) => {
  const [viewFolder, setViewFolder] = useState('');
  const [folderPrompt, setFolderPrompt] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Open where the item lives: same spot Finder starts the sheet at.
      setViewFolder(itemFolder);
      setFolderPrompt(false);
      setFolderError(null);
    }
  }, [isOpen, itemFolder]);

  const excluded = (folder: string) => {
    if (!excludePath) return false;
    const ex = excludePath.toLowerCase();
    const f = folder.toLowerCase();
    return f === ex || f.startsWith(`${ex}/`);
  };

  const childFolders = useMemo(
    () =>
      index.folders
        .filter(
          (f) =>
            !excluded(f) &&
            folderOfPath(f).toLowerCase() === viewFolder.toLowerCase() &&
            f.toLowerCase() !== viewFolder.toLowerCase()
        )
        .sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index.folders, viewFolder, excludePath]
  );

  const childFiles = useMemo(
    () =>
      [...index.byId.values()]
        .filter((f) => folderOfPath(f.path).toLowerCase() === viewFolder.toLowerCase())
        .sort((a, b) => fileName(a.path).localeCompare(fileName(b.path))),
    [index.byId, viewFolder]
  );

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; path: string }[] = [{ label: 'Files', path: '' }];
    let acc = '';
    for (const segment of viewFolder.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${segment}` : segment;
      crumbs.push({ label: folderLabel(acc), path: acc });
    }
    return crumbs;
  }, [viewFolder]);

  const samePlace = viewFolder.toLowerCase() === itemFolder.toLowerCase();
  const moveDisabled = samePlace || excluded(viewFolder);

  const submitFolderPrompt = () => {
    const name = folderDraft.trim();
    let error: string | null = null;
    if (!name) error = 'Name is required';
    else if (!isValidFileName(name)) error = 'Names can\'t contain / \\ : * ? " < > |';
    else {
      const path = joinFilePath(viewFolder, name);
      if (
        index.byPath.has(path.toLowerCase()) ||
        index.folders.some((f) => f.toLowerCase() === path.toLowerCase())
      ) {
        error = 'Something with that name already exists here';
      }
    }
    if (error) {
      setFolderError(error);
      return;
    }
    setFolderPrompt(false);
    onCreateFolder?.(joinFilePath(viewFolder, name));
  };

  return (
    <>
      <ConvexDialog.Root className="hidden" isOpen={isOpen} onOpenChange={onOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[60vh] max-w-md" isSwipeable={false}>
            <CloseButton onPress={() => onOpenChange(false)} />
            <DialogHeader text={`Move "${itemLabel}"`} subtext="Choose a destination folder" />
            <Column className="min-h-0 flex-1 gap-3 px-4">
              {onCreateFolder && (
                <Row>
                  <AppButton
                    variant="outline"
                    className="h-8 px-3"
                    dropShadow={false}
                    onPress={() => {
                      setFolderDraft('New folder');
                      setFolderError(null);
                      setFolderPrompt(true);
                    }}>
                    <Row className="items-center gap-1.5">
                      <FolderPlus size={14} color="#1a1a1a" />
                      <FontText className="text-sm">New Folder</FontText>
                    </Row>
                  </AppButton>
                </Row>
              )}

              <Row className="flex-wrap items-center gap-1">
                {viewFolder && (
                  <Pressable
                    accessibilityLabel="Up a folder"
                    onPress={() => setViewFolder(folderOfPath(viewFolder))}
                    className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-lg">
                    <ChevronLeft size={16} color="#1a1a1a" />
                  </Pressable>
                )}
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={crumb.path || 'root'}>
                    {i > 0 && <FontText variant="subtext">/</FontText>}
                    <Pressable
                      onPress={() => setViewFolder(crumb.path)}
                      className="hover:bg-text/10 rounded-md px-1.5 py-0.5">
                      <FontText
                        weight={i === breadcrumbs.length - 1 ? 'medium' : 'regular'}
                        className="text-sm">
                        {crumb.label}
                      </FontText>
                    </Pressable>
                  </React.Fragment>
                ))}
              </Row>

              <ShadowScrollView className="min-h-0 flex-1" scrollViewClassName="min-h-0 flex-1">
                <Column className="gap-1.5 pb-2">
                  {childFolders.map((folder) => (
                    <Pressable
                      key={folder}
                      onPress={() => setViewFolder(folder)}
                      className="border-subtle-border bg-inner-background hover:bg-text/5 flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5">
                      <Folder
                        size={18}
                        color="#8a7355"
                        fill={isProtectedFolder(folder) ? '#d8c49a' : 'none'}
                      />
                      <FontText weight="medium" numberOfLines={1} className="flex-1">
                        {folderLabel(folder)}
                      </FontText>
                    </Pressable>
                  ))}
                  {/* Files can't be picked in a move sheet; shown dimmed for
                      context, same as Finder. */}
                  {childFiles.map((file) => (
                    <View
                      key={file.id}
                      className="border-subtle-border bg-inner-background flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5 opacity-40">
                      {file.kind === 'markdown' ? (
                        <FileText size={18} color="#4a6a8a" />
                      ) : (
                        <Code2 size={18} color="#6a4a8a" />
                      )}
                      <FontText weight="medium" numberOfLines={1} className="flex-1">
                        {fileName(file.path)}
                      </FontText>
                    </View>
                  ))}
                  {childFolders.length === 0 && childFiles.length === 0 && (
                    <Column className="items-center gap-1 py-10">
                      <Folder size={24} color="#0006" />
                      <FontText variant="subtext" className="text-sm">
                        Empty folder
                      </FontText>
                    </Column>
                  )}
                </Column>
              </ShadowScrollView>

              <Row className="justify-end gap-4 pb-4">
                <AppButton variant="outline" className="w-24" onPress={() => onOpenChange(false)}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="w-28"
                  disabled={moveDisabled}
                  onPress={() => {
                    onMoveHere(viewFolder);
                    onOpenChange(false);
                  }}>
                  <FontText weight="medium" color="white">
                    Move Here
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* new folder inside the move sheet */}
      <ConvexDialog.Root
        className="hidden"
        isOpen={folderPrompt}
        onOpenChange={(open: boolean) => {
          if (!open) setFolderPrompt(false);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1" isSwipeable={false}>
            <CloseButton onPress={() => setFolderPrompt(false)} />
            <DialogHeader text="New folder" />
            <Column className="gap-4 px-5 pb-5">
              <Column className="gap-1">
                <FontText weight="medium">Name</FontText>
                <FontTextInput
                  autoFocus
                  selectTextOnFocus
                  className="border-subtle-border w-full rounded-xl border px-4 py-3"
                  placeholder="Folder name"
                  value={folderDraft}
                  onChangeText={(t) => {
                    setFolderDraft(t);
                    setFolderError(null);
                  }}
                  onSubmitEditing={submitFolderPrompt}
                />
                {folderError && (
                  <FontText className="text-xs" style={{ color: '#a03030' }}>
                    {folderError}
                  </FontText>
                )}
              </Column>
              <Row className="justify-end gap-4">
                <AppButton
                  variant="outline"
                  className="w-24"
                  onPress={() => setFolderPrompt(false)}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton variant="filled" className="w-28" onPress={submitFolderPrompt}>
                  <FontText weight="medium" color="white">
                    Create
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export default MoveToDialog;
