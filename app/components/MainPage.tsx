import React, { PropsWithChildren, useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import ContainerCol from './layout/ContainerCol';
import { useClerk } from '@clerk/clerk-expo';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppButton from './ui/AppButton';
import ContainerRow from './layout/ContainerRow';
import PoppinsText from './ui/PoppinsText';


type FontWeight = 'regular' | 'medium' | 'bold';

interface MainPageProps extends PropsWithChildren {
    className?: string;
}

const MainPage = ({
    className = '',
}: MainPageProps) => {


    interface UserData {
        email?: string;
        name?: string;
        userId?: string
    };

    const [userData, setUserData] = useUserVariable<UserData>({
        key: "userData",
        defaultValue: {},
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });




    useSyncUserData(userData.value, setUserData);

    const { signOut } = useClerk();

    const [followingList, setFollowingList] = useUserVariable<string[]>({
        key: "followingList",
        defaultValue: [],
    })

    const addFollowing = (friend: any) => {
        if (!friend?.userId) {
            return;
        }

        setFollowingList([...(followingList.value || []), friend.userId])
    }


    const currentUserID = (userData?.value.userId || "LOADING...")
    const currentUserEmail = (userData?.value.email || "LOADING...")

    type PageState = "Profile" | "Following" | "Feed";

    const [pageState, setPageState] = useState<PageState>("Profile");

    return (
        <View className='justify-between w-full h-full'>

            <ContainerCol>



                <ContainerRow className='justify-between items-center px-6'>
                    <PoppinsText weight='bold'>WolffsPoint</PoppinsText>
                    <AppButton variant="grey" className="h-14 px-6" onPress={() => signOut()}>
                        <ContainerCol gap={0}>
                            <PoppinsText>Sign Out</PoppinsText>
                            <PoppinsText varient="subtext">{currentUserEmail}</PoppinsText>
                        </ContainerCol>
                    </AppButton>
                </ContainerRow>
            </ContainerCol>






        </View >
    );
};

export default MainPage;
