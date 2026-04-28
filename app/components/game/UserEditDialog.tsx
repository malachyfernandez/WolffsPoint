import React, { useEffect, useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppDropdown from '../ui/forms/AppDropdown';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View, Text } from 'react-native';
import { useList, useValue } from 'hooks/useData';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem } from 'types/playerTable';
import { useCreateUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import Row from '../layout/Row';
import StatusButton from '../ui/StatusButton';
import DeleteConfirmationDialog from './DeleteRoleConfirmationDialog';

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
    const [userTable, setUserTable] = useList<UserTableItem[]>("userTable", gameId, { privacy: "PUBLIC" });

    const users = userTable?.value ?? [];

    const [roleTable] = useList<RoleTableItem[]>("roleTable", gameId, { privacy: "PUBLIC" });

    const roleOptions = (roleTable?.value ?? [])
        .filter((roleItem) => roleItem.role.trim().length > 0 && roleItem.isVisible !== false)
        .map((roleItem) => ({
            value: roleItem.role,
            label: roleItem.role,
        }));

    const handleDialogOpenChange = (open: boolean) => {
        onOpenChange(open);
    };

    const [isUniqueEmail, setIsUniqueEmail] = useState(false);
    const [isValidEmail, setIsValidEmail] = useState(false);

    // Basic email validation function
    const isValidEmailFormat = (email: string): boolean => {
        const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
        return emailRegex.test(email.trim());
    };

    let emailExists;

    useEffect(() => {
        emailExists = users.some((user, index) =>
            user.email === email.trim() && index !== userIndex
        );
        setIsUniqueEmail(!emailExists);
        setIsValidEmail(isValidEmailFormat(email));
    }, [email, userIndex, users]);

    const handleSubmit = () => {
        // Check for email uniqueness (skip if it's the same user's current email)
        emailExists = users.some((user, index) =>
            user.email === email.trim() && index !== userIndex
        );

        if (emailExists) {
            console.warn("Email already exists!");
            return;
        }

        if (!isValidEmailFormat(email)) {
            console.warn("Invalid email format!");
            return;
        }

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

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const handleDeleteUser = () => {
        // Remove user from the users array
        const updatedUsers = users.filter((_, index) => index !== userIndex);
        setUserTable(updatedUsers);
        onDelete();
        onOpenChange(false);
    };

    return (
        <>
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleDialogOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in UserRow */}
                </View>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content className="max-w-xl">
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />
                    <DialogHeader
                        text={`Edit User`}
                        subtext={`Set the user details`}
                    />
                    <Column className='gap-4 p-0 sm:p-5'>

                        <Column className='gap-2'>
                            <FontText weight='medium'>Real Name</FontText>
                            <FontTextInput
                                placeholder="Enter real name..."
                                variant="styled"
                                className="w-full p-2"
                                value={realName}
                                onChangeText={setRealName}
                            />

                            <FontText weight='medium'>Email</FontText>
                            <FontTextInput
                                placeholder="Enter email..."
                                variant="styled"
                                className="w-full p-2"
                                value={email}
                                onChangeText={setEmail}
                            />

                            <FontText weight='medium'>Role</FontText>
                            <AppDropdown
                                options={roleOptions}
                                value={role}
                                onValueChange={setRole}
                                placeholder='Select a role'
                                emptyText='No roles available'
                                isInDialog={true}
                            />
                        </Column>

                        <Column className='gap-4 w-full items-center justify-center'>
                            <Column className='gap-4 w-min'>
                                <Row className='gap-4 w-min max-w-full'>
                                    {isUniqueEmail && isValidEmail && realName.trim() && email.trim() ? (
                                        <AppButton className='w-30 sm:w-48 h-10' variant='black' onPress={handleSubmit}>
                                            <FontText color='white' weight='medium'>Save</FontText>
                                        </AppButton>
                                    ) : (
                                        <StatusButton
                                            className='w-30 sm:w-48 h-10'
                                            buttonText='Save'
                                            buttonAltText={!isUniqueEmail ? 'Email Used' : 'Invalid'}
                                        />
                                    )}

                                    <AppButton className='max-w-[30vw] w-22 sm:w-48 h-10' variant='outline' onPress={handleCancel}>
                                        <FontText color='black' weight='medium'>Cancel</FontText>
                                    </AppButton>
                                </Row>

                                <AppButton className='w-full h-10' variant='red' onPress={() => setIsDeleteConfirmOpen(true)}>
                                    <FontText color='red' weight='medium'>Delete User</FontText>
                                </AppButton>
                            </Column>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>

        <DeleteConfirmationDialog
            isOpen={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
            onConfirm={handleDeleteUser}
            itemType="User"
            itemName={realName || 'this user'}
        />
        </>
    );
};

export default UserEditDialog;
