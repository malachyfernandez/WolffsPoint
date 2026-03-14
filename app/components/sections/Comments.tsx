import React, { useState } from 'react';

import ContainerCol from '../layout/ContainerCol';
import ContainerRow from '../layout/ContainerRow';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import AppButton from '../ui/AppButton';
import UpArrow from '../ui/UpArrow';
import Comment from './Comment';
import { useUserListSet } from 'hooks/useUserListSet';
import { useUserListGet } from 'hooks/useUserListGet';

interface CommentsProps {
    postId: string;
}

interface CommentData {
    text: string;
    postIdItsTiedTo: string;
}

const Comments = ({ postId }: CommentsProps) => {
    const [comment, setComment] = useState('');
    const setUserList = useUserListSet();

    const addComment = (textInComment: string) => {
        const randomId = Math.floor(Math.random() * 1000000000);
        setComment('');

        const commentData: CommentData = {
            text: textInComment,
            postIdItsTiedTo: postId,
        };

        setUserList({
            key: 'comments',
            itemId: randomId.toString(),
            value: commentData,
            privacy: 'PUBLIC',
            filterKey: 'postIdItsTiedTo',
        });
    };

    const commentsOnActivePost = useUserListGet({
        key: 'comments',
        filterFor: postId,
    });

    return (
        <ContainerCol>
            {/* comments input */}
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
                );
            })}
        </ContainerCol>
    );
};

export default Comments;
