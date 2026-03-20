import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import AppDropdown from '../ui/forms/AppDropdown';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View, Text } from 'react-native';
import { useUserList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem } from 'types/playerTable';
import { useCreateUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';

interface UserEditDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    userIndex: number;
    currentRealName: string;
    currentEmail: string;
    currentRole: string;
    onPress: () => void;
    gameId: string;
    onDelete: () => void;
}

const UserEditDialog = ({
    isOpen,
    onOpenChange,
    userIndex,
    currentRealName,
    currentEmail,
    currentRole,
    gameId,
    onDelete
}: UserEditDialogProps) => {
    const [realName, setRealName] = useState(currentRealName || '');
    const [email, setEmail] = useState(currentEmail || '');
    const [role, setRole] = useState(currentRole || '');

    // Use the same userList as PlayerTable - this is the cloud variable benefit!
    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    const [roleTable] = useUserList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const roleOptions = (roleTable?.value ?? [])
        .filter((roleItem) => roleItem.role.trim().length > 0 && roleItem.isVisible !== false)
        .map((roleItem) => ({
            value: roleItem.role,
            label: roleItem.role,
        }));

    const handleDialogOpenChange = (open: boolean) => {
        onOpenChange(open);
    };

    const handleSubmit = () => {
        // Local functions using the same cloud variable as PlayerTable
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                realName: realName.trim(),
                email: email.trim(),
                role: role.trim()
            };
            UNDOABLEsetUserTable(updatedUsers);
        }

        onOpenChange(false);
    };

    const deleteUser = (userIndex: number) => {
        const filteredUserTable = userTable?.value?.filter((userRow, index) => index != userIndex);
        setUserTable(filteredUserTable ?? []);
    };

    const { executeCommand } = useUndoRedo();
    const createUndoSnapshot = useCreateUndoSnapshot();

    const UNDOABLEsetUserTable = (updatedUsers: UserTableItem[]) => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        const nextUserTable = createUndoSnapshot(updatedUsers);

        executeCommand({
            action: () => setUserTable(createUndoSnapshot(nextUserTable)),
            undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
            description: "Updated user"
        });
    };

    const handleCancel = () => {
        setRealName(currentRealName || '');
        setEmail(currentEmail || '');
        setRole(currentRole || '');
        onOpenChange(false);
    };

    const handleDeleteUser = () => {
        // Remove user from the users array
        const updatedUsers = users.filter((_, index) => index !== userIndex);
        setUserTable(updatedUsers);
        onDelete();
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleDialogOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in UserRow */}
                </View>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text={`Edit User`}
                            subtext={`Set the user details`}
                        />
                        <Column gap={2}>
                            <PoppinsText weight='medium'>Real Name</PoppinsText>
                            <PoppinsTextInput
                                placeholder="Enter real name..."
                                className="w-full border border-subtle-border p-2"
                                value={realName}
                                onChangeText={setRealName}
                            />

                            <PoppinsText weight='medium'>Email</PoppinsText>
                            <PoppinsTextInput
                                placeholder="Enter email..."
                                className="w-full border border-subtle-border p-2"
                                value={email}
                                onChangeText={setEmail}
                            />

                            <PoppinsText weight='medium'>Role</PoppinsText>
                            <AppDropdown
                                options={roleOptions}
                                value={role}
                                onValueChange={setRole}
                                placeholder='Select a role'
                                emptyText='No roles available'
                                centered={true}
                            />
                        </Column>

                        <Column gap={2}>
                            <AppButton className='w-34 h-10' variant='black' onPress={handleSubmit}>
                                <PoppinsText color='white' weight='medium'>Save</PoppinsText>
                            </AppButton>
                            <AppButton className='w-34 h-10' variant='outline-alt' onPress={handleCancel}>
                                <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                            <AppButton className='w-34 h-10 border-2 border-red-500' variant='outline' onPress={handleDeleteUser}>
                                <Text className='text-red-500 font-medium'>Delete User</Text>
                            </AppButton>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default UserEditDialog;
