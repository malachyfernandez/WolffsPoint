import React, { useState, useEffect, useCallback } from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { useList, useValue } from 'hooks/useData';
import ShadowScrollView from '../../ui/ShadowScrollView';
import DaySelectionDialog from '../../game/DaySelectionDialog';
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
import { isInstantGameDay, serializeGameDayDate } from '../../../utils/gameDayDuration';
import { getZonedDayToken } from 'utils/timezone';
import { nowMs } from 'utils/simNow';

interface DaySelectorProps {
  gameId: string;
  className?: string;
  showAddButton?: boolean;
}

const DaySelector = ({ gameId, className = '', showAddButton = false }: DaySelectorProps) => {
  // Shared selected day index (same as players tab and nightly tab)
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId);

  // Shared number of real days per in-game day (same as players tab and nightly tab)
  const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useList<number>(
    'numberOfRealDaysPerInGameDay',
    gameId
  );

  // Shared day dates array (same as players tab and nightly tab)
  const [dayDatesArray, setDayDatesArray] = useList<string[]>('dayDatesArray', gameId);

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

  // Create a unique key for content based on the day index (not date)
  const getDayKey = (dayIndex: number) => {
    return `day-${dayIndex}`;
  };

  // Expose the current day key and selected index for parent components
  const currentDayKey = getDayKey(selectedDayIndex.value);

  return (
    <Column className={`gap-4 ${className ?? ''}`.trim()}>
      <ShadowScrollView
        direction="horizontal"
        className="mr-1 pt-1"
        scrollViewClassName="px-1 py-5"
        horizontal>
        <Row className="w-full items-center justify-center gap-4">
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
                {showAddButton && (
                  <AppButton
                    variant="filled"
                    className="ml-1 h-6 w-6 min-w-6 rounded-md"
                    onPress={addNewDay}>
                    <FontText weight="bold" className="text-white">
                      +
                    </FontText>
                  </AppButton>
                )}
              </Row>
            </ShadowScrollView>
          </Column>
        </Row>
      </ShadowScrollView>
    </Column>
  );
};

export default DaySelector;
