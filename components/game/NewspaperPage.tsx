import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import NewspaperWritingView from './NewspaperWritingView';
import { usePendingColumnOpen } from 'hooks/usePendingColumnOpen';
import { useList, useValue } from 'hooks/useData';
import ShadowScrollView from '../ui/ShadowScrollView';
import DaySelectionDialog from './DaySelectionDialog';
import FontNumberInput from '../ui/forms/FontNumberInput';
import { GameSchedule } from 'types/multiplayer';
import {
  createNextGameDay,
  getDayRangeLabel,
  parseStoredDayDates,
  defaultGameSchedule,
  getGameScopedKey,
  normalizeGameSchedule,
  resolveGameTimeZone,
  resolveHourDaySequence,
} from 'utils/multiplayer';
import { isInstantGameDay, serializeGameDayDate } from '../../utils/gameDayDuration';
import { getZonedDayToken } from 'utils/timezone';
import { nowMs } from 'utils/simNow';

interface NewspaperPageProps {
  gameId: string;
}

const NewspaperPage = ({ gameId }: NewspaperPageProps) => {
  // Shared selected day index (same as players tab and nightly tab)
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 0,
  });

  // Shared number of real days per in-game day (same as players tab and nightly tab)
  const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useList<number>(
    'numberOfRealDaysPerInGameDay',
    gameId,
    { privacy: 'PUBLIC', defaultValue: 2 }
  );

  // Shared day dates array (same as players tab and nightly tab)
  const [dayDatesArray, setDayDatesArray] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });

  const [gameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
    privacy: 'PUBLIC',
  });
  const gameTimeZone = resolveGameTimeZone(normalizeGameSchedule(gameSchedule.value));

  // "Today" as a calendar token in the shared game zone
  const todayToken = useCallback(() => getZonedDayToken(nowMs(), gameTimeZone), [gameTimeZone]);

  // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
  const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value);

  // Helper: convert Date to MM/DD/YYYY string
  const dateToStorageString = (date: Date): string => {
    return serializeGameDayDate(date);
  };

  // Clean setter that accepts Date[] and handles string conversion internally.
  // Hour-game days re-resolve before serialize so an edited date cascades
  // through the days that inherit it.
  const setFixedDayDatesArray = (dates: Date[]) => {
    setDayDatesArray(resolveHourDaySequence(dates, gameTimeZone).map(dateToStorageString));
  };

  useEffect(() => {
    if (dayDatesArray.value.length === 0 && dayDatesArray.state.isSyncing === false) {
      setFixedDayDatesArray([
        createNextGameDay(
          undefined,
          numberOfRealDaysPerInGameDay.value,
          normalizeGameSchedule(gameSchedule.value)
        ),
      ]);
    }
  }, [
    dayDatesArray,
    setFixedDayDatesArray,
    todayToken,
    gameSchedule.value,
    numberOfRealDaysPerInGameDay.value,
  ]);

  const addNewDay = () => {
    const currentDays = [...fixedDayDatesArray];
    const lastDate = currentDays[currentDays.length - 1];
    const newDate = createNextGameDay(
      lastDate,
      numberOfRealDaysPerInGameDay.value,
      normalizeGameSchedule(gameSchedule.value)
    );
    setFixedDayDatesArray([...currentDays, newDate]);

    // Snap to the newest day
    setSelectedDayIndex(currentDays.length);
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const replaceDayDate = (index: number, replacementDate: Date) => {
    const currentDays = [...fixedDayDatesArray];
    if (index >= 0 && index < currentDays.length) {
      currentDays[index] = replacementDate;
      setFixedDayDatesArray(currentDays);
    }
  };

  // Create a unique key for the newspaper based on the day
  const getNewspaperKey = (dayIndex: number) => {
    if (!fixedDayDatesArray || dayIndex >= fixedDayDatesArray.length) {
      return 'day-0';
    }
    const dayDate = fixedDayDatesArray[dayIndex];
    return `day-${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
  };

  const currentDayKey = getNewspaperKey(selectedDayIndex.value);

  // Minimized column editors restore through here so they survive day switches.
  const { pendingColumnOpen, requestColumnOpen, consumePendingColumnOpen } = usePendingColumnOpen(
    (dayIndex) => setSelectedDayIndex(dayIndex)
  );

  return (
    <Column className="w-full flex-1 gap-4">
      {/* Day Selector Bar - Same as NightlyPageOPERATOR */}
      <ShadowScrollView
        direction="horizontal"
        className="mr-1 pt-1"
        scrollViewClassName="px-1 py-5"
        horizontal>
        <Row className="w-full items-center justify-between gap-4">
          <Column className="flex-1 gap-4">
            <Row className="h-6 gap-4">{/* spacer to align with content */}</Row>
            <Row className="items-center justify-between gap-4 px-4">
              <FontText weight="bold" className="text-lg">
                Day {selectedDayIndex.value + 1}
              </FontText>
              <Row className="gap-2">
                <FontNumberInput
                  value={numberOfRealDaysPerInGameDay.value}
                  onChangeText={(displayValue, isValid, numericValue) => {
                    if (isValid && numericValue !== null) {
                      setNumberOfRealDaysPerInGameDay(numericValue);
                    }
                  }}
                  minValue={1}
                  maxValue={30}
                  inline={true}
                  useDefaultStyling={true}
                />
                <FontText className="text-muted">days/game day</FontText>
              </Row>
            </Row>
          </Column>
          <Column className="max-w-min gap-4">
            <ShadowScrollView
              direction="horizontal"
              className="mr-1 max-w-min pr-1"
              scrollViewClassName="px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              horizontal>
              <Row className="h-6 gap-1">
                {fixedDayDatesArray.map((date, index) =>
                  selectedDayIndex.value === index ? (
                    <DaySelectionDialog
                      key={index}
                      isOpen={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      index={index}
                      dayDate={date}
                      previousDate={index > 0 ? fixedDayDatesArray[index - 1] : todayToken()}
                      followingDate={
                        index < fixedDayDatesArray.length - 1
                          ? fixedDayDatesArray[index + 1]
                          : undefined
                      }
                      onPress={() => setSelectedDayIndex(index)}
                      replaceDayDate={replaceDayDate}
                      timeZone={gameTimeZone}
                      gameId={gameId}
                    />
                  ) : (
                    <AppButton
                      key={index}
                      variant="grey"
                      className="max-h-6 min-w-16 max-w-64 px-2"
                      onPress={() => setSelectedDayIndex(index)}>
                      <FontText className="text-white" numberOfLines={1}>
                        {isInstantGameDay(date)
                          ? getDayRangeLabel(
                              fixedDayDatesArray,
                              index,
                              numberOfRealDaysPerInGameDay.value,
                              gameTimeZone
                            )
                          : `${date.getMonth() + 1}/${date.getDate()}`}
                      </FontText>
                    </AppButton>
                  )
                )}
                <AppButton
                  variant="accent"
                  className="ml-1 max-h-6 min-w-6 max-w-6 rounded-full"
                  onPress={addNewDay}>
                  <FontText weight="bold" className="text-white">
                    +
                  </FontText>
                </AppButton>
              </Row>
            </ShadowScrollView>
          </Column>
        </Row>
      </ShadowScrollView>

      {/* Newspaper Content for Selected Day */}
      <Column className="flex-1 gap-4">
        <NewspaperWritingView
          gameId={`${gameId}-${currentDayKey}`}
          dayIndex={selectedDayIndex.value}
          realGameId={gameId}
          pendingColumnOpen={pendingColumnOpen}
          onRequestColumnOpen={requestColumnOpen}
          onConsumePendingColumnOpen={consumePendingColumnOpen}
        />
      </Column>
    </Column>
  );
};

export default NewspaperPage;
