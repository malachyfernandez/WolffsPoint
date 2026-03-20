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
    updateNightlyResponse: (dayIndex: number, userIndex: number, value: string) => void;
    updateNightlyMessage: (dayIndex: number, userIndex: number, value: string) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    nightlyResponseList: string[][];
    nightlyMessagesList: string[][];
}

const NightlyDayUserRow = ({ 
    user, 
    index, 
    isLast, 
    dayNumber, 
    updateNightlyResponse, 
    updateNightlyMessage, 
    onEditStart, 
    onEditEnd, 
    isEditing,
    nightlyResponseList,
    nightlyMessagesList
}: NightlyDayUserRowProps) => {
    const [editingResponse, setEditingResponse] = useState(false);
    const [editingMessage, setEditingMessage] = useState(false);

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
        if (nightlyResponseList[dayNumber] && nightlyResponseList[dayNumber][index] !== undefined) {
            return nightlyResponseList[dayNumber][index];
        }
        return "";
    };

    const getCurrentNightlyMessage = () => {
        if (nightlyMessagesList[dayNumber] && nightlyMessagesList[dayNumber][index] !== undefined) {
            return nightlyMessagesList[dayNumber][index];
        }
        return "";
    };

    return (
        <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
            <Column className={`w-64 h-full border border-subtle-border items-center justify-center z-10 ${isLast ? 'rounded-bl-lg' : ''}`}>
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
            <Column gap={0} className={`w-64 h-full border border-subtle-border items-center justify-center ${editingResponse ? 'z-0' : 'z-20'} ${isLast ? 'rounded-br-lg' : ''}`}>
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
