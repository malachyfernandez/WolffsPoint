import React from 'react';
import Row from '../../layout/Row';
import { TouchableOpacity } from 'react-native';

interface ListRowProps {
    children: React.ReactNode;
    className?: string;
    onPress?: () => void;
}

const ListRow = ({ children, onPress, className = '' }: ListRowProps) => {

    return (
        <Row className={`border-b border-subtle-border w-full hover:bg-accent-hover/10`}>

            <TouchableOpacity onPress={onPress} className='w-full' >
                <Row className={`p-4 w-full  hover:bg-accent-hover/10 border-subtle-border ${className}`} pointerEvents="none">
                    {children}
                </Row>
            </TouchableOpacity>

        </Row>
    );
};

export default ListRow;
