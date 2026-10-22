import React, { useEffect, useRef, useState } from 'react';
import { useList, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import ShadowScrollView from '../ui/ShadowScrollView';
import DaySelectionDialog from './DaySelectionDialog';
import ChooseDayDialog from './ChooseDayDialog';
import DaysTable from './DaysTable';
import {
  defaultGameSchedule,
  getDayRangeLabel,
  getGameScopedKey,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  resolveHourDaySequence,
} from 'utils/multiplayer';
import { getZonedDayToken } from 'utils/timezone';
import { GameSchedule } from 'types/multiplayer';
import { nowMs } from 'utils/simNow';
import { serializeGameDayDate } from '../../utils/gameDayDuration';

interface PlayerDaysSectionProps {
  gameId: string;
  addNewDay: (customDaysPerGameDay?: number) => void;
}

const PlayerDaysSection = ({ gameId, addNewDay }: PlayerDaysSectionProps) => {
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 0,
  });
  const [numberOfRealDaysPerInGameDay] = useList<number>('numberOfRealDaysPerInGameDay', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 2,
  });
  const [dayDatesArray, setDayDatesArray] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [gameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
    privacy: 'PUBLIC',
  });
  const gameTimeZone = resolveGameTimeZone(normalizeGameSchedule(gameSchedule.value));

  const fixedDayDatesArray = parseStoredDayDates(dayDatesArray?.value ?? []);

  const dateToStorageString = (date: Date): string => {
    return serializeGameDayDate(date);
  };

  const setFixedDayDatesArray = (dates: Date[]) => {
    setDayDatesArray(resolveHourDaySequence(dates, gameTimeZone).map(dateToStorageString));
  };

  const [daysTableWidth, setDaysTableWidth] = useState(320);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);
  const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
  const previousDayCountRef = useRef(fixedDayDatesArray.length);

  useEffect(() => {
    if (fixedDayDatesArray.length > previousDayCountRef.current) {
      setSelectedDayIndex(fixedDayDatesArray.length - 1);
    }

    if (
      fixedDayDatesArray.length > 0 &&
      (selectedDayIndex?.value ?? 0) > fixedDayDatesArray.length - 1
    ) {
      setSelectedDayIndex(fixedDayDatesArray.length - 1);
    }

    previousDayCountRef.current = fixedDayDatesArray.length;
  }, [fixedDayDatesArray.length, selectedDayIndex?.value, setSelectedDayIndex]);

  const replaceDayDate = (index: number, replacementDate: Date) => {
    const currentDays = [...fixedDayDatesArray];
    if (index >= 0 && index < currentDays.length) {
      currentDays[index] = replacementDate;
      setFixedDayDatesArray(currentDays);
    }
  };

  const handleAddNewDay = () => {
    addNewDay(numberOfRealDaysPerInGameDay?.value ?? 2);
  };

  return (
    <>
      <Column className="gap-1">
        <ShadowScrollView
          direction="horizontal"
          className="mr-1 max-w-min pr-1"
          scrollViewClassName="px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ width: daysTableWidth }}
          horizontal>
          <Row className="h-6 gap-1">
            {fixedDayDatesArray.map((date, index) => {
              const label = getDayRangeLabel(
                fixedDayDatesArray,
                index,
                numberOfRealDaysPerInGameDay?.value ?? 2,
                gameTimeZone
              );

              return (selectedDayIndex?.value ?? 0) === index ? (
                <DaySelectionDialog
                  key={index}
                  isOpen={isDialogOpen}
                  onOpenChange={setIsDialogOpen}
                  index={index}
                  dayDate={date}
                  buttonLabel={label}
                  previousDate={
                    index > 0
                      ? fixedDayDatesArray[index - 1]
                      : getZonedDayToken(nowMs(), gameTimeZone)
                  }
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
                  className="max-h-6 min-w-28 max-w-64 px-2"
                  onPress={() => setSelectedDayIndex(index)}>
                  <FontText className="text-white" numberOfLines={1}>
                    {label}
                  </FontText>
                </AppButton>
              );
            })}
            <AppButton
              variant="accent"
              className="ml-1 max-h-6 min-w-6 max-w-6 rounded-full"
              onPress={handleAddNewDay}>
              <FontText weight="bold" className="text-white">
                +
              </FontText>
            </AppButton>
          </Row>
        </ShadowScrollView>
        <Row className={`${isDaysTableBeingEdited ? 'z-10' : ''}gap-4 w-min max-w-min`}>
          <DaysTable
            gameId={gameId}
            dayNumber={selectedDayIndex?.value ?? 0}
            dayCount={fixedDayDatesArray.length}
            isBeingEdited={isDaysTableBeingEdited}
            setIsBeingEdited={setIsDaysTableBeingEdited}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setDaysTableWidth(width);
            }}
            onWidthChange={(width) => {
              setDaysTableWidth(width);
            }}
          />
        </Row>
      </Column>

      <ChooseDayDialog
        isOpen={isChooseDayDialogOpen}
        onOpenChange={setIsChooseDayDialogOpen}
        gameId={gameId}
        onSubmitDaysValue={(daysPerGameDay) => addNewDay(daysPerGameDay)}
      />
    </>
  );
};

export default PlayerDaysSection;
