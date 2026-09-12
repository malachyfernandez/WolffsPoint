import React from 'react';
import { Pressable, View } from 'react-native';
import { History } from 'lucide-react-native';
import FontText from '../text/FontText';
import { useToast } from '../../../../contexts/ToastContext';
import { useKeyboardShortcutHint } from '../../../../contexts/KeyboardShortcutHintContext';

interface SaveHistoryPillProps {
    hasUnsavedChanges: boolean;
    isInvalid?: boolean;
    invalidMessage?: string;
    onSave: () => void;
    onOpenHistory: () => void;
}

/**
 * A two-button pill for the top-right of editor dialogs.
 * Left 3/4 = "Save" (saves without closing). Right 1/4 = history icon.
 * Together they form a single pill shape.
 *
 * - When there are no unsaved changes, the save half renders with a dashed outline
 *   and pressing it shows a "Nothing to save" toast.
 * - When isInvalid is true, pressing save shows the invalidMessage toast.
 * - The history half is always clickable.
 */
export function SaveHistoryPill({
    hasUnsavedChanges,
    isInvalid = false,
    invalidMessage,
    onSave,
    onOpenHistory,
}: SaveHistoryPillProps) {
    const { showToast } = useToast();
    const { setHint } = useKeyboardShortcutHint();

    const handleSavePress = () => {
        if (isInvalid) {
            showToast(invalidMessage ?? 'Invalid input');
            return;
        }
        if (!hasUnsavedChanges) {
            showToast('Nothing to save');
            return;
        }
        onSave();
    };

    const saveBgClass = hasUnsavedChanges
        ? 'bg-text-inverted/10 hover:bg-text-inverted/15'
        : 'bg-transparent border border-dashed border-text-inverted/30';

    return (
        <View className="absolute right-11 top-0 z-10 flex-row items-stretch h-10">
            {/* Save half — fixed width, symmetric padding */}
            <Pressable
                onPress={handleSavePress}
                onHoverIn={() => setHint(['cmd', 's'])}
                onHoverOut={() => setHint(null)}
                className={`${saveBgClass} rounded-l-full rounded-r-none items-center justify-center pr-2 pl-3 h-full w-16`}
            >
                <FontText color="rgb(246, 238, 219)" weight="medium" className="text-sm">
                    Save
                </FontText>
            </Pressable>

            {/* History half — fixed width, symmetric padding */}
            <Pressable
                onPress={onOpenHistory}
                onHoverOut={() => setHint(null)}
                className="bg-text-inverted/10 hover:bg-text-inverted/15 rounded-r-full rounded-l-none items-center justify-center pr-3 pl-2 h-full w-10"
            >
                <History size={16} color="rgb(246, 238, 219)" />
            </Pressable>
        </View>
    );
}

export default SaveHistoryPill;
