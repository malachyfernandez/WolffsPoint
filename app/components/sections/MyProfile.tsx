import React from 'react';
import PoppinsText from '../ui/PoppinsText';
import { useUserListSet } from 'hooks/useUserListSet';
import { useUserListGet } from 'hooks/useUserListGet';
import Post from './Post';
import ContainerCol from '../layout/ContainerCol';

interface MyProfileProps {
    currentUserID: string;
}

const MyProfile = ({ currentUserID }: MyProfileProps) => {
    const setPost = useUserListSet();

    const posts = useUserListGet({
        key: "posts",
        userIds: [currentUserID],
    });

    return (
        <ContainerCol gap={2}>
            <PoppinsText>My Profile</PoppinsText>

            {posts?.map((post, index) => (

                <Post key={index} title={post?.value.title} description={post?.value.description} />

            ))}
        </ContainerCol>
    );
};

export default MyProfile;
