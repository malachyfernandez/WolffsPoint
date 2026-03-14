import React from 'react';
import { useState } from 'react';

import ContainerCol from '../layout/ContainerCol';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import ContainerRow from '../layout/ContainerRow';
import AppButton from '../ui/AppButton';
import UpArrow from '../ui/UpArrow';
import NameFromUserID from '../ui/NameFromUserID';
import Comment from './Comment';
import { useUserListSet } from 'hooks/useUserListSet';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserVariableGet } from 'hooks/useUserVariableGet';

interface PostProps {
    title: string;
    description: string;
    postId: string;
    posterID: string;
}

interface Comment {
    text: string;
    postIdItsTiedTo: string;
}

const Post = ({ title, description, postId, posterID }: PostProps) => {
    // use state for text input
    const [comment, setComment] = useState('');

    const setUserList = useUserListSet();



    const addComment = (textInComment: string) => {
        const randomId = Math.floor(Math.random() * 1000000000);

        const comment: Comment = {
            text: textInComment,
            postIdItsTiedTo: postId,
        };

        setUserList({
            key: 'comments',
            itemId: randomId.toString(),
            value: comment,
            privacy: 'PUBLIC',
            filterKey: 'postIdItsTiedTo',
        });
    }

    const commentsOnActivePost = useUserListGet({
        key: 'comments',
        filterFor: postId,
    });


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

            <ContainerCol>
                {/* comments */}
                <ContainerRow className='w-full justify-between'>

                    <PoppinsTextInput
                        value={comment}
                        onChangeText={setComment}
                        placeholder="Add a comment..."
                    />
                    <AppButton variant='blue' onPress={() => addComment(comment)}>
                        <UpArrow size={20} />
                    </AppButton>
                </ContainerRow>
                
                {/* comments list */}
                {commentsOnActivePost?.map((comment, index) => {
                    const text = comment.value.text ?? '';
                    const userId = comment.userToken ?? '';

                    return (
                        <Comment 
                            key={index}
                            text={text}
                            userId={userId}
                        />
                    )
                })}
            </ContainerCol>
        </ContainerCol>


    );

};

export default Post;
