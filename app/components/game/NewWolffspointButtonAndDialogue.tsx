import React, { useState } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';

import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';
import { useListSet } from 'hooks/useData';

interface NewWolffspointButtonAndDialogueProps {
    onCreate?: (gameId: string) => void;
    condensed?: boolean;
}

const NewWolffspointButtonAndDialogue = ({ onCreate, condensed }: NewWolffspointButtonAndDialogueProps) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [input, setInput] = useState('');

    const [date, setDate] = useState('');
    const [isDateValid, setIsDateValid] = useState(false);

    const todaysDate = new Date()

    const setUserListItem = useListSet();

    const generateGameId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const dateToStorageString = (date: Date): string => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    const parseDateString = (dateStr: string): Date => {
        const parts = dateStr.split('/').map(Number);
        
        // Handle MM/DD format (assume current year)
        if (parts.length === 2) {
            return new Date(new Date().getFullYear(), parts[0] - 1, parts[1]);
        }
        
        // Handle MM/DD/YYYY format
        if (parts.length === 3) {
            return new Date(parts[2], parts[0] - 1, parts[1]);
        }
        
        // Fallback to today if invalid format
        return new Date();
    };

    const submitForum = () => {
        const finalInput = input || "WolffsPoint";
        const newGameId = generateGameId();

        setUserListItem({
            key: "games",
            itemId: newGameId,
            value: { id: newGameId, name: finalInput, description: "" },
            filterKey: "id",
            privacy: "PUBLIC",
        });

        setUserListItem({
            key: "dayDatesArray",
            itemId: newGameId,
            value: [dateToStorageString(parseDateString(date || ''))],
            // value: [dateToStorageString(parseDateString('04/23/2025'))],
            privacy: "PUBLIC",
        });

        onCreate?.(newGameId);
        setIsHeroDialogOpen(false);
    };


        return (


        <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
            <ConvexDialog.Trigger asChild>
                <AppButton variant="secondary" className={condensed ? "w-26 " : "w-42"}>
                    <FontText weight='medium'>{condensed ? 'New WP' : 'New WolffsPoint'}</FontText>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>

                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text="Let's get some basics setup"
                            subtext="You can change this later."
                        />

                        <Column  className='gap-4'>
                            <Column className='gap-2'>
                                <FontText>Title:</FontText>

                                {/* EXAMPLE USING TEXT INPUT */}
                                <FontTextInput
                                    placeholder="WolffsPoint"
                                    className="w-full border border-subtle-border p-2"
                                    value={input}
                                    onChangeText={setInput}
                                />
                            </Column>
                        </Column>
                        <Column className='gap-2'>

                            <FontText>Day 1 of Your Game</FontText>

                            {/* EXAMPLE USING TEXT INPUT */}
                            <SmartDateInput
                                placeholder="MM/DD/YYYY"
                                className="w-full border border-subtle-border p-2"
                                value={date}
                                onChangeText={setDate}
                                onIsValid={setIsDateValid}
                                earliestDate={todaysDate}
                            />
                        </Column>

{/* <View></View> */}
                        {isDateValid ? (
                            <AppButton className='w-34' variant='black' onPress={submitForum}>
                                <FontText color='white' weight='medium'>Create</FontText>
                            </AppButton>
                        ) : (
                            <StatusButton buttonText="Create" className='w-34' buttonAltText="Invalid Date" />
                        )}
                    </Column>


                    {/* <JoinHandler gameCode={gameCode} onClose={() => setIsHeroDialogOpen(false)} onJoin={handleJoin} /> */}


                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root >
    );
};

export default NewWolffspointButtonAndDialogue;
