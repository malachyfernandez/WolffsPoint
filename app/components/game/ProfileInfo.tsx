import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import { useUserVariable } from 'hooks/useUserVariable';
import { UserData } from 'types/common';

const ProfileInfo = () => {
    const [userData] = useUserVariable<UserData>({ key: 'userData' });
    
    const handleSignOut = () => {
        // TODO: Implement sign out logic
    };

    return (
        <Column className='pt-5 px-5 pb-5' gap={6}>
            <Column gap={3} className='w-full items-center'>
                <Row className='items-center' gap={4}>
                    <PoppinsText className='text-base text-text-inverted border-r border-subtle-border pr-4'>
                        {`${userData?.value?.name || 'Not set'}`}
                    </PoppinsText>
                    
                    <PoppinsText className='text-base text-text-inverted' varient='subtext'>
                        {userData?.value?.email || 'Not available'}
                    </PoppinsText>
                </Row>

                <Column className='px-4'>
                    <PoppinsText varient='subtext' className='text-xs text-text-inverted font-mono'>
                        {userData?.value?.userId || 'Not available'}
                    </PoppinsText>
                </Column>
            </Column>

            {/* Sign Out Button */}
            <View className='mt-auto'>
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
        </Column>
    );
};

export default ProfileInfo;
