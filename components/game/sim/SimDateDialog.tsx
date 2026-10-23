import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import FontText from '../../ui/text/FontText';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import { useNow } from 'hooks/useNow';
import { simNowForDate } from 'utils/simUtils';

interface SimDateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Game-day dates for the "D{n}" markers on the calendar. */
  dayDates: Date[];
  onSetSimNow: (ms: number | undefined) => void;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Calendar for the simulated date. Day taps apply live (keeping the current
 *  simulated time-of-day), so there's no draft state or save step. */
const SimDateDialog = ({ isOpen, onOpenChange, dayDates, onSetSimNow }: SimDateDialogProps) => {
  const simNow = useNow(1000);
  const [viewMonth, setViewMonth] = useState<Date | null>(null);

  // Reopen on the simulated month, not wherever browsing left off.
  useEffect(() => {
    if (isOpen) setViewMonth(null);
  }, [isOpen]);

  const shownMonth = useMemo(
    () => viewMonth ?? new Date(simNow.getFullYear(), simNow.getMonth(), 1),
    [viewMonth, simNow]
  );

  const shiftMonth = (delta: number) => {
    const base = new Date(shownMonth);
    base.setMonth(base.getMonth() + delta);
    setViewMonth(base);
  };

  const monthLabel = shownMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const gameDayByKey = useMemo(() => {
    const map = new Map<string, number>();
    dayDates.forEach((d, i) => map.set(dateKey(d), i + 1));
    return map;
  }, [dayDates]);

  const selectedKey = dateKey(simNow);
  const todayKey = dateKey(new Date());

  /** Weeks of the shown month, padded with nulls on both ends. */
  const weeks = useMemo(() => {
    const y = shownMonth.getFullYear();
    const m = shownMonth.getMonth();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push(null);
    const last = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= last; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [shownMonth]);

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="max-w-sm">
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader
            text="SIMULATED DATE"
            subtext="What the game thinks today is"
          />
          <Column className="gap-4">

            <View className="border-subtle-border rounded-xl border px-2 py-2">
              <Row className="items-center justify-between px-1 pb-1">
                <Pressable
                  accessibilityLabel="Previous month"
                  onPress={() => shiftMonth(-1)}
                  className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-md">
                  <ChevronLeft size={15} color="#1a1a1a" />
                </Pressable>
                <FontText weight="bold" className="text-sm">
                  {monthLabel}
                </FontText>
                <Pressable
                  accessibilityLabel="Next month"
                  onPress={() => shiftMonth(1)}
                  className="hover:bg-text/10 h-7 w-7 items-center justify-center rounded-md">
                  <ChevronRight size={15} color="#1a1a1a" />
                </Pressable>
              </Row>
              <Row>
                {WEEKDAY_LABELS.map((label, i) => (
                  <View key={i} className="w-10 items-center">
                    <FontText variant="subtext" className="text-[10px]">
                      {label}
                    </FontText>
                  </View>
                ))}
              </Row>
              {weeks.map((week, wi) => (
                <Row key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} className="h-9 w-10" />;
                    const key = dateKey(day);
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    const gameDay = gameDayByKey.get(key);
                    return (
                      <Pressable
                        key={di}
                        onPress={() => {
                          onSetSimNow(simNowForDate(day));
                          onOpenChange(false);
                        }}
                        className={`h-9 w-10 items-center justify-center rounded-md ${
                          isSelected ? 'bg-text' : 'hover:bg-text/10'
                        }`}>
                        <FontText
                          weight={isSelected ? 'bold' : 'regular'}
                          className={`text-[12px] leading-3 ${isSelected ? 'text-text-inverted' : ''}`}
                          color={isSelected ? 'text-inverted' : undefined}>
                          {day.getDate()}
                        </FontText>
                        <View className="h-2.5 items-center justify-center">
                          {gameDay != null ? (
                            <FontText
                              weight="bold"
                              className="text-[8px] leading-2"
                              style={{ color: isSelected ? '#d6cfc2' : '#4a4a4a' }}>
                              {`D${gameDay}`}
                            </FontText>
                          ) : isToday ? (
                            <View
                              className="h-1 w-1 rounded-full"
                              style={{ backgroundColor: isSelected ? '#e8e0d0' : '#8a6fc0' }}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </Row>
              ))}
            </View>

            <Pressable
              onPress={() => {
                onSetSimNow(undefined);
                onOpenChange(false);
              }}
              className="items-center pt-1">
              <FontText variant="subtext" className="text-xs underline">
                Follow real time again
              </FontText>
            </Pressable>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default SimDateDialog;
