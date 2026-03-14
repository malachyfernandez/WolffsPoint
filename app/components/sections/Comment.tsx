import React from 'react';

import ContainerCol from '../layout/ContainerCol';
import PoppinsText from '../ui/PoppinsText';
import NameFromUserID from '../ui/NameFromUserID';

interface CommentProps {
    text: string;
    userId: string;
}

const Comment = ({ text, userId }: CommentProps) => {
    return (
        <ContainerCol gap={0}>
            <NameFromUserID userid={userId} />
            <PoppinsText>{text}</PoppinsText>
        </ContainerCol>
    );
};

export default Comment;
