import React, { useEffect, useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import AppDropdown from '../ui/forms/AppDropdown';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';
import { useUserList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem } from 'types/playerTable';
import { useCreateUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import Row from '../layout/Row';
import StatusButton from '../ui/StatusButton';

interface UserAddDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: string;
    onAddUser: (userData: { realName: string; email: string; role: string }) => void;
}

const UserAddDialog = ({
    isOpen,
    onOpenChange,
    gameId,
    onAddUser
}: UserAddDialogProps) => {
    const [realName, setRealName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

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

    const [isUniqueEmail, setIsUniqueEmail] = useState(false);
    const [isValidEmail, setIsValidEmail] = useState(false);

    // Basic email validation function
    const isValidEmailFormat = (email: string): boolean => {
        const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
        return emailRegex.test(email.trim());
    };

    useEffect(() => {
        const emailExists = users.some((user) => 
            user.email === email.trim()
        );
        setIsUniqueEmail(!emailExists);
        setIsValidEmail(isValidEmailFormat(email));
    }, [email, users]);

    const handleSubmit = () => {
        // Check for email uniqueness and format
        const emailExists = users.some((user) => 
            user.email === email.trim()
        );
        
        if (emailExists) {
            console.warn("Email already exists!");
            return;
        }

        if (!isValidEmailFormat(email)) {
            console.warn("Invalid email format!");
            return;
        }

        // Validate that required fields are filled (role is optional)
        if (!realName.trim() || !email.trim()) {
            console.warn("Name and email must be filled!");
            return;
        }

        // Call the onAddUser callback with the user data (role is optional)
        onAddUser({
            realName: realName.trim(),
            email: email.trim(),
            role: role.trim() || "UNSET" // Default to "UNSET" if no role selected
        });

        // Reset form
        setRealName('');
        setEmail('');
        setRole('');
        
        onOpenChange(false);
    };

    const handleCancel = () => {
        setRealName('');
        setEmail('');
        setRole('');
        onOpenChange(false);
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleDialogOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View>
                    {/* This will be replaced by the actual pressable in PlayerPageOPERATOR */}
                </View>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text={`Add User`}
                            subtext={`Enter the user details`}
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

                        <Column className='w-full items-center justify-center'>
                            <Column className='w-min'>
                                <Row className='w-min max-w-full'>
                                {isUniqueEmail && isValidEmail && realName.trim() && email.trim() ? (
                                    <AppButton className='max-w-[30vw] w-48 h-10' variant='black' onPress={handleSubmit}>
                                        <PoppinsText color='white' weight='medium'>Add User</PoppinsText>
                                    </AppButton> 
                                ) : (
                                    <StatusButton 
                                        className='max-w-[30vw]  w-48 h-10' 
                                        buttonText='Add User' 
                                        buttonAltText={!isUniqueEmail ? 'Email already exists' : 'Valid email required'} 
                                    />
                                )}
                                    
                                    <AppButton className='max-w-[30vw] w-48 h-10' variant='outline-alt' onPress={handleCancel}>
                                        <PoppinsText color='black' weight='medium'>Cancel</PoppinsText>
                                    </AppButton>
                                </Row>
                            </Column>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default UserAddDialog;
