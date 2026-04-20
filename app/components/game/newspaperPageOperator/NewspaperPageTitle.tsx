import React from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import PressLogo from '../../ui/icons/Press';

const NewspaperPageTitle = () => {
    const [containerWidth, setContainerWidth] = React.useState(0);

    const onLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    };

    return (
        <View 
            className="flex-1 items-center justify-center min-w-[200px]"
            onLayout={onLayout}
        >
            <PressLogo 
                color="#2b2112" 
                width="100%" 
                height={containerWidth * 0.18} 
            />
        </View>
    );
};

export default NewspaperPageTitle;
