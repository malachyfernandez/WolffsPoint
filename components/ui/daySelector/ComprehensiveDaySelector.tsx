import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { useList, useValue } from 'hooks/useData';
import ShadowScrollView from '../../ui/ShadowScrollView';
import DaySelectionDialog from '../../game/DaySelectionDialog';
import ChooseDayDialog from '../../game/ChooseDayDialog';
import DayButton from './DayButton';
import { GameSchedule } from 'types/multiplayer';
import {
  defaultGameSchedule,
  createNextGameDay,
  getCurrentPlayableDayIndex,
  getDayRangeLabel,
  getGameScopedKey,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  resolveHourDaySequence,
} from 'utils/multiplayer';
import { getZonedDayToken } from 'utils/timezone';
import { nowMs } from 'utils/simNow';
import { useNow } from 'hooks/useNow';
import { serializeGameDayDate, type GameDayUnit } from '../../../utils/gameDayDuration';

export type DaySelectorMode = 'player' | 'nightly' | 'newspaper';

interface ComprehensiveDaySelectorProps {
  gameId: string;
  showAddButton?: boolean;
  showInitialSetupDialog?: boolean;
}

const ComprehensiveDaySelector = ({
  gameId,
  showAddButton = false,
  showInitialSetupDialog = false,
}: ComprehensiveDaySelectorProps) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Shared selected day index
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId);

  // Number of real days per in-game day
  const [numberOfRealDaysPerInGameDay] = useList<number>('numberOfRealDaysPerInGameDay', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 2,
    autoCreate: false,
  });

  const [hasCompletedInitialDaySetup, setHasCompletedInitialDaySetup] = useList<boolean>(
    'hasCompletedInitialDaySetup',
    gameId,
    { privacy: 'PUBLIC', defaultValue: false, autoCreate: false }
  );

  // Shared day dates array
  const [dayDatesArray, setDayDatesArray] = useList<string[]>('dayDatesArray', gameId);

  // Per-day skip flags (arrays of day indices)
  const [skipVotingDays, setSkipVotingDays] = useList<number[]>('skipVotingDays', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
    autoCreate: false,
  });
  const [skipActionsDays, setSkipActionsDays] = useList<number[]>('skipActionsDays', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
    autoCreate: false,
  });

  const [gameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
    privacy: 'PUBLIC',
    autoCreate: false,
  });
  const schedule = normalizeGameSchedule(gameSchedule.value);
  const gameTimeZone = resolveGameTimeZone(schedule);

  // "Today" as a calendar token in the shared game zone
  const todayToken = () => getZonedDayToken(nowMs(), gameTimeZone);

  // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
  const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value);
  // Ticking clock so the current-day dot follows the (possibly simulated) time
  // instead of freezing at whatever render happened to compute it last.
  const now = useNow(10_000);
  const currentPlayableDayIndex = getCurrentPlayableDayIndex(fixedDayDatesArray, now, gameTimeZone);

  // Measured chip geometry (hour-game and timed labels are far wider than the
  // old fixed estimate, so auto-scroll must use real layouts, not guesses).
  const chipLayoutsRef = useRef(new Map<number, { x: number; width: number }>());
  const scrollLeftRef = useRef(0);
  const scrollViewportWidthRef = useRef(0);

  // Clean setter that accepts Date[] and handles string conversion internally.
  // Hour-game days re-resolve before serialize so an edited date cascades
  // through the days that inherit it.
  const setFixedDayDatesArray = useCallback(
    (dates: Date[]) => {
      setDayDatesArray(resolveHourDaySequence(dates, gameTimeZone).map(serializeGameDayDate));
    },
    [setDayDatesArray, gameTimeZone]
  );

  useEffect(() => {
    if (
      dayDatesArray.value.length > 0 &&
      hasCompletedInitialDaySetup.state.isSyncing === false &&
      hasCompletedInitialDaySetup.value === false
    ) {
      setHasCompletedInitialDaySetup(true);
    }
  }, [
    dayDatesArray.value.length,
    hasCompletedInitialDaySetup.state.isSyncing,
    hasCompletedInitialDaySetup.value,
    setHasCompletedInitialDaySetup,
  ]);

  // Auto-scroll to selected day, but only enough to bring it into view.
  useEffect(() => {
    if (
      !scrollViewRef.current ||
      selectedDayIndex.value === undefined ||
      fixedDayDatesArray.length === 0
    ) {
      return;
    }
    const chip = chipLayoutsRef.current.get(selectedDayIndex.value);
    const viewport = scrollViewportWidthRef.current;
    if (!chip || viewport <= 0) return;
    const pad = 8;
    const left = scrollLeftRef.current;
    const right = left + viewport;
    if (chip.x < left) {
      scrollViewRef.current.scrollTo({ x: Math.max(0, chip.x - pad), animated: true });
    } else if (chip.x + chip.width > right) {
      scrollViewRef.current.scrollTo({
        x: chip.x + chip.width - viewport + pad,
        animated: true,
      });
    }
  }, [selectedDayIndex.value, fixedDayDatesArray.length]);

  const addNewDay = (customDaysPerGameDay?: number) => {
    const currentDays = [...fixedDayDatesArray];
    const daysToAdd = customDaysPerGameDay ?? numberOfRealDaysPerInGameDay.value;
    if (currentDays.length === 0) {
      const firstDay = createNextGameDay(undefined, daysToAdd, schedule);
      setFixedDayDatesArray([firstDay]);
      setSelectedDayIndex(0);
      setHasCompletedInitialDaySetup(true);
      return;
    }
    const lastDate = currentDays[currentDays.length - 1];
    const newDate = createNextGameDay(lastDate, daysToAdd, schedule);
    setFixedDayDatesArray([...currentDays, newDate]);

    // Snap to the newest day
    setSelectedDayIndex(currentDays.length);
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);

  useEffect(() => {
    if (
      showInitialSetupDialog &&
      dayDatesArray.state.isSyncing === false &&
      hasCompletedInitialDaySetup.state.isSyncing === false &&
      dayDatesArray.value.length === 0 &&
      hasCompletedInitialDaySetup.value === false
    ) {
      setIsChooseDayDialogOpen(true);
    }
  }, [
    dayDatesArray.state.isSyncing,
    dayDatesArray.value.length,
    hasCompletedInitialDaySetup.state.isSyncing,
    hasCompletedInitialDaySetup.value,
    showInitialSetupDialog,
  ]);

  const replaceDayDate = (index: number, replacementDate: Date) => {
    const currentDays = [...fixedDayDatesArray];
    if (index >= 0 && index < currentDays.length) {
      currentDays[index] = replacementDate;
      setFixedDayDatesArray(currentDays);
    }
  };

  const toggleSkipVoting = (index: number, skip: boolean) => {
    const current = skipVotingDays.value ?? [];
    if (skip) {
      if (!current.includes(index)) setSkipVotingDays([...current, index]);
    } else {
      setSkipVotingDays(current.filter((i) => i !== index));
    }
  };

  const toggleSkipActions = (index: number, skip: boolean) => {
    const current = skipActionsDays.value ?? [];
    if (skip) {
      if (!current.includes(index)) setSkipActionsDays([...current, index]);
    } else {
      setSkipActionsDays(current.filter((i) => i !== index));
    }
  };

  const handleDaySelect = (index: number) => {
    setSelectedDayIndex(index);
  };

  const handleAddNewDay = () => {
    if (showAddButton === false) {
      return;
    }

    if (fixedDayDatesArray.length === 0 && showInitialSetupDialog) {
      setIsChooseDayDialogOpen(true);
      return;
    }

    addNewDay();
  };

  const handleInitialDaySetupSubmit = (daysPerGameDay: number, unit?: GameDayUnit) => {
    if (fixedDayDatesArray.length === 0) {
      setFixedDayDatesArray([
        createNextGameDay(undefined, daysPerGameDay, {
          ...schedule,
          dayDurationUnit: unit ?? schedule.dayDurationUnit,
        }),
      ]);
      setSelectedDayIndex(0);
    }

    if (daysPerGameDay !== numberOfRealDaysPerInGameDay.value && fixedDayDatesArray.length > 0) {
      setSelectedDayIndex(Math.min(selectedDayIndex.value, fixedDayDatesArray.length - 1));
    }

    setHasCompletedInitialDaySetup(true);
  };

  // Create a unique key for content based on the day index
  const getDayKey = (dayIndex: number) => {
    return `day-${dayIndex}`;
  };

  return (
    <Column className="gap-2.5">
      <ShadowScrollView
        direction="horizontal"
        className="-mb-3 -mt-1 mr-1 max-w-min pr-1"
        scrollViewClassName="px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        ref={scrollViewRef}
        onScroll={(e: any) => {
          scrollLeftRef.current = e.nativeEvent.contentOffset.x;
        }}
        onLayout={(e: any) => {
          scrollViewportWidthRef.current = e.nativeEvent.layout.width;
        }}
        scrollEventThrottle={16}
        horizontal>
        <Row className="h-6 gap-1">
          {showAddButton && (
            <AppButton
              variant="filled"
              className="h-6! mx-1 w-6 min-w-6 rounded-full"
              onPress={handleAddNewDay}>
              <FontText weight="bold" className="text-white">
                +
              </FontText>
            </AppButton>
          )}
          {fixedDayDatesArray
            .slice()
            .reverse()
            .map((date, reverseIndex) => {
              const index = fixedDayDatesArray.length - 1 - reverseIndex;
              const isCurrentDay = index === currentPlayableDayIndex;
              const isSelected = selectedDayIndex.value === index;
              const label = getDayRangeLabel(
                fixedDayDatesArray,
                index,
                numberOfRealDaysPerInGameDay.value,
                gameTimeZone
              );

              const chip = isSelected ? (
                <DayButton
                  date={date}
                  index={index}
                  label={label}
                  isSelected={true}
                  showCurrentDayIndicator={isCurrentDay}
                  onPress={() => handleDaySelect(index)}>
                  <DaySelectionDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    index={index}
                    dayDate={date}
                    buttonLabel={label}
                    previousDate={index > 0 ? fixedDayDatesArray[index - 1] : todayToken()}
                    followingDate={
                      index < fixedDayDatesArray.length - 1
                        ? fixedDayDatesArray[index + 1]
                        : undefined
                    }
                    onPress={() => handleDaySelect(index)}
                    replaceDayDate={replaceDayDate}
                    timeZone={gameTimeZone}
                    showCurrentDayIndicator={isCurrentDay}
                    skipVoting={(skipVotingDays.value ?? []).includes(index)}
                    skipActions={(skipActionsDays.value ?? []).includes(index)}
                    onSkipVotingChange={(skip) => toggleSkipVoting(index, skip)}
                    onSkipActionsChange={(skip) => toggleSkipActions(index, skip)}
                    gameId={gameId}
                  />
                </DayButton>
              ) : (
                <DayButton
                  date={date}
                  index={index}
                  label={label}
                  isSelected={false}
                  showCurrentDayIndicator={isCurrentDay}
                  onPress={() => handleDaySelect(index)}
                />
              );

              return (
                <View
                  key={index}
                  onLayout={(e) => {
                    chipLayoutsRef.current.set(index, {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    });
                  }}>
                  {chip}
                </View>
              );
            })}
        </Row>
      </ShadowScrollView>

      {/* ChooseDayDialog for initial setup */}
      <ChooseDayDialog
        isOpen={isChooseDayDialogOpen}
        onOpenChange={setIsChooseDayDialogOpen}
        gameId={gameId}
        onSubmitDaysValue={handleInitialDaySetupSubmit}
      />
    </Column>
  );
};

export default ComprehensiveDaySelector;
