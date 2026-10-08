import React from 'react';
import Row from '../../layout/Row';
import { TouchableOpacity, View } from 'react-native';

interface ListRowProps {
    children: React.ReactNode;
    className?: string;
    onPress?: () => void;
    testID?: string;
}

const ListRow = ({ children, onPress, className = '', testID }: ListRowProps) => {

    return (
        <Row className={`gap-4 border-b border-subtle-border/30 w-full flex-1`}>
            <View className='flex-1 rounded hover:bg-accent-hover/10'>

                <TouchableOpacity onPress={onPress} className='w-full' testID={testID}>
                    <Row className={`gap-4 p-4 w-full hover:bg-accent-hover/10 border-subtle-border/30 ${className}`} pointerEvents="none">
                        {children}
                    </Row>
                </TouchableOpacity>
            </View>

        </Row>
    );
};

export default ListRow;
