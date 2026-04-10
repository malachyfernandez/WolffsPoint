import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import { Pressable } from 'react-native';
import NightlyMessageDialog from './NightlyMessageDialog';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';

interface NightlyDayUserRowProps {
    user: UserTableItem;
    index: number;
    isLast: boolean;
    dayNumber: number;
    setVoteValue?: (userIndex: number, newValue: string) => void;
    setActionValue?: (userIndex: number, newValue: string) => void;
    updateMorningMessage: (dayIndex: number, userIndex: number, value: string) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    morningMessagesList: Record<string, string[]>;
}

const NightlyDayUserRow = ({ 
    user, 
    index, 
    isLast, 
    dayNumber, 
    setVoteValue, 
    setActionValue,
    updateMorningMessage,
    onEditStart, 
    onEditEnd, 
    isEditing,
    morningMessagesList
}: NightlyDayUserRowProps) => {
    const [editingVote, setEditingVote] = useState(false);
    const [editingAction, setEditingAction] = useState(false);
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

    const dayData = user.days[dayNumber] || { vote: "", action: "", extraColumns: [] };
    const actionDisplayValue = getPlayerActionSummary(dayData.action);

    const handleVoteEditStart = () => {
        setEditingVote(true);
        onEditStart?.();
    };

    const handleVoteEditEnd = () => {
        setEditingVote(false);
        onEditEnd?.();
    };

    const handleActionEditStart = () => {
        setEditingAction(true);
        onEditStart?.();
    };

    const handleActionEditEnd = () => {
        setEditingAction(false);
        onEditEnd?.();
    };

    const getCurrentMorningMessage = () => {
        if (morningMessagesList[user.email] && morningMessagesList[user.email][dayNumber] !== undefined) {
            return morningMessagesList[user.email][dayNumber];
        }
        return "";
    };

    return (
        <>
            <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`w-28 h-full border border-subtle-border items-center justify-center z-10`}>
                    <InlineEditableText
                        value={dayData.vote || ''}
                        onChange={(newValue) => setVoteValue?.(index, newValue)}
                        placeholder='Vote'
                        className='w-20 text-center text-nowrap overflow-hidden'
                        weight='medium'
                        onEditStart={handleVoteEditStart}
                        onEditEnd={handleVoteEditEnd}
                    />
                </Column>
                <Column gap={0} className={`w-28 h-full border border-subtle-border items-center justify-center ${editingVote ? 'z-0' : 'z-20'}`}>
                    <InlineEditableText
                        value={actionDisplayValue}
                        onChange={(newValue) => setActionValue?.(index, newValue)}
                        placeholder='Action'
                        className='w-20 text-center text-nowrap overflow-hidden'
                        weight='medium'
                        onEditStart={handleActionEditStart}
                        onEditEnd={handleActionEditEnd}
                    />
                </Column>
                <Column gap={0} className={`w-64 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                    <Pressable onPress={() => setIsMessageDialogOpen(true)} className='w-60 h-full items-center justify-center'>
                        <PoppinsText 
                            weight='medium' 
                            className='text-center text-nowrap overflow-hidden w-60'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {getCurrentMorningMessage() || (
                                <PoppinsText className="opacity-50">No morning message...</PoppinsText>
                            )}
                        </PoppinsText>
                    </Pressable>
                </Column>
            </Row>
            <NightlyMessageDialog
                isOpen={isMessageDialogOpen}
                onOpenChange={setIsMessageDialogOpen}
                dayIndex={dayNumber}
                userIndex={index}
                userName={user.realName || 'User'}
                currentMessage={getCurrentMorningMessage()}
                onPress={() => setIsMessageDialogOpen(true)}
                updateNightlyMessage={updateMorningMessage}
            />
        </>
    );
};

export default NightlyDayUserRow;
