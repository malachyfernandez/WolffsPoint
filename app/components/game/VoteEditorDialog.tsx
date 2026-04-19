import React, { useEffect, useState, useMemo } from 'react';
import { View, TextInput } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import { UserTableItem } from '../../../types/playerTable';

interface VoteEditorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initialVote?: string;
    onSubmit: (vote: string) => void;
    dialogSubtext?: string;
    users: UserTableItem[];
}

export const resolveVoteEmailToName = (voteEmail: string, users: UserTableItem[]): string => {
    if (!voteEmail.trim()) return 'No vote';

    const trimmedEmail = voteEmail.trim();
    const targetUser = users.find(u => u.email.toLowerCase() === trimmedEmail.toLowerCase());

    return targetUser?.realName || voteEmail;
};

const VoteEditorDialog = ({
    isOpen,
    onOpenChange,
    title,
    initialVote = '',
    onSubmit,
    dialogSubtext,
    users,
}: VoteEditorDialogProps) => {
    const [draftVote, setDraftVote] = useState(initialVote);
    const [editingStartVote, setEditingStartVote] = useState(initialVote);

    useEffect(() => {
        if (isOpen) {
            setDraftVote(initialVote);
            setEditingStartVote(initialVote);
        }
    }, [initialVote, isOpen]);

    const hasUnsavedChanges = draftVote.trim() !== (editingStartVote?.trim() || '');

    const resolvedName = useMemo(() => {
        return resolveVoteEmailToName(draftVote, users);
    }, [draftVote, users]);

    const handleSubmit = () => {
        onSubmit(draftVote.trim());
        onOpenChange(false);
    };

    const handleCancel = () => {
        setDraftVote(initialVote);
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className="max-w-md p-1">
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className="absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover"
                    />
                    <DialogHeader text={title} subtext={dialogSubtext} />

                    <Column className="p-5 pt-4" gap={4}>
                        {/* Email Input */}
                        <Column gap={1}>
                            <FontText weight="medium" className="text-sm opacity-70">
                                Player Email
                            </FontText>
                            <TextInput
                                value={draftVote}
                                onChangeText={setDraftVote}
                                placeholder="Enter player email..."
                                className="bg-background border-2 border-border rounded-lg p-3 text-text font-poppins"
                                style={{ fontFamily: 'Poppins-Regular' }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </Column>

                        {/* Live Preview */}
                        <Column gap={1}>
                            <FontText weight="medium" className="text-sm opacity-70">
                                Resolved Name
                            </FontText>
                            <View className="bg-text border-2 border-border rounded-lg p-3">
                                <FontText color="white" weight="medium" className="text-center">
                                    {resolvedName}
                                </FontText>
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

export default VoteEditorDialog;
