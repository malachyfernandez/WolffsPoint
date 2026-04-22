import React, { useEffect, useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppDropdown from '../ui/forms/AppDropdown';
import DialogHeader from '../ui/dialog/DialogHeader';
import { View } from 'react-native';
import { useUserList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';
import { UserTableItem, UserTableTitle } from 'types/playerTable';
import Row from '../layout/Row';
import StatusButton from '../ui/StatusButton';

interface UserAddDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: string;
}

const UserAddDialog = ({
    isOpen,
    onOpenChange,
    gameId
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

    const users = userTable?.value;

    const [userTableTitle] = useUserList<UserTableTitle>({
        key: "userTableTitle",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const [dayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

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
        const emailExists = (users ?? []).some((user) => 
            user.email === email.trim()
        );
        setIsUniqueEmail(!emailExists);
        setIsValidEmail(isValidEmailFormat(email));
    }, [email, users]);

    const handleSubmit = () => {
        // Check for email uniqueness and format
        const emailExists = (users ?? []).some((user) => 
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

        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const newUser: UserTableItem = {
            realName: realName.trim(),
            email: email.trim(),
            userId: "NOT-JOINED",
            role: role.trim() || "UNSET",
            playerData: {
                livingState: "alive",
                extraColumns: Array(currentTitles.extraUserColumns.length).fill(""),
            },
            days: Array(dayDatesArray.value.length).fill(null).map(() => ({
                vote: "",
                action: "",
                extraColumns: Array(currentTitles.extraDayColumns.length).fill(""),
            })),
        };

        setUserTable([...(users ?? []), newUser]);

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
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text={`Add User`}
                            subtext={`Enter the user details`}
                        />
                        <Column className='gap-2'>
                            <FontText weight='medium'>Real Name</FontText>
                            <FontTextInput
                                placeholder="Enter real name..."
                                className="w-full border border-subtle-border p-2"
                                value={realName}
                                onChangeText={setRealName}
                            />

                            <FontText weight='medium'>Email</FontText>
                            <FontTextInput
                                placeholder="Enter email..."
                                className="w-full border border-subtle-border p-2"
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
                                    <AppButton className='max-w-[30vw] w-48 h-10' variant='black' onPress={handleSubmit}>
                                        <FontText color='white' weight='medium'>Add User</FontText>
                                    </AppButton> 
                                ) : (
                                    <StatusButton 
                                        className='max-w-[30vw]  w-48 h-10' 
                                        buttonText='Add User' 
                                        buttonAltText={!isUniqueEmail ? 'Email already exists' : 'Valid email required'} 
                                    />
                                )}
                                    
                                    <AppButton className='max-w-[30vw] w-48 h-10' variant='outline' onPress={handleCancel}>
                                        <FontText color='black' weight='medium'>Cancel</FontText>
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
