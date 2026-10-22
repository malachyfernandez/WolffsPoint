import React from 'react';
import UnsavedChangesDialog from '../../ui/dialog/UnsavedChangesDialog';
import ImageUploadDialog from '../../ui/dialog/ImageUploadDialog';
import TownSquareMoreOptionsDialog from '../townSquare/TownSquareMoreOptionsDialog';
import TownSquareLinkDialog from '../townSquare/TownSquareLinkDialog';
import {
  SelectionRange,
  applyMoreComposerAction,
  insertMarkdownLink,
  insertMarkdownImage,
} from '../townSquare/townSquareUtils';
import { encodeMarkdownImageAlt } from 'utils/markdownImageOptions';

interface SubDialogsProps {
  selectedText: string;
  isMoreDialogOpen: boolean;
  setIsMoreDialogOpen: (open: boolean) => void;
  isLinkDialogOpen: boolean;
  setIsLinkDialogOpen: (open: boolean) => void;
  isImageDialogOpen: boolean;
  setIsImageDialogOpen: (open: boolean) => void;
  isLeaveConfirmDialogOpen: boolean;
  setIsLeaveConfirmDialogOpen: (open: boolean) => void;
  runBodyUpdate: (
    updater: (
      value: string,
      selection: SelectionRange
    ) => { value: string; selection: SelectionRange }
  ) => void;
  showImageBorderOption?: boolean;
  onConfirmLeave: () => void;
  onSave: () => void;
}

export function SubDialogs({
  selectedText,
  isMoreDialogOpen,
  setIsMoreDialogOpen,
  isLinkDialogOpen,
  setIsLinkDialogOpen,
  isImageDialogOpen,
  setIsImageDialogOpen,
  isLeaveConfirmDialogOpen,
  setIsLeaveConfirmDialogOpen,
  runBodyUpdate,
  showImageBorderOption = false,
  onConfirmLeave,
  onSave,
}: SubDialogsProps) {
  return (
    <>
      <TownSquareMoreOptionsDialog
        isOpen={isMoreDialogOpen}
        onOpenChange={setIsMoreDialogOpen}
        onSelectAction={(action) =>
          runBodyUpdate((value, range) => applyMoreComposerAction(value, range, action))
        }
      />

      <TownSquareLinkDialog
        isOpen={isLinkDialogOpen}
        onInsert={(label, url) =>
          runBodyUpdate((value, range) => insertMarkdownLink(value, range, label, url))
        }
        onOpenChange={setIsLinkDialogOpen}
        selectedText={selectedText}
      />

      <ImageUploadDialog
        isOpen={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onImageSelect={(imageUrl, options) =>
          runBodyUpdate((value, range) => insertMarkdownImage(
            value,
            range,
            encodeMarkdownImageAlt('', options.hasBorder),
            imageUrl,
          ))
        }
        showBorderOption={showImageBorderOption}
        key={isImageDialogOpen ? 'open' : 'closed'}
      />

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={onSave}
        onDiscard={onConfirmLeave}
      />
    </>
  );
}
export default SubDialogs;
