import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';
import CustomCheckbox from '../ui/CustomCheckbox';

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
  skipVoting?: boolean;
  skipActions?: boolean;
  onSkipVotingChange?: (skip: boolean) => void;
  onSkipActionsChange?: (skip: boolean) => void;
}

const DaySelectionDialog = ({
  isOpen,
  onOpenChange,
  index,
  dayDate,
  buttonLabel,
  onPress,
  previousDate,
  followingDate,
  replaceDayDate,
  showCurrentDayIndicator = false,
  skipVoting = false,
  skipActions = false,
  onSkipVotingChange,
  onSkipActionsChange,
}: DaySelectionDialogProps) => {
  const [input, setInput] = useState('');
  const [isDateValid, setIsDateValid] = useState(true);

  const formatDateWithConditionalYear = (date: Date): string => {
    const currentYear = new Date().getFullYear();
    const dayYear = date.getFullYear();
    const dateFormat: Intl.DateTimeFormatOptions =
      dayYear === currentYear
        ? { month: '2-digit', day: '2-digit' }
        : { month: '2-digit', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', dateFormat);
  };

  const [date, setDate] = useState(() => formatDateWithConditionalYear(dayDate));
  const [draftSkipVoting, setDraftSkipVoting] = useState(skipVoting);
  const [draftSkipActions, setDraftSkipActions] = useState(skipActions);

  // Reset drafts to current prop values whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setDate(formatDateWithConditionalYear(dayDate));
      setIsDateValid(true);
      setDraftSkipVoting(skipVoting);
      setDraftSkipActions(skipActions);
    }
  }, [isOpen, dayDate, skipVoting, skipActions]);

  const originalDate = formatDateWithConditionalYear(dayDate);
  const hasDateChanged = date !== originalDate;
  const hasSkipVotingChanged = draftSkipVoting !== skipVoting;
  const hasSkipActionsChanged = draftSkipActions !== skipActions;
  const hasAnyChange = hasDateChanged || hasSkipVotingChanged || hasSkipActionsChanged;

  const normalizeDateInput = (value: string): Date => {
    const trimmed = value.trim();
    if (!trimmed) return new Date(); // fallback to today

    const segments = trimmed.split('/');
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

  const previousDatePlusOne = index === 0 ? undefined : new Date(previousDate);
  if (previousDatePlusOne) {
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
      if (hasSkipVotingChanged) onSkipVotingChange?.(draftSkipVoting);
      if (hasSkipActionsChanged) onSkipActionsChange?.(draftSkipActions);
      onOpenChange(false);
    }
  };

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <AppButton
          key={index}
          variant={'black'}
          className="max-h-6 min-w-28 px-2"
          onPress={onPress}>
          <Row className="items-center gap-2">
            {showCurrentDayIndicator && <View className="h-1.5 w-1.5 rounded-full bg-red-500" />}
            <FontText className="text-white">
              {buttonLabel || `${dayDate.getMonth() + 1}/${dayDate.getDate()}`}
            </FontText>
          </Row>
        </AppButton>
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />

        <ConvexDialog.Content className="max-w-xl">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />

          <Column className="gap-4">
            <DialogHeader
              text="DAY OPTIONS"
              subtext={
                previousDatePlusOne && followingDateMinusOne
                  ? `Between ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()} and ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}`
                  : previousDatePlusOne
                    ? `After ${previousDatePlusOne.getMonth() + 1}/${previousDatePlusOne.getDate()}`
                    : followingDateMinusOne
                      ? `Before ${followingDateMinusOne.getMonth() + 1}/${followingDateMinusOne.getDate()}`
                      : undefined
              }
            />
            <Column className="gap-2">
              <SmartDateInput
                placeholder="MM/DD/YYYY"
                className="border-subtle-border w-full border p-2"
                value={date}
                onChangeText={setDate}
                onIsValid={setIsDateValid}
                earliestDate={previousDatePlusOne}
                latestDate={followingDateMinusOne}
              />
            </Column>

            {onSkipVotingChange && (
              <Pressable
                onPress={() => setDraftSkipVoting(!draftSkipVoting)}
                className="flex-row items-center gap-3">
                <CustomCheckbox
                  checked={draftSkipVoting}
                  onChange={() => setDraftSkipVoting(!draftSkipVoting)}
                  monochrome
                />
                <FontText className={draftSkipVoting ? '' : 'opacity-70'}>
                  Skip voting for this day
                </FontText>
              </Pressable>
            )}

            {onSkipActionsChange && (
              <Pressable
                onPress={() => setDraftSkipActions(!draftSkipActions)}
                className="flex-row items-center gap-3">
                <CustomCheckbox
                  checked={draftSkipActions}
                  onChange={() => setDraftSkipActions(!draftSkipActions)}
                  monochrome
                />
                <FontText className={draftSkipActions ? '' : 'opacity-70'}>
                  Skip actions for this day
                </FontText>
              </Pressable>
            )}

            {isDateValid ? (
              hasAnyChange ? (
                <AppButton className="w-34 h-10" variant="black" onPress={submitForum}>
                  <FontText color="white" weight="medium">
                    Change
                  </FontText>
                </AppButton>
              ) : (
                <StatusButton buttonText="Change" buttonAltText="No changes" />
              )
            ) : (
              <StatusButton buttonText="Change" buttonAltText="Invalid Date" />
            )}
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default DaySelectionDialog;
