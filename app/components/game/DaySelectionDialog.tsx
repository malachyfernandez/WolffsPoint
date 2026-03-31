import React, { useState, useEffect } from 'react';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';

interface DaySelectionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    index: number;
    dayDate: Date;
    onPress: () => void;
    previousDate: Date;
    followingDate?: Date;
    replaceDayDate: (index: number, replacementDate: Date) => void;
}

const DaySelectionDialog = ({ isOpen, onOpenChange, index, dayDate, onPress, previousDate, followingDate, replaceDayDate }: DaySelectionDialogProps) => {
    const [input, setInput] = useState('');
    const [isDateValid, setIsDateValid] = useState(false);


    const formatDateWithConditionalYear = (date: Date): string => {
        const currentYear = new Date().getFullYear();
        const dayYear = date.getFullYear();
        const dateFormat: Intl.DateTimeFormatOptions = dayYear === currentYear 
            ? { month: '2-digit', day: '2-digit' }
            : { month: '2-digit', day: '2-digit', year: 'numeric' };
        return date.toLocaleDateString('en-US', dateFormat);
    };

    const [date, setDate] = useState(() => formatDateWithConditionalYear(dayDate));

    const normalizeDateInput = (value: string): Date => {
        const trimmed = value.trim();
        if (!trimmed) return new Date(); // fallback to today

        const segments = trimmed.split("/");
        const hasYear = segments.length === 3 && segments[2]?.length === 4;
        
        let month, day, year;
        
        if (hasYear) {
            // MM/DD/YYYY format
            month = parseInt(segments[0], 10);
            day = parseInt(segments[1], 10);
            year = parseInt(segments[2], 10);
        } else if (segments.length >= 2) {
            // MM/DD format - infer year from dayDate
            month = parseInt(segments[0], 10);
            day = parseInt(segments[1], 10);
            year = dayDate.getFullYear();
        } else {
            return new Date(); // fallback to today
        }

        // Create Date object using reliable constructor
        return new Date(year, month - 1, day);
    };

    const previousDatePlusOne = new Date(previousDate);
    if (index === 0) {
        previousDatePlusOne.setDate(previousDate.getDate());
    } else {
        previousDatePlusOne.setDate(previousDate.getDate() + 1);
    } 

    const followingDateMinusOne = followingDate ? new Date(followingDate) : undefined;
    if (followingDateMinusOne) {
        followingDateMinusOne.setDate(followingDateMinusOne.getDate() - 1);
    } 

    const submitForum = () => {
        const parsedDate = normalizeDateInput(date);
        if (!isNaN(parsedDate.getTime())) {
            replaceDayDate(index, parsedDate);
            onOpenChange(false);
        }
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <AppButton
                    key={index}
                    variant={"black"}
                    className='w-16 max-h-6'
                    onPress={onPress}
                >
                    <PoppinsText className='text-white'>{dayDate.getMonth() + 1}/{dayDate.getDate()}</PoppinsText>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />

                    <Column>
                        <DialogHeader
                            text="SELECT DATE"
                            subtext={followingDateMinusOne ? `Between ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()} and ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}` : `After ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()}`}
                        />
                        <Column gap={2}>
                            {/* <PoppinsText>Day 1 of Your Game</PoppinsText> */}
                            <SmartDateInput
                                placeholder="MM/DD/YYYY"
                                className="w-full border border-subtle-border p-2"
                                value={date}
                                onChangeText={setDate}
                                onIsValid={setIsDateValid}
                                earliestDate={previousDatePlusOne}
                                latestDate={followingDateMinusOne}
                            />
                        </Column>

                        {isDateValid ? (
                            <>
                                <AppButton className='w-34 h-10' variant='black' onPress={submitForum}>
                                    <PoppinsText color='white' weight='medium'>Change</PoppinsText>
                                </AppButton>
                            </>
                        ) : (
                            <>
                                <StatusButton buttonText="Change" buttonAltText="Invalid Date" />
                            </>
                        )}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default DaySelectionDialog;
