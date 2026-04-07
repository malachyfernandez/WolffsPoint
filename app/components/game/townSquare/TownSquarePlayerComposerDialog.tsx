import React from 'react';
import TownSquareComposerDialog from './TownSquareComposerDialog';
import { ComposerSubmitPayload } from './townSquareUtils';

interface TownSquarePlayerComposerDialogProps {
    includeThreadTitle: boolean;
    initialBody?: string;
    initialTitle?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: ComposerSubmitPayload) => void;
    submitLabel: string;
    targetLabel?: string;
    title: string;
}

const TownSquarePlayerComposerDialog = ({
    includeThreadTitle,
    initialBody,
    initialTitle,
    isOpen,
    onOpenChange,
    onSubmit,
    submitLabel,
    targetLabel,
    title,
}: TownSquarePlayerComposerDialogProps) => {
    return (
        <TownSquareComposerDialog
            includeTitle={includeThreadTitle}
            initialBody={initialBody}
            initialTitle={initialTitle}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            submitLabel={submitLabel}
            targetLabel={targetLabel}
            title={title}
        />
    );
};

export default TownSquarePlayerComposerDialog;
