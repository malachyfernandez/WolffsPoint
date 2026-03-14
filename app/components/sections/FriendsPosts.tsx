import React from 'react';
import PoppinsText from '../ui/PoppinsText';
import { useUserListGet } from 'hooks/useUserListGet';
import { View } from 'react-native';
import ContainerCol from '../layout/ContainerCol';

const FriendsPosts = ({ friendsList }: { friendsList: string[] }) => {
    const posts = useUserListGet({
        key: "posts",
        userIds: friendsList,
    });
    console.log("posts", posts);
    console.log("friendsList", friendsList);
    return (

        <View>
            <PoppinsText>My Friends posts</PoppinsText>
            {posts?.map((post, index) => (
                <ContainerCol key={index} gap={1}>
                    <PoppinsText weight='bold'>{post?.value.title}</PoppinsText>
                    <PoppinsText>{post?.value.description}</PoppinsText>
                </ContainerCol>
            ))}
        </View>
    );
};

export default FriendsPosts;
