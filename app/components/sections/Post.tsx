import React from 'react';
import { useState } from 'react';

import ContainerCol from '../layout/ContainerCol';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';

interface PostProps {
    title: string;
    description: string;
}

const Post = ({ title, description }: PostProps) => {
    // use state for text input
    const [comment, setComment] = useState('');
    
    return (
    <ContainerCol gap={1} className='p-4 bg-slate-800'>
        <PoppinsText weight='bold'>{title}</PoppinsText>
        <PoppinsText>{description}</PoppinsText>
        <PoppinsTextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment..."
        />
    </ContainerCol>


    );
    
};

export default Post;
