import React from 'react';
import { Pressable, View } from 'react-native';
import { List } from 'lucide-react-native';

interface StickyTocButtonProps {
    onPress: () => void;
    isOpen?: boolean;
}

const StickyTocButton = ({ onPress }: StickyTocButtonProps) => {
    return (
        <View className='h-10 w-10'>
            <Pressable
                onPress={onPress}
                className='bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full'
            >
                <List size={20} color='rgb(46, 41, 37)' />
            </Pressable>
        </View>
    );
};

export default StickyTocButton;
