import React from 'react';
import { View } from 'react-native';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';
import CloseButton from './CloseButton';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { useKeyboardShortcutHint } from '../../../../contexts/KeyboardShortcutHintContext';
import { useKeyboardShortcuts } from '../../../../hooks/useKeyboardShortcuts';
import { SavedEntry } from '../../../../hooks/useSaveHistory';

interface ViewOnlyPreviewModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtext?: string;
    entry: SavedEntry | null;
    onReplace: (entry: SavedEntry) => void;  // loads value into editor, closes preview
    children: React.ReactNode;              // view-only content rendered by parent
    /** ClassName for the dialog content, to match the parent modal's dimensions. */
    contentClassName?: string;
}

/**
 * A generic view-only preview modal that opens on top of the save history modal.
 * Bottom buttons are "Cancel" (left) and "Replace" (right).
 * - Cancel: closes just the preview modal
 * - Replace: calls onReplace(entry), parent closes both preview + history
 */
export function ViewOnlyPreviewModal({
    isOpen,
    onOpenChange,
    title,
    subtext,
    entry,
    onReplace,
    children,
    contentClassName = 'h-[75vh]',
}: ViewOnlyPreviewModalProps) {
    const { setHint } = useKeyboardShortcutHint();

    useKeyboardShortcuts({
        onClose: () => onOpenChange(false),
        onPrimaryAction: () => {
            if (entry) onReplace(entry);
        },
        enabled: isOpen,
    });

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className={contentClassName} isSwipeable={false}>
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <DialogHeader text={title} subtext={subtext} />
                    <View className="flex-1 min-h-0">
                        {children}
                    </View>
                    <Row className="gap-4 justify-end pt-4">
                        <AppButton
                            variant="outline"
                            className="w-20 sm:w-32"
                            onPress={() => onOpenChange(false)}
                            onHoverIn={() => setHint(['esc'])}
                            onHoverOut={() => setHint(null)}
                        >
                            <FontText weight="medium">Cancel</FontText>
                        </AppButton>
                        <AppButton
                            variant="filled"
                            className="w-20 sm:w-32"
                            onPress={() => entry && onReplace(entry)}
                            onHoverIn={() => setHint(['enter'])}
                            onHoverOut={() => setHint(null)}
                        >
                            <FontText color="white" weight="medium">Replace</FontText>
                        </AppButton>
                    </Row>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
}

export default ViewOnlyPreviewModal;
