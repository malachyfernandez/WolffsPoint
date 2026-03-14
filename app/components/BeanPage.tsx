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
import FriendsPosts from './sections/FriendsPosts';

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

    // const setPosts = useUserListSet({
    //     key: "posts",
    //     itemId: "postId",
    //     defaultValue: {},
    // })

    const addPost = (title: string, description: string) => {
        // random number
        const postId = Math.floor(Math.random() * 1000000);

        setPost({
            key: "posts",
            itemId: postId.toString(),
            value: {
                title: title,
                description: description,
                players: 3
            },
            privacy: "PUBLIC"
        })
    }

    const setPost = useUserListSet()

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


    const [postDescription, setPostDescription] = useState("")
    const [postTitle, setPostTitle] = useState("")

    const currentUserID = (userData?.value.userId || "LOADING...")
    const currentUserEmail = (userData?.value.email || "LOADING...")

    // state for page state
    const [pageState, setPageState] = useState("my profile")

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
                    <AppButton variant="grey" className="w-20%" onPress={() => setPageState("my profile")}>

                        <PoppinsText>my profile</PoppinsText>

                    </AppButton>
                    <AppButton variant="grey" className="w-20%" onPress={() => setPageState("find friends")}>

                        <PoppinsText>Find friends</PoppinsText>

                    </AppButton>

                    <AppButton variant="grey" className="w-20%" onPress={() => setPageState("my friends")}>

                        <PoppinsText>my friends</PoppinsText>

                    </AppButton>

                    <AppButton variant="grey" className="w-20%" onPress={() => setPageState("feed")}>

                        <PoppinsText>feed</PoppinsText>

                    </AppButton>
                </ContainerRow>



                {pageState === "my profile" && <MyProfile currentUserID={currentUserID} addPost={addPost} />}

                {pageState === "find friends" && <FindFriends currentUserId={currentUserID} addFriend={addFriend} />}

                {pageState === "my friends" && <MyFriends friendsList={friendsList.value || []} />}

                {pageState === "feed" && <FriendsPosts friendsList={friendsList.value || []} />}

            </ContainerCol>

            <View className='w-full items-center p-5 border-t border-slate-700'>
                <ContainerCol>
                    <PoppinsTextInput
                        className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                        value={postTitle}
                        onChangeText={setPostTitle}
                        placeholder='Title'
                        weight='bold'
                    />

                    <ContainerRow className='w-full'>
                        <PoppinsTextInput
                            className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                            value={postDescription}
                            onChangeText={setPostDescription}
                            placeholder='Post description'
                        />

                        <AppButton variant="grey" className="w-24" onPress={() => addPost(postTitle, postDescription)}>
                            <PoppinsText>New post</PoppinsText>
                        </AppButton>



                    </ContainerRow>
                </ContainerCol>
            </View>
        </View>
    );
};

export default BeanPage;
