import React from 'react';
import { View } from 'react-native';
import PoppinsText from '../ui/PoppinsText';
import { useUserListSet } from 'hooks/useUserListSet';
import { useUserListGet } from 'hooks/useUserListGet';

interface MyProfileProps {
    addPost: (title: string, description: string) => void;
    currentUserID: string;
}

const MyProfile = ({ currentUserID, addPost }: MyProfileProps) => {
    const setPost = useUserListSet();

    const posts = useUserListGet({
        key: "posts",
        userIds: [currentUserID],
    });

    return (
        <>
            <PoppinsText>My Profile</PoppinsText>

            {posts?.map((post, index) => (
                <View key={index}>
                    <PoppinsText weight='bold'>{post?.value.title}</PoppinsText>
                    <PoppinsText>{post?.value.description}</PoppinsText>
                </View>
            ))}
        </>
    );
};

export default MyProfile;
