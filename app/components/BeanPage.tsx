import React, { PropsWithChildren, useState } from 'react';

import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import ContainerCol from './layout/ContainerCol';
import { useClerk } from '@clerk/clerk-expo';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import PoppinsText from './ui/PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import { useUserVariablePrivacy } from 'hooks/useUserVariablePrivacy';
import ContainerRow from './layout/ContainerRow';
import AppButton from './ui/AppButton';
import { useUserList } from 'hooks/useUserList';
import { useUserListSet } from 'hooks/useUserListSet';
import { useUserListGet } from 'hooks/useUserListGet';
import PoppinsTextInput from './ui/PoppinsTextInput';
import MyProfile from './sections/MyProfile';
import FindFriends from './sections/FindFriends';
import MyFriends from './sections/MyFriends';
import Feed from './sections/Feed';
import AddPost from './sections/AddPost';
import NavButton from './ui/NavButton';

type FontWeight = 'regular' | 'medium' | 'bold';

interface BeanPageProps extends PropsWithChildren {
    className?: string;
}

const BeanPage = ({
    className = '',
}: BeanPageProps) => {


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

    const [friendsList, setFriendsList] = useUserVariable<string[]>({
        key: "friendsList",
        defaultValue: [],
    })

    const addFriend = (friend: any) => {
        if (!friend?.userId) {
            return;
        }

        setFriendsList([...(friendsList.value || []), friend.userId])
    }


    const currentUserID = (userData?.value.userId || "LOADING...")
    const currentUserEmail = (userData?.value.email || "LOADING...")

    
    const [pageState, setPageState] = useState("Profile")

    return (
        <View className='justify-between w-full h-full'>

            <ContainerCol>

                <AppButton variant="grey" className="w-full" onPress={() => signOut()}>
                    <ContainerRow>
                        <PoppinsText>Sign Out</PoppinsText>
                        <PoppinsText>{currentUserEmail}</PoppinsText>
                    </ContainerRow>
                </AppButton>

                <ContainerRow className='w-full justify-between'>
                    <NavButton buttonID="Profile" pageState={pageState} setPageState={setPageState} />
                    <NavButton buttonID="Find friends" pageState={pageState} setPageState={setPageState} />
                    <NavButton buttonID="Friends" pageState={pageState} setPageState={setPageState} />
                    <NavButton buttonID="Feed" pageState={pageState} setPageState={setPageState} />
                </ContainerRow>



                {pageState === "Profile" && <MyProfile currentUserID={currentUserID} />}

                {pageState === "Find friends" && <FindFriends currentUserId={currentUserID} addFriend={addFriend} />}

                {pageState === "Friends" && <MyFriends friendsList={friendsList.value || []} />}

                {pageState === "Feed" && <Feed friendsList={friendsList.value || []} />}

            </ContainerCol>

            <AddPost />
        </View>
    );
};

export default BeanPage;
