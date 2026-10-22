import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp, Eye, EyeOff, FileText, Folder } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import UnsavedChangesDialog from '../../ui/dialog/UnsavedChangesDialog';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import AppDropdown from '../../ui/forms/AppDropdown';
import CustomCheckbox from '../../ui/CustomCheckbox';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
import ShadowScrollView from '../../ui/ShadowScrollView';
import type { Statement } from '../../../script/lang/ast';
import { printStatement } from '../../../script/lang/printer';
import type { useScriptFiles } from '../../../hooks/useScriptFiles';
import {
  fileName,
  folderOfPath,
  isTriggerFile,
  normalizeFilePath,
  type ScriptFile,
} from '../../../utils/scriptFiles';
import {
  getFolderCallParts,
  makeFolderStatement,
  resolveFolderRef,
  type FolderDisplayOptions,
} from '../../../utils/scriptFolders';

type FilesApi = { index: ReturnType<typeof useScriptFiles>['index'] };

export interface FolderSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: Statement | null;
  filesApi: FilesApi;
  onSave: (statement: Statement) => void;
}

const alignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'justify', label: 'Justify' },
];

/** Folder block settings: membership stays live; ORDER/HIDDEN store file IDs. */
const FolderSettingsDialog = ({
  isOpen,
  onOpenChange,
  statement,
  filesApi,
  onSave,
}: FolderSettingsDialogProps) => {
  const parts = statement ? getFolderCallParts(statement) : null;
  const resolvedPath = parts ? resolveFolderRef(filesApi.index, parts) : undefined;
  const folderId = resolvedPath
    ? filesApi.index.folderIdentities.byPath.get(resolvedPath.toLowerCase())
    : undefined;
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [recursive, setRecursive] = useState(true);
  const [dividers, setDividers] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'justify' | undefined>();
  const [imageHeight, setImageHeight] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot = (options: {
    order: string[];
    hidden: string[];
    recursive: boolean;
    dividers: boolean;
    align?: 'left' | 'center' | 'justify';
    imageHeight: string;
  }) => JSON.stringify(options);

  useEffect(() => {
    if (!isOpen || !parts) return;
    const initial = {
      order: parts.order ?? [],
      hidden: parts.hidden ?? [],
      recursive: parts.recursive !== false,
      dividers: parts.dividers === true,
      align: parts.align,
      imageHeight: parts.imageHeight?.toString() ?? '',
    };
    setOrder(initial.order);
    setHidden(initial.hidden);
    setRecursive(initial.recursive);
    setDividers(initial.dividers);
    setAlign(initial.align);
    setImageHeight(initial.imageHeight);
    setInitialSnapshot(snapshot(initial));
    setLeaveConfirmOpen(false);
    setError(null);
  }, [isOpen, statement]);

  const members = useMemo(() => {
    if (!resolvedPath) return [];
    const lower = normalizeFilePath(resolvedPath).toLowerCase();
    const files = [...filesApi.index.byId.values()].filter((file) => {
      const parent = folderOfPath(file.path).toLowerCase();
      return parent === lower || (recursive && parent.startsWith(`${lower}/`));
    });
    const rank = new Map(order.map((id, index) => [id, index]));
    return files.sort(
      (a, b) =>
        (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size) ||
        a.path.toLowerCase().localeCompare(b.path.toLowerCase()) ||
        a.id.localeCompare(b.id)
    );
  }, [filesApi.index, resolvedPath, recursive, order]);

  const current = { order, hidden, recursive, dividers, align, imageHeight };
  const hasUnsavedChanges = snapshot(current) !== initialSnapshot;

  const move = (file: ScriptFile, delta: -1 | 1) => {
    const ids = members.map((item) => item.id);
    const from = ids.indexOf(file.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    const present = new Set(ids);
    setOrder([...ids, ...order.filter((id) => !present.has(id))]);
  };

  const toggleHidden = (file: ScriptFile) =>
    setHidden((prev) =>
      prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id]
    );

  const saveOptions = (): FolderDisplayOptions => ({
    order,
    hidden,
    recursive,
    dividers,
    align,
    imageHeight: imageHeight.trim() === '' ? undefined : Number(imageHeight.trim()),
  });

  const handleSubmit = () => {
    const value = imageHeight.trim();
    if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 100)) {
      setError('Image height must be a number from 1 to 100');
      return;
    }
    if (!resolvedPath) {
      setError('This folder no longer exists');
      return;
    }
    onSave(makeFolderStatement({ id: folderId ?? parts?.id, path: resolvedPath }, saveOptions()));
    onOpenChange(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) setLeaveConfirmOpen(true);
    else onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return onOpenChange(true);
    handleAttemptClose();
  };

  const handleConfirmLeave = () => {
    setLeaveConfirmOpen(false);
    onOpenChange(false);
  };

  const folderLabel = resolvedPath ? fileName(resolvedPath) : 'Missing folder';

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[75vh] max-w-xl" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader
              text="Folder settings"
              subtext={`${folderLabel} stays live: new files appear automatically`}
            />
            <Column className="min-h-0 flex-1 gap-4">
              {!resolvedPath ? (
                <Column className="items-center gap-2 py-10">
                  <Folder size={26} color="#0006" />
                  <FontText variant="subtext">This folder is missing.</FontText>
                </Column>
              ) : (
                <>
                  <Row className="flex-wrap items-center gap-x-5 gap-y-2">
                    <Row className="items-center gap-2">
                      <CustomCheckbox monochrome checked={recursive} onChange={setRecursive} />
                      <FontText className="text-sm">Include subfolders</FontText>
                    </Row>
                    <Row className="items-center gap-2">
                      <CustomCheckbox monochrome checked={dividers} onChange={setDividers} />
                      <FontText className="text-sm">Dividers between files</FontText>
                    </Row>
                    <Row className="items-center gap-2">
                      <FontText className="text-sm">Align</FontText>
                      <AppDropdown
                        options={alignOptions}
                        value={align}
                        onValueChange={(value) => setAlign(value as 'left' | 'center' | 'justify')}
                        placeholder="Default"
                        allowUnselect
                        unselectLabel="Default"
                        fitContent
                        isInDialog
                        searchable={false}
                      />
                    </Row>
                    <Row className="items-center gap-2">
                      <FontText className="text-sm">Image height</FontText>
                      <FontTextInput
                        value={imageHeight}
                        onChangeText={setImageHeight}
                        placeholder="Default"
                        className="h-9 w-24"
                      />
                    </Row>
                  </Row>
                  <Column className="min-h-0 flex-1 gap-2">
                    <FontText variant="subtext" className="text-xs">
                      Order and visibility
                    </FontText>
                    <ShadowScrollView
                      className="min-h-0 flex-1"
                      scrollViewClassName="min-h-0 flex-1">
                      <Column className="gap-1.5 pb-2">
                        {members.map((file, index) => {
                          const isHidden = hidden.includes(file.id);
                          return (
                            <Row
                              key={file.id}
                              className={`border-subtle-border items-center gap-2 rounded-xl border px-2 py-2 ${
                                isHidden ? 'opacity-50' : 'bg-inner-background'
                              }`}>
                              <FileText
                                size={15}
                                color={isTriggerFile(file) ? '#B45309' : '#4a6a8a'}
                              />
                              <Column className="min-w-0 flex-1 gap-0">
                                <FontText weight="medium" className="text-sm" numberOfLines={1}>
                                  {fileName(file.path)}
                                </FontText>
                                {isTriggerFile(file) && (
                                  <FontText variant="subtext" className="text-xs">
                                    Trigger file: not shown in displays
                                  </FontText>
                                )}
                              </Column>
                              <Pressable
                                accessibilityLabel="Move up"
                                disabled={index === 0}
                                onPress={() => move(file, -1)}
                                className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-md disabled:opacity-30">
                                <ChevronUp size={14} color="#1a1a1a" />
                              </Pressable>
                              <Pressable
                                accessibilityLabel="Move down"
                                disabled={index === members.length - 1}
                                onPress={() => move(file, 1)}
                                className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-md disabled:opacity-30">
                                <ChevronDown size={14} color="#1a1a1a" />
                              </Pressable>
                              <Pressable
                                accessibilityLabel={isHidden ? 'Show file' : 'Hide file'}
                                onPress={() => toggleHidden(file)}
                                className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-md">
                                {isHidden ? (
                                  <EyeOff size={14} color="#1a1a1a" />
                                ) : (
                                  <Eye size={14} color="#1a1a1a" />
                                )}
                              </Pressable>
                            </Row>
                          );
                        })}
                        {members.length === 0 && (
                          <FontText variant="subtext" className="py-8 text-center text-sm">
                            No files in this folder yet
                          </FontText>
                        )}
                      </Column>
                    </ShadowScrollView>
                  </Column>
                </>
              )}
              {error && (
                <FontText className="text-sm" color="#a03030">
                  {error}
                </FontText>
              )}
              <Row className="justify-end gap-3">
                <AppButton variant="outline" className="h-9 w-24" onPress={handleAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton
                  variant="filled"
                  className="h-9 w-24"
                  disabled={!resolvedPath}
                  onPress={handleSubmit}>
                  <FontText weight="medium" color="white">
                    Save
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
      <UnsavedChangesDialog
        isOpen={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        onSave={handleSubmit}
        onDiscard={handleConfirmLeave}
      />
    </>
  );
};

export default FolderSettingsDialog;
