import React, { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import ActionPills from './ActionPills';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ActionEditorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initialAction?: string;
    onSubmit: (action: string) => void;
    dialogSubtext?: string;
}

const ActionEditorDialog = ({
    isOpen,
    onOpenChange,
    title,
    initialAction = '',
    onSubmit,
    dialogSubtext,
}: ActionEditorDialogProps) => {
    const [draftAction, setDraftAction] = useState(initialAction);
    const [editingStartAction, setEditingStartAction] = useState(initialAction);

    useEffect(() => {
        if (isOpen) {
            setDraftAction(initialAction);
            setEditingStartAction(initialAction);
        }
    }, [initialAction, isOpen]);

    const hasUnsavedChanges = draftAction.trim() !== (editingStartAction?.trim() || '');
    const canSubmit = true; // Allow empty actions

    const handleSubmit = () => {
        onSubmit(draftAction.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        // Reset to initial value
        setDraftAction(initialAction);
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className="max-w-lg p-1">
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className="absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover"
                    />
                    <DialogHeader text={title} subtext={dialogSubtext} />

                    <Column className="p-5 pt-4" gap={4}>
                        {/* Text Input for editing */}
                        <Column gap={1}>
                            <FontText weight="medium" className="text-sm opacity-70">
                                Action Text
                            </FontText>
                            <TextInput
                                value={draftAction}
                                onChangeText={setDraftAction}
                                placeholder="e.g., Kill: Ty Pace • Weapon: Piano"
                                multiline
                                numberOfLines={3}
                                className="bg-background border-2 border-border rounded-lg p-3 text-text font-poppins"
                                style={{ fontFamily: 'Poppins-Regular' }}
                            />
                            <FontText className="text-xs opacity-50">
                                Use • to separate multiple actions. Use : to separate label from value.
                            </FontText>
                        </Column>

                        {/* Live Preview */}
                        <Column gap={1} className="flex-1">
                            <FontText weight="medium" className="text-sm opacity-70">
                                Preview
                            </FontText>
                            <View className="bg-background border-2 border-border rounded-lg p-3 flex-1 min-h-[80px]">
                                <ScrollShadow
                                    LinearGradientComponent={LinearGradient}
                                    className="h-full"
                                >
                                    <ActionPills actionText={draftAction} />
                                </ScrollShadow>
                            </View>
                        </Column>

                        {/* Action Buttons */}
                        <Row className="justify-end gap-3 pt-2">
                            <AppButton variant="outline" onPress={handleCancel} className="w-32 h-12">
                                <FontText>Cancel</FontText>
                            </AppButton>
                            <DisableableButton
                                isEnabled={hasUnsavedChanges}
                                enabledText="Save"
                                disabledText="No changes"
                                onPress={handleSubmit}
                                enabledVariant="filled"
                            />
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default ActionEditorDialog;
