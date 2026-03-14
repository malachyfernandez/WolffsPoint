import React from 'react';
import PoppinsText from '../ui/PoppinsText';
import { useUserListGet } from 'hooks/useUserListGet';
import { View } from 'react-native';
import Post from './Post';
import ContainerCol from '../layout/ContainerCol';

const Feed = ({ friendsList }: { friendsList: string[] }) => {
    const posts = useUserListGet({
        key: "posts",
        userIds: friendsList,
    });
    
    return (

        <ContainerCol gap={2}>
            <PoppinsText>Feed</PoppinsText>
            {posts?.map((post, index) => (
                <Post
                    key={index}
                    title={post?.value?.title ?? ''}
                    description={post?.value?.description ?? ''}
                />
            ))}
        </ContainerCol>
    );
};

export default Feed;
