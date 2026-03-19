
import React, { useState } from 'react';
import { useUserVariable } from 'hooks/useUserVariable';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';

import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import JoinHandler from '../ui/forms/JoinHandler';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';
import { useUserListSet } from 'hooks/useUserListSet';

interface NewWolffspointButtonAndDialogueProps {
    onPress: () => void;
}

const NewWolffspointButtonAndDialogue = ({ onPress }: NewWolffspointButtonAndDialogueProps) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [input, setInput] = useState('');

    const [date, setDate] = useState('');
    const [isDateValid, setIsDateValid] = useState(false);


    const todaysDate = new Date()

    const setUserListItem = useUserListSet();

    const generateGameId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const newGameId = generateGameId();


    const submitForum = () => {
        const finalInput = input || "WolffsPoint";

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
            value: [date],
            privacy: "PUBLIC",
        });

        setIsHeroDialogOpen(false);
    };


    return (


        <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={setIsHeroDialogOpen}>
            <ConvexDialog.Trigger asChild>
                <AppButton variant="outline" className="h-12 w-40 shrink">
                    <PoppinsText weight='medium' className='group-hover:text-white'>New WolffsPoint</PoppinsText>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>

                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text="Let's get some basics setup"
                            subtext="You can change this later."
                        />

                        <Column >
                            <Column gap={2}>
                                <PoppinsText>Title:</PoppinsText>

                                {/* EXAMPLE USING TEXT INPUT */}
                                <PoppinsTextInput
                                    placeholder="WolffsPoint"
                                    className="w-full border border-subtle-border p-2"
                                    value={input}
                                    onChangeText={setInput}
                                />
                            </Column>
                        </Column>
                        <Column gap={2}>

                            <PoppinsText>Day 1 of Your Game</PoppinsText>

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


                        {isDateValid ? (
                            <AppButton className='w-34 h-10' variant='black' onPress={submitForum}>
                                <PoppinsText color='white' weight='medium'>Create</PoppinsText>
                            </AppButton>
                        ) : (
                            <StatusButton buttonText="Create" buttonAltText="Invalid Date" />
                        )}
                    </Column>


                    {/* <JoinHandler gameCode={gameCode} onClose={() => setIsHeroDialogOpen(false)} onJoin={handleJoin} /> */}


                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root >
    );
};

export default NewWolffspointButtonAndDialogue;
