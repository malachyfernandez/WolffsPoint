import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Minus,
  Plus,
  Square,
} from 'lucide-react-native';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';
import SimDateDialog from './SimDateDialog';
import SimTimeDialog from './SimTimeDialog';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { useNow } from 'hooks/useNow';
import { useContentWidth } from 'hooks/useContentWidth';
import {
  getGameScopedKey,
  getCurrentPlayableDayIndex,
  getDayEndDate,
  isHourGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  normalizeGameSchedule,
  defaultGameSchedule,
} from 'utils/multiplayer';
import { stepSimNowDays, stepSimNowHours } from 'utils/simUtils';
import type { SimState } from 'contexts/SimContext';
import { timedGameDayMinutes } from '../../../utils/gameDayDuration';
import { nowMs } from '../../../utils/simNow';

interface SimStripProps {
  simState: SimState;
  onBackToOperator: () => void;
  onSetSimNow: (ms: number | undefined) => void;
  onEndSimulation: () => void;
}

/**
 * Persistent chrome inside simulation mode: marks the whole screen as sim
 * (purple instead of the game's gold), carries the day dial, persona switcher,
 * and the escape hatch back to the live operator view. Reads/writes resolve
 * through the SimProvider redirect, so everything here is sim-scoped.
 */
const SimStrip = ({ simState, onBackToOperator, onSetSimNow, onEndSimulation }: SimStripProps) => {
  const simGameId = simState.simGameId;
  const ownerIds = simState.operatorUserId ? [simState.operatorUserId] : undefined;
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);

  const { value: dayDateStrings } = useSharedListValue<string[]>({
    key: 'dayDatesArray',
    itemId: simGameId,
    defaultValue: [],
    userIds: ownerIds,
  });
  const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({
    key: 'numberOfRealDaysPerInGameDay',
    itemId: simGameId,
    defaultValue: 2,
    userIds: ownerIds,
  });
  const scheduleRecord = useSharedVariableValue({
    key: getGameScopedKey('gameSchedule', simGameId),
    defaultValue: defaultGameSchedule,
    userIds: ownerIds,
  });

  const schedule = normalizeGameSchedule(scheduleRecord.value);
  const gameTimeZone = resolveGameTimeZone(schedule);
  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  // Ticks on the shared clock so the displayed sim time keeps drifting forward
  // at real pace even while nothing else re-renders the strip.
  const simNow = useNow(10_000);
  const currentDayIndex = getCurrentPlayableDayIndex(dayDates, simNow, gameTimeZone);
  const dayCount = dayDates.length;
  const roundMinutes = dayDates[currentDayIndex] && timedGameDayMinutes(dayDates[currentDayIndex]);
  // Hour-game days have no stored duration - the step granularity comes from
  // the current day's real span (until the next start, or the default length
  // for the last day) rather than the schedule's unit setting.
  const currentDaySpanMinutes =
    isHourGameSchedule(schedule) && dayDates[currentDayIndex]
      ? (getDayEndDate(dayDates, currentDayIndex, numberOfRealDaysPerInGameDay).getTime() -
          dayDates[currentDayIndex].getTime()) /
        60_000
      : undefined;
  const minuteSteps =
    schedule.dayDurationUnit === 'minutes' ||
    (roundMinutes !== undefined && roundMinutes < 60) ||
    (currentDaySpanMinutes !== undefined && currentDaySpanMinutes < 60);
  const clockStepLabel = minuteSteps ? '1 MIN' : '1 HR';
  const stepClock = (direction: number) =>
    onSetSimNow(minuteSteps ? nowMs() + direction * 60_000 : stepSimNowHours(undefined, direction));

  // Below this content width the strip switches to the two-row stacked layout.
  const width = useContentWidth();
  const compact = width < 820;
  // Narrower still: LEAVE/END slim down to reduced pills without the "SIM"
  // suffix; much narrower they collapse to icon-only squares.
  const narrow = width < 400;
  const tiny = width < 320;

  return (
    <BlurView
      intensity={20}
      className="w-full rounded-xl border-2 px-3 py-2"
      // z-60: the strip's stacking context must outrank the tab bar and page
      // content, otherwise the date dropdown (z-50 within this context) paints
      // underneath the gold tab row. The dismiss backdrop stays at z-40.
      style={{
        borderColor: '#8a6fc0',
        backgroundColor: 'rgba(91,61,143,0.18)',
        zIndex: 60,
      }}>
      {compact ? (
        /* Narrow screens: two rows - clock controls left, the session action
         *  right. Date row pairs with LEAVE SIM, time row with END SIM. */
        <>
          <Row className="items-center justify-between gap-3">
            {/* Fixed-width chips + side controls keep the two rows' columns
             *  aligned while the group stays left-aligned. */}
            <Row className="flex-1 items-center gap-1.5">
              <Pressable
                accessibilityLabel="Previous date"
                onPress={() => onSetSimNow(stepSimNowDays(undefined, -1))}
                className="h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-black/20">
                <ChevronLeft size={13} color="#fff" />
              </Pressable>
              {/* The dropdown chip is the flex object: it takes whatever space
               *  is left between the steppers and the action pill. */}
              <Pressable
                onPress={() => setDateDialogOpen(true)}
                className="h-10 max-w-32 flex-1 flex-row items-center justify-between gap-1.5 rounded-md border border-white/20 bg-black/20 px-2.5">
                {/* Text block is the shrinkable child (ellipsizes); the
                 *  chevron keeps its fixed glyph size. */}
                <View className="min-w-0 flex-1 items-start overflow-hidden">
                  <FontText
                    weight="bold"
                    numberOfLines={1}
                    className="text-[12px] leading-4 text-white">
                    {simNow.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </FontText>
                  <FontText
                    color="rgba(255,255,255,0.5)"
                    numberOfLines={1}
                    className="text-[9px] leading-3">
                    {dayCount ? `Day ${currentDayIndex + 1} of ${dayCount}` : 'No days'}
                  </FontText>
                </View>
                <ChevronDown size={11} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Pressable
                accessibilityLabel="Next date"
                onPress={() => onSetSimNow(stepSimNowDays(undefined, 1))}
                className="h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-black/20">
                <ChevronRight size={13} color="#fff" />
              </Pressable>
            </Row>
            <StripButton
              icon={<LogOut size={13} color="#fff" />}
              label={tiny ? undefined : narrow ? 'leave' : 'leave sim'}
              onPress={onBackToOperator}
              className={tiny ? 'w-10' : narrow ? 'w-16' : 'w-24'}
              centeredIcon={tiny}
            />
          </Row>
          <Row className="mt-1.5 items-center justify-between gap-3">
            <Row className="flex-1 items-center gap-1.5">
              <StripButton
                icon={<Minus size={15} color="#fff" />}
                label={clockStepLabel}
                onPress={() => stepClock(-1)}
                className="w-10"
                centeredIcon
              />
              <Pressable
                onPress={() => setTimeDialogOpen(true)}
                className="h-10 max-w-32 flex-1 flex-row items-center justify-between gap-1 rounded-md border border-white/20 bg-black/20 px-2.5">
                <FontText
                  weight="bold"
                  numberOfLines={1}
                  className="min-w-0 flex-1 text-[12px] text-white">
                  {simNow.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </FontText>
                <ChevronDown size={11} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <StripButton
                icon={<Plus size={15} color="#fff" />}
                label={clockStepLabel}
                onPress={() => stepClock(1)}
                className="w-10"
                centeredIcon
              />
            </Row>
            <StripButton
              icon={<Square size={13} color="#e08080" />}
              label={tiny ? undefined : narrow ? 'end' : 'end sim'}
              onPress={onEndSimulation}
              className={tiny ? 'w-10' : narrow ? 'w-16' : 'w-24'}
              centeredIcon={tiny}
            />
          </Row>
        </>
      ) : (
        <Row className="items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <View className="rounded-md px-2 py-1" style={{ backgroundColor: '#5b3d8f' }}>
            <FontText weight="bold" className="text-[10px] tracking-[0.12em] text-white">
              ● SIMULATION
            </FontText>
          </View>

          {/* centered clock controls: date steppers + calendar chip, then hour
           *  steppers + clock chip. Every control shares the strip's h-10 pill. */}
          <View
            className="flex-1 flex-row items-center justify-center gap-3"
            style={{ flexWrap: 'wrap' }}>
            <Row className="items-center gap-1.5">
              <Pressable
                accessibilityLabel="Previous date"
                onPress={() => onSetSimNow(stepSimNowDays(undefined, -1))}
                className="h-10 items-center justify-center rounded-md border border-white/20 bg-black/20 px-2">
                <ChevronLeft size={13} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setDateDialogOpen(true)}
                className="h-10 flex-row items-center gap-1.5 rounded-md border border-white/20 bg-black/20 px-2.5">
                <View className="items-center">
                  <FontText weight="bold" className="text-[12px] leading-4 text-white">
                    {simNow.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </FontText>
                  <FontText color="rgba(255,255,255,0.5)" className="text-[9px] leading-3">
                    {dayCount ? `Day ${currentDayIndex + 1} of ${dayCount}` : 'No days'}
                  </FontText>
                </View>
                <ChevronDown size={11} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Pressable
                accessibilityLabel="Next date"
                onPress={() => onSetSimNow(stepSimNowDays(undefined, 1))}
                className="h-10 items-center justify-center rounded-md border border-white/20 bg-black/20 px-2">
                <ChevronRight size={13} color="#fff" />
              </Pressable>
            </Row>

            <View className="mx-1 h-6 w-px bg-white/15" />

            <Row className="items-center gap-1.5">
              <StripButton
                icon={<Minus size={15} color="#fff" />}
                label={clockStepLabel}
                onPress={() => stepClock(-1)}
                centeredIcon
              />
              <Pressable
                onPress={() => setTimeDialogOpen(true)}
                className="h-10 flex-row items-center gap-1 rounded-md border border-white/20 bg-black/20 px-2.5">
                <FontText weight="bold" className="text-[12px] text-white">
                  {simNow.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </FontText>
                <ChevronDown size={11} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <StripButton
                icon={<Plus size={15} color="#fff" />}
                label={clockStepLabel}
                onPress={() => stepClock(1)}
                centeredIcon
              />
            </Row>
          </View>

          {/* stacked icon-over-label actions, same h-10 pill as the clock chips */}
          <Row className="items-center gap-1.5">
            <StripButton
              icon={<LogOut size={13} color="#fff" />}
              label="leave sim"
              onPress={onBackToOperator}
            />
            <StripButton
              icon={<Square size={13} color="#e08080" />}
              label="end sim"
              onPress={onEndSimulation}
            />
          </Row>
        </Row>
      )}
      <SimDateDialog
        isOpen={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        dayDates={dayDates}
        onSetSimNow={onSetSimNow}
      />
      <SimTimeDialog
        isOpen={timeDialogOpen}
        onOpenChange={setTimeDialogOpen}
        onSetSimNow={onSetSimNow}
      />
    </BlurView>
  );
};

/** Icon-over-label strip action - shares the h-10 pill shape with the clock
 *  chips so the whole bar reads as one control row. */
export const StripButton = ({
  icon,
  label,
  onPress,
  className,
  centeredIcon,
}: {
  icon: React.ReactNode;
  /** Omit for an icon-only square (tiny strip widths). */
  label?: string;
  onPress: () => void;
  className?: string;
  /** Icon centered on the full button with the label floating at the bottom
   *  edge - used for the ±1hr steppers. */
  centeredIcon?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    className={`h-10 items-center justify-center rounded-md border border-white/20 bg-black/20 px-2.5 ${className ?? ''}`}>
    {icon}
    {label && centeredIcon ? (
      <View className="absolute bottom-0.5 left-0 right-0 items-center">
        <FontText
          weight="bold"
          color="rgba(255,255,255,0.7)"
          className="leading-2 text-[6px] uppercase tracking-widest">
          {label}
        </FontText>
      </View>
    ) : label ? (
      <FontText
        weight="bold"
        color="rgba(255,255,255,0.7)"
        className="mt-0.5 text-[9px] uppercase leading-3 tracking-wider">
        {label}
      </FontText>
    ) : null}
  </Pressable>
);

export default SimStrip;
