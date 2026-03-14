import React from 'react';

import ContainerCol from '../layout/ContainerCol';
import PoppinsText from '../ui/PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import Comments from './Comments';

interface PostProps {
    title: string;
    description: string;
    postId: string;
    posterID: string;
}

const Post = ({ title, description, postId, posterID }: PostProps) => {
    const safePosterId = posterID || '';
    
    const userDatas = useUserVariableGet({
        key: "userData",
        userIds: [safePosterId],
    });

    const email = userDatas?.[0]?.value?.email;

    return (
        <ContainerCol gap={1} className='p-4 bg-slate-800'>
            <PoppinsText className='text-sm opacity-50'>{email || 'Loading...'}</PoppinsText>

            <PoppinsText weight='bold'>{title}</PoppinsText>
            <PoppinsText>{description}</PoppinsText>

            <Comments postId={postId} />
        </ContainerCol>
    );
};

export default Post;
