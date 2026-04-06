import React, { useState } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import { useUserVariable } from 'hooks/useUserVariable';
import { UserData } from 'types/common';
import EditInfoDialog from './EditInfoDialog';

interface CustomUserInfo {
    name?: string;
    photoUrl?: string;
}

const ProfileInfo = () => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // Original Clerk data (fallback)
    const [userData] = useUserVariable<UserData>({ key: 'userData' });
    
    // Custom user info (separate from Clerk)
    const [customUserInfo, setCustomUserInfo] = useUserVariable<CustomUserInfo>({
        key: "customUserInfo",
        defaultValue: { name: "", photoUrl: "" },
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });
    
    // Display custom info if available, otherwise fallback to Clerk data
    const displayName = customUserInfo.value.name || userData?.value?.name || 'Not set';
    const displayEmail = userData?.value?.email || 'Not available';
    const displayUserId = userData?.value?.userId || 'Not available';

    const handleSignOut = () => {
        // TODO: Implement sign out logic
    };

    const handleEditInfo = () => {
        setIsEditDialogOpen(true);
    };

    return (
        <>
            <Column className='pt-5 px-5 pb-5' gap={6}>
                <Column gap={3} className='w-full items-center'>
                    <Row className='items-center' gap={4}>
                        <PoppinsText className='text-base text-text-inverted border-r border-subtle-border pr-4'>
                            {displayName}
                        </PoppinsText>
                        
                        <PoppinsText className='text-base text-text-inverted' varient='subtext'>
                            {displayEmail}
                        </PoppinsText>
                    </Row>

                    <Column className='px-4'>
                        <PoppinsText varient='subtext' className='text-xs text-text-inverted font-mono'>
                            {displayUserId}
                        </PoppinsText>
                    </Column>
                </Column>

                {/* Edit Info and Sign Out Buttons - 50/50 split */}
                <View className='mt-auto flex-row gap-2'>
                    <View className='flex-1'>
                        <AppButton
                            variant='outline-invert'
                            className='h-12 w-full'
                            onPress={handleEditInfo}
                        >
                            <PoppinsText weight='medium' color='white'>
                                Edit Info
                            </PoppinsText>
                        </AppButton>
                    </View>
                    <View className='flex-1'>
                        <AppButton
                            variant='red'
                            className='h-12 w-full'
                            onPress={handleSignOut}
                        >
                            <PoppinsText weight='medium' color='red'>
                                Sign Out
                            </PoppinsText>
                        </AppButton>
                    </View>
                </View>
            </Column>
            
            <EditInfoDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                customUserInfo={customUserInfo.value}
                setCustomUserInfo={setCustomUserInfo}
                clerkData={{
                    name: userData?.value?.name,
                    email: userData?.value?.email,
                }}
            />
        </>
    );
};

export default ProfileInfo;
