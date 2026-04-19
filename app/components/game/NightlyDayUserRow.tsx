import React, { useState, useMemo } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import { Pressable, View } from 'react-native';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog, { resolveVoteEmailToName } from './VoteEditorDialog';
import ActionPills from './ActionPills';
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
    columnWidths: {
        vote: number;
        action: number;
        morningMessage: number;
    };
    users: UserTableItem[];
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
    morningMessagesList,
    columnWidths,
    users
}: NightlyDayUserRowProps) => {
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);

    const dayData = user.days[dayNumber] || { vote: "", action: "", extraColumns: [] };

    const handleVotePress = () => {
        setIsVoteDialogOpen(true);
    };

    const handleActionPress = () => {
        setIsActionDialogOpen(true);
    };

    // Resolve vote email to player name
    const resolvedVoteName = useMemo(() => {
        return resolveVoteEmailToName(dayData.vote || '', users);
    }, [dayData.vote, users]);

    const getCurrentMorningMessage = () => {
        if (morningMessagesList[user.email] && morningMessagesList[user.email][dayNumber] !== undefined) {
            return morningMessagesList[user.email][dayNumber];
        }
        return "";
    };

    const getMorningMessagePreview = () => {
        const message = getCurrentMorningMessage();
        return message ? (
            message.slice(0, 30) + (message.length > 30 ? '...' : '')
        ) : (
            "No morning message..."
        );
    };

    // Wait for column widths to be ready before rendering to prevent flicker
    const areColumnWidthsReady = columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

    if (!areColumnWidthsReady) {
        return <Row gap={0} className='h-12 w-min bg-text/5' />;
    }

    return (
        <>
            <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`h-full border border-subtle-border items-center justify-center z-10`} style={{ width: columnWidths.vote }}>
                    <Pressable onPress={handleVotePress} className="w-full h-full items-center justify-center px-1">
                        <PoppinsText
                            weight="medium"
                            className="text-center text-nowrap overflow-hidden"
                            style={{ width: columnWidths.vote - 16 }}
                        >
                            {dayData.vote ? resolvedVoteName : 'No Vote...'}
                        </PoppinsText>
                    </Pressable>
                </Column>
                <Column gap={0} className={`h-full border border-subtle-border items-center justify-center z-20`} style={{ width: columnWidths.action }}>
                    <Pressable onPress={handleActionPress} className="w-full h-full items-center justify-center px-1">
                        <View style={{ width: columnWidths.action - 8 }}>
                            <ActionPills actionText={getPlayerActionSummary(dayData.action)} />
                        </View>
                    </Pressable>
                </Column>
                <Column gap={0} className={`h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`} style={{ width: columnWidths.morningMessage }}>
                    {getCurrentMorningMessage() ? (
                        <Pressable onPress={() => setIsMessageDialogOpen(true)} style={{ width: columnWidths.morningMessage - 8 }} className='h-full items-center justify-center'>
                            <PoppinsText
                                weight='medium'
                                className='text-center text-nowrap overflow-hidden'
                                style={{
                                    width: columnWidths.morningMessage - 8,
                                    textDecorationLine: 'underline',
                                    textDecorationStyle: 'dotted',
                                }}
                            >
                                <PoppinsText className="text-center">{getMorningMessagePreview()}</PoppinsText>
                            </PoppinsText>
                        </Pressable>
                    ) : morningMessagesList[user.email]?.[dayNumber - 1] ? (
                        <Pressable 
                            onPress={() => {
                                const yesterdayMessage = morningMessagesList[user.email]?.[dayNumber - 1];
                                if (yesterdayMessage) {
                                    updateMorningMessage(dayNumber, index, yesterdayMessage);
                                }
                            }} 
                            style={{ width: columnWidths.morningMessage - 8 }} 
                            className='h-full items-center justify-center px-2'
                        >
                            <PoppinsText 
                                weight='medium' 
                                className='text-center text-nowrap bg-text rounded-full max-w-42 px-2 py-1 overflow-hidden'
                                color='white'
                                style={{ width: columnWidths.morningMessage - 8 }}
                            >
                                Import Yesterday's
                            </PoppinsText>
                        </Pressable>
                    ) : (
                        <Pressable 
                            onPress={() => setIsMessageDialogOpen(true)} 
                            style={{ width: columnWidths.morningMessage - 8 }} 
                            className='h-full items-center justify-center'
                        >
                            <PoppinsText 
                                weight='medium' 
                                className='text-center text-nowrap overflow-hidden opacity-50'
                                style={{ width: columnWidths.morningMessage - 8 }}
                            >
                                No morning message...
                            </PoppinsText>
                        </Pressable>
                    )}
                </Column>
            </Row>
            <MarkdownEditorDialog
                isOpen={isMessageDialogOpen}
                onOpenChange={setIsMessageDialogOpen}
                title={`${user.realName || 'User'} Morning Message (Tomorrow)`}
                submitLabel="Save Message"
                initialMarkdown={getCurrentMorningMessage()}
                onSubmit={({ markdown }) => updateMorningMessage(dayNumber, index, markdown)}
                dialogSubtext={`Set the message ${user.realName || 'User'} will see after this day ends.`}
            />
            <ActionEditorDialog
                isOpen={isActionDialogOpen}
                onOpenChange={setIsActionDialogOpen}
                title={`${user.realName || 'User'} Action`}
                initialAction={getPlayerActionSummary(dayData.action)}
                onSubmit={(action) => setActionValue?.(index, action)}
                dialogSubtext={`Set the action for ${user.realName || 'User'}.`}
            />
            <VoteEditorDialog
                isOpen={isVoteDialogOpen}
                onOpenChange={setIsVoteDialogOpen}
                title={`${user.realName || 'User'} Vote`}
                initialVote={dayData.vote || ''}
                onSubmit={(vote) => setVoteValue?.(index, vote)}
                dialogSubtext={`Set the vote target for ${user.realName || 'User'}.`}
                users={users}
            />
        </>
    );
};

export default NightlyDayUserRow;
