import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';

interface UserRowProps {
    user: {
        realName: string;
        email: string;
        userId: string | "NOT-JOINED";
        role: string;
        playerData: {
            livingState: 'alive' | 'dead';
            extraColumns?: any[];
        };
        days: Array<{
            votes?: string[];
            actions?: string[];
            extraColumns?: any[];
        }>;
    };
    index: number;
    isLast: boolean;
    setLivingState: (userIndex: number, newLivingState: 'alive' | 'dead') => void;
    setExtraColumnValue?: (userIndex: number, columnIndex: number, newValue: string) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
}


const UserRow = ({ user, index, isLast, setLivingState, setExtraColumnValue, onEditStart, onEditEnd, isEditing }: UserRowProps) => {
    const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});

    const toggleLivingState = () => {
        const newLivingState = user.playerData.livingState === 'alive' ? 'dead' : 'alive';
        setLivingState(index, newLivingState);
    };

    const isDead = user.playerData.livingState === 'dead';

    const handleColumnEditStart = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: true }));
        onEditStart?.();
    };

    const handleColumnEditEnd = (columnIndex: number) => {
        setEditingColumns(prev => ({ ...prev, [columnIndex]: false }));
        onEditEnd?.();
    };

    return (
        <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
            <Column className={`w-12 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-bl-lg' : ''}`}>
                <CustomCheckbox checked={isDead} onChange={toggleLivingState} />
            </Column>
            <Column gap={0} className='w-28 h-full border border-subtle-border items-center justify-center'>
                <InlineEditableText 
                    value={user.realName || ''}
                    onChange={(newValue) => {/* Add handler for real name if needed */}}
                    placeholder='Unnamed player'
                    className='mb-[-4px] w-20 text-center text-nowrap overflow-hidden' 
                    weight='medium' 
                />
                <PoppinsText varient='subtext'>{user.role || 'No role'}</PoppinsText>
            </Column>
        
            {user.playerData.extraColumns?.map((column, columnIndex) => (
                <Column key={columnIndex} className={`w-28 h-full border border-subtle-border items-center justify-center ${isLast && columnIndex === (user.playerData.extraColumns?.length || 0) - 1 ? 'rounded-br-lg' : ''} ${editingColumns[columnIndex] ? 'z-50' : ''}`}>
                    <InlineEditableText 
                        value={column}
                        onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
                        placeholder='UNSET'
                        className='w-20 text-center text-nowrap overflow-hidden' 
                        weight='medium' 
                        onEditStart={() => handleColumnEditStart(columnIndex)}
                        onEditEnd={() => handleColumnEditEnd(columnIndex)}
                    />
                </Column>
            ))}
        </Row>
    );
};

export default UserRow;
