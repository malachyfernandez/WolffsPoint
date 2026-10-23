import React, { useState } from 'react';
import { Pressable } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';

import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import FontTimeInput from '../ui/forms/FontTimeInput';
import DialogHeader from '../ui/dialog/DialogHeader';
import SmartDateInput from '../ui/forms/SmartDateInput';
import StatusButton from '../ui/StatusButton';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import { useListSet } from 'hooks/useData';
import CloseButton from '../ui/dialog/CloseButton';
import { nowDate } from 'utils/simNow';
import {
  DEFAULT_HOUR_GAME_DAY_MINUTES,
  hourGameDay,
  serializeGameDayDate,
} from 'utils/gameDayDuration';
import {
  buildScheduledDate,
  defaultGameSchedule,
  getGameScopedKey,
  normalizeGameSchedule,
} from 'utils/multiplayer';
import { getDeviceTimeZone } from 'utils/timezone';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { encodeUserValue } from '../../hooks/userValueSerialization';
import { useToast } from '../../contexts/ToastContext';
import type { GameSchedule } from '../../types/multiplayer';
import { CELL_MODULE_VERSION_KEY, DISPLAY_MODULE_VERSION } from '../../utils/legacySystems';
import {
  docWithFile,
  emptyScriptFilesDoc,
  makeFileId,
  makeFileStatement,
} from '../../utils/scriptFiles';
import { DEFAULT_VOTE_SCRIPT } from '../../types/roleTable';
import { printStatement } from '../../script/lang/printer';

interface NewWolffspointButtonAndDialogueProps {
  onCreate?: (gameId: string) => void;
  condensed?: boolean;
}

type DayMode = 'calendar' | 'hour';

const DEFAULT_MODULAR_RULEBOOK =
  'NavButton({\n  LABEL = "Role Descriptions",\n}) {\n  Folder({\n    PATH = "aboutRole",\n    ID = "folder_about_role",\n    ALIGN = "center",\n    IMAGEHEIGHT = 30,\n    DIVIDERS = true,\n  });\n}';

const DAY_MODE_OPTIONS: { value: DayMode; label: string; description: string }[] = [
  {
    value: 'calendar',
    label: 'Calendar',
    description: 'Each in-game day spans real calendar days with clock deadlines.',
  },
  {
    value: 'hour',
    label: 'Hour Game',
    description: 'Each day starts at a time you set and runs until the next day begins.',
  },
];

const NewWolffspointButtonAndDialogue = ({
  onCreate,
  condensed,
}: NewWolffspointButtonAndDialogueProps) => {
  const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
  const [input, setInput] = useState('');
  const [dayMode, setDayMode] = useState<DayMode>('calendar');
  const [startTime, setStartTime] = useState('05:00');

  const [date, setDate] = useState('');
  const [isDateValid, setIsDateValid] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const { showToast } = useToast();

  // A new game has no schedule yet; the game timezone is seeded from the
  // operator's device when they first open the game's config page.
  const todaysDate = nowDate();

  const setUserListItem = useListSet();
  const setVariable = useMutation(api.user_vars.set);

  const hasUnsavedChanges =
    input.trim() !== '' || date.trim() !== '' || dayMode !== 'calendar' || startTime !== '05:00';

  const resetForm = () => {
    setInput('');
    setDayMode('calendar');
    setStartTime('05:00');
    setDate('');
    setIsDateValid(false);
  };

  const generateGameId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const parseDateString = (dateStr: string): Date => {
    const parts = dateStr.split('/').map(Number);

    // Handle MM/DD format (assume current year)
    if (parts.length === 2) {
      return new Date(nowDate().getFullYear(), parts[0] - 1, parts[1]);
    }

    // Handle MM/DD/YYYY format
    if (parts.length === 3) {
      return new Date(parts[2], parts[0] - 1, parts[1]);
    }

    // Fallback to today if invalid format
    return nowDate();
  };

  const submitForum = async () => {
    if (isCreating) return;
    const finalInput = input || 'WolffsPoint';
    const newGameId = generateGameId();
    const timeZone = getDeviceTimeZone();

    setIsCreating(true);
    try {
      // Await the seeds before navigating: the game page's useList
      // subscribers would see the missing records and could otherwise
      // auto-create defaults over the seed writes in flight.
      const firstDay =
        dayMode === 'hour'
          ? hourGameDay(buildScheduledDate(parseDateString(date || ''), startTime, timeZone), false)
          : parseDateString(date || '');
      const defaultVoteFile = {
        id: makeFileId(),
        path: 'voteMessage/Default Vote',
        kind: 'script' as const,
        source: DEFAULT_VOTE_SCRIPT,
        updatedAt: Date.now(),
      };

      const writes = [
        setVariable({
          key: getGameScopedKey('scriptFiles', newGameId),
          value: encodeUserValue(docWithFile(emptyScriptFilesDoc(), defaultVoteFile)),
          privacy: 'PUBLIC',
        }),
        setUserListItem({
          key: 'voteMessageDefault',
          itemId: newGameId,
          value: printStatement(makeFileStatement(defaultVoteFile)),
          privacy: 'PUBLIC',
        }),
        setVariable({
          key: getGameScopedKey('ruleBook', newGameId),
          value: encodeUserValue({
            content: '',
            modularContent: DEFAULT_MODULAR_RULEBOOK,
            roleOrder: [],
          }),
          privacy: 'PUBLIC',
        }),
        setUserListItem({
          key: 'games',
          itemId: newGameId,
          value: { id: newGameId, name: finalInput, description: '' },
          filterKey: 'id',
          privacy: 'PUBLIC',
        }),
        setUserListItem({
          key: 'dayDatesArray',
          itemId: newGameId,
          value: [serializeGameDayDate(firstDay)],
          privacy: 'PUBLIC',
        }),
      ];

      if (dayMode === 'hour') {
        const schedule: GameSchedule = normalizeGameSchedule({
          ...defaultGameSchedule,
          dayMode: 'hour',
          wakeUpTime: startTime,
          actionDeadlineLeadMinutes: 0,
          voteDeadlineLeadMinutes: 0,
          wakeUpOffsetMinutes: 0,
          timezone: timeZone,
        });
        writes.push(
          setVariable({
            key: getGameScopedKey('gameSchedule', newGameId),
            value: encodeUserValue(schedule),
            privacy: 'PUBLIC',
          }),
          setUserListItem({
            key: 'numberOfRealDaysPerInGameDay',
            itemId: newGameId,
            value: DEFAULT_HOUR_GAME_DAY_MINUTES / 1440,
            privacy: 'PUBLIC',
          })
        );
      }

      await Promise.all(writes);
      // Capability marker last: only after every seed write lands, so a
      // failed create never advertises v2 on a partial game.
      await setUserListItem({
        key: CELL_MODULE_VERSION_KEY,
        itemId: newGameId,
        value: DISPLAY_MODULE_VERSION,
        privacy: 'PUBLIC',
      });

      onCreate?.(newGameId);
      setIsHeroDialogOpen(false);
      resetForm();
    } catch {
      showToast('Could not create the game. Check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
    } else {
      setIsHeroDialogOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    setIsHeroDialogOpen(open);
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    setIsHeroDialogOpen(false);
    resetForm();
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isHeroDialogOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <AppButton variant="secondary" className={condensed ? 'w-26 ' : 'w-42'}>
            <FontText weight="medium">{condensed ? 'New WP' : 'New WolffsPoint'}</FontText>
          </AppButton>
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />

          <ConvexDialog.Content className="max-w-md" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />

            <DialogHeader
              text="Let's get some basics setup"
              subtext="You can change this later."
            />
            <Column className="gap-4">

              <Column className="gap-4">
                <Column className="gap-2">
                  <FontText>Title:</FontText>

                  {/* EXAMPLE USING TEXT INPUT */}
                  <FontTextInput
                    placeholder="WolffsPoint"
                    className="border-subtle-border w-full border p-2"
                    value={input}
                    onChangeText={setInput}
                  />
                </Column>
              </Column>

              <Column className="gap-2">
                <FontText>Day Mode</FontText>
                <Row className="border-subtle-border gap-0 self-start overflow-hidden rounded-lg border">
                  {DAY_MODE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: option.value === dayMode }}
                      onPress={() => setDayMode(option.value)}
                      className={`px-3 py-2 ${option.value === dayMode ? 'bg-text' : 'hover:bg-text/10'}`}>
                      <FontText
                        className="text-sm"
                        color={option.value === dayMode ? 'text-inverted' : undefined}>
                        {option.label}
                      </FontText>
                    </Pressable>
                  ))}
                </Row>
                <FontText variant="subtext" className="text-xs">
                  {DAY_MODE_OPTIONS.find((option) => option.value === dayMode)?.description}
                </FontText>
              </Column>

              <Column className="gap-2">
                <FontText>{dayMode === 'hour' ? 'Day 1 starts on' : 'Day 1 of Your Game'}</FontText>

                {/* EXAMPLE USING TEXT INPUT */}
                <SmartDateInput
                  placeholder="MM/DD/YYYY"
                  className="border-subtle-border w-full border p-2"
                  value={date}
                  onChangeText={setDate}
                  onIsValid={setIsDateValid}
                  earliestDate={todaysDate}
                />
              </Column>

              {dayMode === 'hour' && (
                <Column className="gap-2">
                  <FontText>Day 1 start time</FontText>
                  <FontTimeInput
                    value={startTime}
                    onChangeText={setStartTime}
                    isInDialog
                    className="w-full"
                  />
                </Column>
              )}

              {/* <View></View> */}
              {isDateValid ? (
                <AppButton
                  className="w-34"
                  variant="black"
                  disabled={isCreating}
                  onPress={submitForum}>
                  <FontText color="white" weight="medium">
                    {isCreating ? 'Creating…' : 'Create'}
                  </FontText>
                </AppButton>
              ) : (
                <StatusButton buttonText="Create" className="w-34" buttonAltText="Invalid Date" />
              )}
            </Column>

            {/* <JoinHandler gameCode={gameCode} onClose={() => setIsHeroDialogOpen(false)} onJoin={handleJoin} /> */}
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={() => {
          if (isDateValid) {
            submitForum();
          } else {
            handleConfirmLeave();
          }
        }}
        onDiscard={handleConfirmLeave}
        saveLabel="Create"
      />
    </>
  );
};

export default NewWolffspointButtonAndDialogue;
