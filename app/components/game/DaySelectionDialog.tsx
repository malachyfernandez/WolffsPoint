import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';

interface DaySelectionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    index: number;
    dayDate: Date;
    buttonLabel?: string;
    onPress: () => void;
    previousDate: Date;
    followingDate?: Date;
    replaceDayDate: (index: number, replacementDate: Date) => void;
    showCurrentDayIndicator?: boolean;
}

const DaySelectionDialog = ({ isOpen, onOpenChange, index, dayDate, buttonLabel, onPress, previousDate, followingDate, replaceDayDate, showCurrentDayIndicator = false }: DaySelectionDialogProps) => {
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
                    className='min-w-28 px-2 max-h-6'
                    onPress={onPress}
                >
                    <Row className='gap-2 items-center'>
                        {showCurrentDayIndicator && (
                            <View className='w-1.5 h-1.5 bg-red-500 rounded-full' />
                        )}
                        <FontText className='text-white'>{buttonLabel || `${dayDate.getMonth() + 1}/${dayDate.getDate()}`}</FontText>
                    </Row>
                </AppButton>
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />

                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />

                    <Column className='gap-4'>
                        <DialogHeader
                            text="SELECT DATE"
                            subtext={followingDateMinusOne ? `Between ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()} and ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}` : `After ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()}`}
                        />
                        <Column className='gap-2'>
                            {/* <FontText>Day 1 of Your Game</FontText> */}
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
                                    <FontText color='white' weight='medium'>Change</FontText>
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
