import React, { useState } from 'react';
import { View } from 'react-native';

import ContainerCol from '../layout/ContainerCol';
import ContainerRow from '../layout/ContainerRow';
import AppButton from '../ui/AppButton';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import { useUserListSet } from 'hooks/useUserListSet';

const AddPost = () => {
    const [postTitle, setPostTitle] = useState('');
    const [postDescription, setPostDescription] = useState('');

    const setPost = useUserListSet();

    const handleAddPost = () => {
        const postId = Math.floor(Math.random() * 1000000000);
        setPostTitle('');
        setPostDescription('');


        setPost({
            key: 'posts',
            itemId: postId.toString(),
            value: {
                title: postTitle,
                description: postDescription,
                players: 3,
            },
            privacy: 'PUBLIC',
        });
    };

    return (
        <View className='w-full items-center p-5 border-t border-slate-700'>
            <ContainerCol>
                <PoppinsTextInput
                    className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                    value={postTitle}
                    onChangeText={setPostTitle}
                    placeholder='Title'
                    weight='bold'
                />

                <ContainerRow className='w-full'>
                    <PoppinsTextInput
                        className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                        value={postDescription}
                        onChangeText={setPostDescription}
                        placeholder='Post description'
                    />

                    <AppButton variant='grey' className='w-28' onPress={handleAddPost}>
                        <PoppinsText>New post</PoppinsText>
                    </AppButton>
                </ContainerRow>
            </ContainerCol>
        </View>
    );
};

export default AddPost;
