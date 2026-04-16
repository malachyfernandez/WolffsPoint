import React from 'react';
import UnsavedChangesDialog from '../../ui/dialog/UnsavedChangesDialog';
import ImageUploadDialog from '../../ui/dialog/ImageUploadDialog';
import TownSquareMoreOptionsDialog from '../townSquare/TownSquareMoreOptionsDialog';
import TownSquareLinkDialog from '../townSquare/TownSquareLinkDialog';
import MarkdownInputBuilderDialog from '../MarkdownInputBuilderDialog';
import { InputOptionsProvider } from './InputOptionsProvider';
import { SelectionRange } from '../townSquare/townSquareUtils';
import {
    applyMoreComposerAction,
    insertMarkdownLink,
    insertMarkdownImage,
    insertMarkdownInput,
} from '../townSquare/townSquareUtils';

interface SubDialogsProps {
    gameId: string | undefined;
    showInputs: boolean;
    selectedText: string;
    isMoreDialogOpen: boolean;
    setIsMoreDialogOpen: (open: boolean) => void;
    isLinkDialogOpen: boolean;
    setIsLinkDialogOpen: (open: boolean) => void;
    isImageDialogOpen: boolean;
    setIsImageDialogOpen: (open: boolean) => void;
    isInputDialogOpen: boolean;
    setIsInputDialogOpen: (open: boolean) => void;
    isLeaveConfirmDialogOpen: boolean;
    setIsLeaveConfirmDialogOpen: (open: boolean) => void;
    runBodyUpdate: (updater: (value: string, selection: SelectionRange) => { value: string; selection: SelectionRange }) => void;
    onConfirmLeave: () => void;
    onCancelLeave: () => void;
}

export function SubDialogs({
    gameId,
    showInputs,
    selectedText,
    isMoreDialogOpen,
    setIsMoreDialogOpen,
    isLinkDialogOpen,
    setIsLinkDialogOpen,
    isImageDialogOpen,
    setIsImageDialogOpen,
    isInputDialogOpen,
    setIsInputDialogOpen,
    isLeaveConfirmDialogOpen,
    setIsLeaveConfirmDialogOpen,
    runBodyUpdate,
    onConfirmLeave,
    onCancelLeave,
}: SubDialogsProps) {
    return (
        <>
            <TownSquareMoreOptionsDialog
                isOpen={isMoreDialogOpen}
                onOpenChange={setIsMoreDialogOpen}
                onSelectAction={(action) => runBodyUpdate((value, range) => applyMoreComposerAction(value, range, action))}
            />

            <TownSquareLinkDialog
                isOpen={isLinkDialogOpen}
                onInsert={(label, url) => runBodyUpdate((value, range) => insertMarkdownLink(value, range, label, url))}
                onOpenChange={setIsLinkDialogOpen}
                selectedText={selectedText}
            />

            <ImageUploadDialog
                isOpen={isImageDialogOpen}
                onOpenChange={setIsImageDialogOpen}
                onImageSelect={(imageUrl) => runBodyUpdate((value, range) => insertMarkdownImage(value, range, '', imageUrl))}
                key={isImageDialogOpen ? 'open' : 'closed'}
            />

            <InputOptionsProvider gameId={gameId} showInputs={showInputs}>
                <MarkdownInputBuilderDialog
                    isOpen={isInputDialogOpen}
                    onInsert={(label, inputType) => runBodyUpdate((value, range) => insertMarkdownInput(value, range, label, inputType))}
                    onOpenChange={setIsInputDialogOpen}
                    selectedText={selectedText}
                />
            </InputOptionsProvider>

            <UnsavedChangesDialog
                isOpen={isLeaveConfirmDialogOpen}
                onOpenChange={setIsLeaveConfirmDialogOpen}
                onStay={onCancelLeave}
                onLeave={onConfirmLeave}
            />
        </>
    );
}
