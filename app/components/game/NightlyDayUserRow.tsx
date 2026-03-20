import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';

interface NightlyDayUserRowProps {
    user: {
        realName: string;
        email: string;
        userId: string | "NOT-JOINED";
        role: string;
        playerData: {
            livingState: 'alive' | 'dead';
            extraColumns?: string[];
        };
        days: Array<{
            vote?: string;
            action?: string;
            extraColumns?: string[];
        }>;
    };
    index: number;
    isLast: boolean;
    dayNumber: number;
    setVoteValue?: (userIndex: number, newValue: string) => void;
    setActionValue?: (userIndex: number, newValue: string) => void;
    updateNightlyResponse: (dayIndex: number, userIndex: number, value: string) => void;
    updateNightlyMessage: (dayIndex: number, userIndex: number, value: string) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    nightlyResponseList: Record<string, string[]>;
    nightlyMessagesList: Record<string, string[]>;
}

const NightlyDayUserRow = ({ 
    user, 
    index, 
    isLast, 
    dayNumber, 
    setVoteValue, 
    setActionValue,
    updateNightlyResponse, 
    updateNightlyMessage, 
    onEditStart, 
    onEditEnd, 
    isEditing,
    nightlyResponseList,
    nightlyMessagesList
}: NightlyDayUserRowProps) => {
    const [editingVote, setEditingVote] = useState(false);
    const [editingAction, setEditingAction] = useState(false);
    const [editingResponse, setEditingResponse] = useState(false);
    const [editingMessage, setEditingMessage] = useState(false);

    const dayData = user.days[dayNumber] || { vote: "", action: "", extraColumns: [] };

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

    const handleResponseEditStart = () => {
        setEditingResponse(true);
        onEditStart?.();
    };

    const handleResponseEditEnd = () => {
        setEditingResponse(false);
        onEditEnd?.();
    };

    const handleMessageEditStart = () => {
        setEditingMessage(true);
        onEditStart?.();
    };

    const handleMessageEditEnd = () => {
        setEditingMessage(false);
        onEditEnd?.();
    };

    const getCurrentNightlyResponse = () => {
        if (nightlyResponseList[user.email] && nightlyResponseList[user.email][dayNumber] !== undefined) {
            return nightlyResponseList[user.email][dayNumber];
        }
        return "";
    };

    const getCurrentNightlyMessage = () => {
        if (nightlyMessagesList[user.email] && nightlyMessagesList[user.email][dayNumber] !== undefined) {
            return nightlyMessagesList[user.email][dayNumber];
        }
        return "";
    };

    return (
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
                    value={dayData.action || ''}
                    onChange={(newValue) => setActionValue?.(index, newValue)}
                    placeholder='Action'
                    className='w-20 text-center text-nowrap overflow-hidden'
                    weight='medium'
                    onEditStart={handleActionEditStart}
                    onEditEnd={handleActionEditEnd}
                />
            </Column>
            <Column className={`w-32 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                <InlineEditableText
                    value={getCurrentNightlyResponse()}
                    onChange={(newValue) => updateNightlyResponse(dayNumber, index, newValue)}
                    placeholder='No response'
                    className='w-28 text-center text-nowrap overflow-hidden'
                    weight='medium'
                    onEditStart={handleResponseEditStart}
                    onEditEnd={handleResponseEditEnd}
                />
            </Column>
            <Column gap={0} className={`w-32 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                <InlineEditableText
                    value={getCurrentNightlyMessage()}
                    onChange={(newValue) => updateNightlyMessage(dayNumber, index, newValue)}
                    placeholder='No message'
                    className='w-28 text-center text-nowrap overflow-hidden'
                    weight='medium'
                    onEditStart={handleMessageEditStart}
                    onEditEnd={handleMessageEditEnd}
                />
            </Column>
        </Row>
    );
};

export default NightlyDayUserRow;
