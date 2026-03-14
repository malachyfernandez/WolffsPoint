import React from 'react';
import { useState } from 'react';

import ContainerCol from '../layout/ContainerCol';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import ContainerRow from '../layout/ContainerRow';
import AppButton from '../ui/AppButton';
import UpArrow from '../ui/UpArrow';

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


            <ContainerRow className='w-full justify-between'>

                <PoppinsTextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Add a comment..."
                />
                <AppButton variant='blue'>
                    <UpArrow size={20} />
                </AppButton>
            </ContainerRow>
            

        </ContainerCol>


    );

};

export default Post;
