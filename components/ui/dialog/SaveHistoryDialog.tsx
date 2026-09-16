import React, { useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Calendar } from 'lucide-react-native';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';
import CloseButton from './CloseButton';
import FontText from '../text/FontText';
import Row from '../../layout/Row';
import Column from '../../layout/Column';
import AppButton from '../buttons/AppButton';
import { SavedEntry } from '../../../../hooks/useSaveHistory';
import { useKeyboardShortcuts } from '../../../../hooks/useKeyboardShortcuts';

interface SaveHistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    history: SavedEntry[];
    maxSaves: number;
    onSelectEntry: (entry: SavedEntry) => void;  // opens preview modal
    onClearHistory?: () => void;
}

function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) {
        return `Today, ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
}

export function SaveHistoryDialog({
    isOpen,
    onOpenChange,
    history,
    maxSaves,
    onSelectEntry,
    onClearHistory,
}: SaveHistoryDialogProps) {
    useKeyboardShortcuts({
        onClose: () => onOpenChange(false),
        enabled: isOpen,
    });

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className="max-w-md h-[60vh]" isSwipeable={false}>
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <DialogHeader
                        text="Save History"
                        subtext={`Showing up to ${maxSaves} most recent saves`}
                    />
                    <View className="flex-1 min-h-0">
                        {history.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <FontText variant="subtext" className="text-center">
                                    No saved versions yet
                                </FontText>
                            </View>
                        ) : (
                            <Column className="gap-2 py-2">
                                {history.map((entry) => (
                                    <HistoryEntry
                                        key={entry.id}
                                        entry={entry}
                                        onPress={() => onSelectEntry(entry)}
                                    />
                                ))}
                                {onClearHistory && history.length > 0 && (
                                    <AppButton
                                        variant="outline"
                                        className="h-8 mt-2"
                                        onPress={onClearHistory}
                                        dropShadow={false}
                                    >
                                        <FontText className="text-sm">Clear History</FontText>
                                    </AppButton>
                                )}
                            </Column>
                        )}
                    </View>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
}

function HistoryEntry({ entry, onPress }: { entry: SavedEntry; onPress: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    const handleHoverIn = () => {
        if (Platform.OS === 'web') setIsHovered(true);
    };
    const handleHoverOut = () => {
        if (Platform.OS === 'web') setIsHovered(false);
    };

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={handleHoverIn}
            onHoverOut={handleHoverOut}
            className="bg-text/5 hover:bg-text/10 rounded-lg p-3 border border-text/10"
        >
            <View style={{ position: 'relative' }}>
                <Row className="items-center gap-2" style={{ opacity: isHovered ? 0.5 : 1 }}>
                    <Calendar size={12} opacity={0.6} />
                    <FontText className="text-xs opacity-60">
                        {formatDateTime(entry.savedAt)}
                    </FontText>
                </Row>
                <FontText
                    className="text-sm mt-1"
                    style={{ opacity: isHovered ? 0.5 : 1 }}
                    numberOfLines={1}
                >
                    {entry.preview || '(empty)'}
                </FontText>
                {isHovered && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(26, 26, 26, 0.6)',
                            borderRadius: 8,
                        }}
                    >
                        <FontText color="white" weight="medium" className="text-sm">
                            Click to preview
                        </FontText>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

export default SaveHistoryDialog;
