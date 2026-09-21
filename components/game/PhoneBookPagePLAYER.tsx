import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useValue, useFindValues, useFindListItems } from 'hooks/useData';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import { useDialogGuildedVariant } from 'hooks/useDialogGuildedVariant';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { PlayerProfile } from 'types/multiplayer';
import { UserTableItem } from 'types/playerTable';
import {
  buildScheduledDate,
  buildScheduledDateOnInstantDay,
  getCurrentPlayableDayIndex,
  getDayEndDate,
  getGameScopedKey,
  isDayReleasedAtTime,
  isNightWindowOpen,
  normalizeGameSchedule,
  parseStoredDayDates,
  resolveGameTimeZone,
  defaultGameSchedule,
} from 'utils/multiplayer';
import { getNewserAssignmentKey, NewserAssignment } from 'utils/newspaperControl';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import Column from '../layout/Column';
import MasonryGrid from '../layout/MasonryGrid';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import LoadingContainer from '../ui/loading/LoadingContainer';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
import PlayerProfilePreviewCard from './PlayerProfilePreviewCard';
import PlaceholderCard from '../ui/PlaceholderCard';
import ShadowScrollView from '../ui/ShadowScrollView';
import PaperTextureOverlay from '../ui/PaperTextureOverlay';
import PrintRule from '../ui/PrintRule';
import { Moon } from 'lucide-react-native';

interface PhoneBookPagePLAYERProps {
  gameId: string;
  currentUserId: string;
  currentEmail: string;
}

// Deterministic slight tilts so the directory cards look hand-placed.
const CARD_TILTS = [-0.5, 0.4, -0.3, 0.6, -0.6, 0.3];

// Simple container component - just manages the dialog and layout
const PhoneBookPagePLAYER = ({ gameId, currentUserId, currentEmail }: PhoneBookPagePLAYERProps) => {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const frameVariant = useDialogGuildedVariant();
  const profileKey = getGameScopedKey('playerProfile', gameId);
  const [myProfile, setMyProfile] = useValue<PlayerProfile>(profileKey, {
    defaultValue: {
      gameId,
      email: currentEmail,
      userId: currentUserId,
      inGameName: '',
      profileImageUrl: '',
      phoneNumber: '',
      instagram: '',
      discord: '',
      otherContact: '',
      bioMarkdown: '',
      claimedAt: 0,
    },
    privacy: 'PUBLIC',
    searchKeys: ['inGameName', 'bioMarkdown'],
    sortKey: 'inGameName',
  });
  const initialProfileValue = useMemo(
    () => ({
      ...myProfile.value,
      gameId,
      email: currentEmail,
      userId: currentUserId,
    }),
    [currentEmail, currentUserId, gameId, myProfile.value]
  );

  const {
    players,
    isLoading: isPhoneBookLoading,
    aliveCount,
    totalCount,
  } = useAllPlayers({ gameId });
  const { isSleepWindow, isLoading: isSleepWindowLoading } = useSleepWindow({ gameId });

  const { width } = useWindowDimensions();
  const showEditButton = width >= 440;

  return (
    <LoadingContainer
      dependencies={[myProfile, !isPhoneBookLoading, !isSleepWindowLoading]}
      loadingText="Loading phone book"
      className="min-h-190 flex-1">
      <Column className="flex-1 gap-6 py-3 sm:px-4">
        <PhoneBookHeader
          onEditProfile={() => setIsProfileDialogOpen(true)}
          aliveCount={aliveCount}
          totalCount={totalCount}
          isSleepWindow={isSleepWindow}
        />
        <MyProfileCard profile={initialProfileValue} onPress={() => setIsProfileDialogOpen(true)} />
        {!showEditButton && (
          <Row className="-mt-2">
            <AppButton
              variant="accent"
              className="w-full"
              onPress={() => setIsProfileDialogOpen(true)}>
              <FontText weight="medium" color="white">
                Edit profile
              </FontText>
            </AppButton>
          </Row>
        )}
        {isSleepWindow ? (
          <PlaceholderCard>
            <Column className="items-center gap-3">
              <Moon size={48} color="rgb(46, 41, 37)" />
              <FontText weight="bold" className="text-center text-xl">
                You can&apos;t see alive players until the morning
              </FontText>
            </Column>
          </PlaceholderCard>
        ) : (
          <PhoneBookGrid gameId={gameId} players={players} />
        )}

        <PlayerProfileDialog
          initialValue={initialProfileValue}
          isOpen={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          onSave={setMyProfile}
          title="Edit your profile"
          frameVariant={frameVariant}
          historyKey={`playerProfile:${gameId}:${currentUserId}`}
        />
      </Column>
    </LoadingContainer>
  );
};

// My Profile Card component - displays current user's profile as a clickable button
const MyProfileCard = ({ profile, onPress }: { profile: PlayerProfile; onPress: () => void }) => {
  const displayName = profile.inGameName || 'Your Profile';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={onPress}
      className="border-border/30 hover:bg-text/5 w-full rounded-[3px] border bg-[#b0a999] p-4 transition-colors"
      style={{ boxShadow: '0px 3px 8px rgba(20, 15, 8, 0.22)' }}>
      <PaperTextureOverlay opacity={0.35} borderRadius={3} />
      <Row className="items-center gap-4">
        {profile.profileImageUrl ? (
          <Image
            source={{ uri: profile.profileImageUrl }}
            className="border-border/40 h-16 w-16 rounded-[3px] border"
            resizeMode="cover"
          />
        ) : (
          <View className="border-border/40 h-16 w-16 items-center justify-center rounded-[3px] border bg-white">
            <FontText weight="bold" className="text-lg">
              {initials}
            </FontText>
          </View>
        )}
        <Column className="flex-1 gap-4">
          <FontText weight="medium" className="text-lg">
            {displayName}
          </FontText>
          {profile.bioMarkdown?.trim() ? (
            <View style={{ pointerEvents: 'none' }}>
              <ShadowScrollView className="max-h-20">
                <MarkdownRenderer markdown={profile.bioMarkdown} className="text-sm opacity-75" />
              </ShadowScrollView>
            </View>
          ) : (
            <FontText variant="subtext" className="text-sm">
              Tap to edit your profile
            </FontText>
          )}
        </Column>
      </Row>
    </Pressable>
  );
};

// Header component - just manages the header layout and button
const PhoneBookHeader = ({
  onEditProfile,
  aliveCount,
  totalCount,
  isSleepWindow,
}: {
  onEditProfile: () => void;
  aliveCount: number;
  totalCount: number;
  isSleepWindow: boolean;
}) => {
  const { width } = useWindowDimensions();
  const showEditButton = width >= 440;

  return (
    <Column className="gap-3">
      <Row className="items-center justify-between gap-4">
        <Column className="gap-0">
          <>
            <FontText weight="bold" className="text-xl uppercase tracking-widest">
              Phone Book
            </FontText>
            <FontText variant="subtext" style={{ fontStyle: 'italic' }}>
              {isSleepWindow
                ? "You can't see alive players until the morning"
                : `${aliveCount}/${totalCount} players alive`}
            </FontText>
          </>
        </Column>
        {showEditButton && (
          <AppButton variant="accent" className="w-40" onPress={onEditProfile}>
            <FontText weight="medium" color="white">
              Edit profile
            </FontText>
          </AppButton>
        )}
      </Row>
      <PrintRule />
    </Column>
  );
};

// Grid component - renders players passed from parent
const PhoneBookGrid = ({
  gameId,
  players,
}: {
  gameId: string;
  players: { userId: string; email: string; isDead?: boolean }[];
}) => {
  const [readyCount, setReadyCount] = useState(0);
  const [readyKey, setReadyKey] = useState(0);
  const reportedRef = useRef(new Set<string>());
  const opacity = useSharedValue(0);

  const playerIdsStr = players.map((p) => p.userId).join(',');

  useEffect(() => {
    reportedRef.current = new Set();
    setReadyCount(0);
    setReadyKey((k) => k + 1);
  }, [playerIdsStr]);

  const markReady = useCallback((userId: string) => {
    if (!reportedRef.current.has(userId)) {
      reportedRef.current.add(userId);
      setReadyCount((c) => c + 1);
    }
  }, []);

  const allReady = players.length > 0 && readyCount >= players.length;

  useEffect(() => {
    if (allReady) {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [allReady, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (players.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Column className="bg-text/5 items-center gap-4 rounded-[3px] p-8">
          <FontText variant="subtext" className="text-center">
            No players in this game yet.
          </FontText>
        </Column>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 400 }}>
      {!allReady && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}>
          <LoadingText text="Loading players" />
        </View>
      )}
      <Animated.View style={animatedStyle}>
        <MasonryGrid
          items={players}
          keyExtractor={(player) => `${player.userId}-${player.email}-${readyKey}`}
          renderItem={(player, index) => (
            <PlayerCard
              userId={player.userId}
              gameId={gameId}
              email={player.email}
              isDead={player.isDead}
              index={index}
              onReady={markReady}
            />
          )}
        />
      </Animated.View>
    </View>
  );
};

// Hook to get all player profiles
const useAllProfiles = ({ gameId }: { gameId: string }) => {
  const profileKey = getGameScopedKey('playerProfile', gameId);
  const profiles = useFindValues<PlayerProfile>(profileKey, {
    returnTop: 200,
  });

  return profiles?.map((record: any) => record.value) || [];
};

// Hook to get all players - filters by operator's userTable + newser, waits for all data to load
const useAllPlayers = ({ gameId }: { gameId: string }) => {
  const profiles = useAllProfiles({ gameId });
  const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
  const operatorUserTableRecords = useFindListItems<UserTableItem[]>('userTable', {
    itemId: gameId,
    userIds: operatorUserId ? [operatorUserId] : undefined,
    returnTop: 1,
  });
  const userTable = operatorUserTableRecords?.[0]?.value ?? [];
  const newserAssignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
    returnTop: 1,
    userIds: operatorUserId ? [operatorUserId] : undefined,
  });
  const newserAssignment = newserAssignmentRecords?.[0]?.value ?? {
    email: '',
    userId: '',
    assignedAt: 0,
  };
  const newserEmail = newserAssignment.email?.trim()?.toLowerCase() ?? '';
  const newserUserId = newserAssignment.userId?.trim() ?? '';

  // Alive count: userTable players only, excluding the newser and the operator
  const countablePlayers = userTable.filter((u: UserTableItem) => {
    const email = u.email?.trim()?.toLowerCase();
    if (newserEmail && email === newserEmail) return false;
    if (newserUserId && u.userId === newserUserId) return false;
    if (operatorUserId && u.userId === operatorUserId) return false;
    return true;
  });
  const totalCount = countablePlayers.length;
  const aliveCount = countablePlayers.filter(
    (u: UserTableItem) => u.playerData?.livingState === 'alive'
  ).length;

  // Loading check: wait for all data sources
  const isUserTableLoading = operatorUserTableRecords === undefined || isOperatorLoading;
  const isProfilesLoading = profiles === undefined;
  const isNewserLoading = newserAssignmentRecords === undefined;
  const isLoading = isUserTableLoading || isProfilesLoading || isNewserLoading;

  // Build allowed emails from userTable + newser
  const allowedEmails = new Set<string>([
    ...userTable
      .map((u: UserTableItem) => u.email?.trim()?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
    ...(newserEmail ? [newserEmail] : []),
  ]);

  // Combine profiles and table users
  const allUserIds = new Set([
    ...profiles.map((p: PlayerProfile) => p.userId),
    ...userTable.map((u: UserTableItem) => u.userId),
  ]);

  const players = Array.from(allUserIds)
    .map((userId) => ({
      userId,
      email:
        profiles.find((p: PlayerProfile) => p.userId === userId)?.email ||
        userTable.find((u: UserTableItem) => u.userId === userId)?.email ||
        '',
      isDead:
        userTable.find((u: UserTableItem) => u.userId === userId)?.playerData?.livingState ===
        'dead',
    }))
    .filter((player) => {
      const playerEmail = player.email.trim().toLowerCase();
      return allowedEmails.has(playerEmail);
    })
    .sort((a, b) => a.email.localeCompare(b.email));

  return { players, isLoading, aliveCount, totalCount };
};

// Sleep window logic - copied verbatim from YourEyesOnlyPagePLAYER ("Go to sleep, man." screen).
// When isSleepWindow is true, the phone book is closed until morning.
const useSleepWindow = ({ gameId }: { gameId: string }) => {
  const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
  const operatorUserIds = operatorUserId ? [operatorUserId] : undefined;
  const { value: dayDateStrings, record: dayDateStringsRecord } = useSharedListValue<string[]>({
    key: 'dayDatesArray',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: numberOfRealDaysPerInGameDay, isLoading: isNumberOfRealDaysLoading } =
    useSharedListValue<number>({
      key: 'numberOfRealDaysPerInGameDay',
      itemId: gameId,
      defaultValue: 2,
      userIds: operatorUserIds,
    });
  const scheduleRecord = useSharedVariableValue({
    key: getGameScopedKey('gameSchedule', gameId),
    defaultValue: defaultGameSchedule,
    userIds: operatorUserIds,
  });
  const [now, setNow] = useState(() => new Date());

  const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
  const gameTimeZone = resolveGameTimeZone(schedule);
  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const currentDayIndex = useMemo(
    () => getCurrentPlayableDayIndex(dayDates, new Date(), gameTimeZone),
    [dayDates, gameTimeZone]
  );
  const currentDayStartDate = dayDates[currentDayIndex];
  const deadlineDayIndex =
    currentDayIndex > 0 &&
    currentDayStartDate &&
    !isDayReleasedAtTime(currentDayStartDate, schedule.wakeUpTime, now, gameTimeZone)
      ? currentDayIndex - 1
      : currentDayIndex;
  const deadlineDayEndDate = getDayEndDate(
    dayDates,
    deadlineDayIndex,
    numberOfRealDaysPerInGameDay
  );
  const voteDeadlineBaseDate = new Date(
    deadlineDayEndDate.getTime() - (schedule.voteDayOffset ?? 0) * 24 * 60 * 60 * 1000
  );
  const actionDeadlineBaseDate = new Date(
    deadlineDayEndDate.getTime() - (schedule.actionDayOffset ?? 0) * 24 * 60 * 60 * 1000
  );
  const voteDeadlineTime =
    schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
  const actionDeadlineTime =
    schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';
  const voteDeadline = buildScheduledDate(voteDeadlineBaseDate, voteDeadlineTime, gameTimeZone);
  const actionDeadline = buildScheduledDate(
    actionDeadlineBaseDate,
    actionDeadlineTime,
    gameTimeZone
  );
  const laterDeadline =
    voteDeadline.getTime() >= actionDeadline.getTime() ? voteDeadline : actionDeadline;
  const sameDayWakeUp = buildScheduledDateOnInstantDay(
    laterDeadline,
    schedule.wakeUpTime,
    gameTimeZone
  );
  const nextWakeUp =
    sameDayWakeUp.getTime() > laterDeadline.getTime()
      ? sameDayWakeUp
      : buildScheduledDateOnInstantDay(laterDeadline, schedule.wakeUpTime, gameTimeZone, 1);
  const isVoteLocked =
    deadlineDayIndex < currentDayIndex ||
    !isNightWindowOpen(voteDeadlineBaseDate, voteDeadlineTime, now, gameTimeZone);
  const isActionLocked =
    deadlineDayIndex < currentDayIndex ||
    !isNightWindowOpen(actionDeadlineBaseDate, actionDeadlineTime, now, gameTimeZone);
  const isSleepWindow =
    dayDates.length > 0 && isVoteLocked && isActionLocked && now.getTime() < nextWakeUp.getTime();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000); // Update every second

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const isLoading =
    dayDateStringsRecord === undefined ||
    isNumberOfRealDaysLoading ||
    scheduleRecord.record === undefined ||
    isOperatorLoading;

  return { isSleepWindow, isLoading };
};

// Individual player card - subscribes to its own data
const PlayerCard = ({
  userId,
  gameId,
  email,
  isDead = false,
  index = 0,
  onReady,
}: {
  userId: string;
  gameId: string;
  email?: string;
  isDead?: boolean;
  index?: number;
  onReady?: (userId: string) => void;
}) => {
  const identity = useTownSquareAuthorIdentity({ gameId, userId });
  const { profile, isLoading: isProfileLoading } = usePlayerProfile({ userId, gameId });

  const isReady = !identity.isLoading && !isProfileLoading;

  useEffect(() => {
    if (isReady) {
      onReady?.(userId);
    }
  }, [isReady, onReady, userId]);

  // Audit: hide cards with no valid identity data (orphaned profiles)
  const hasValidData =
    (identity.displayName &&
      identity.displayName !== 'Unknown' &&
      identity.displayName.trim().length > 0) ||
    (profile && profile.inGameName && profile.inGameName.trim().length > 0);

  if (!hasValidData) {
    return null;
  }

  // Check if identity data is still loading (has '?' as initials indicates no data loaded yet)
  const isLoading = identity.fallbackInitials === '?' && !identity.displayName;

  const displayName = identity.displayName || 'Unknown';
  const bioMarkdown = profile?.bioMarkdown?.trim().length ? profile.bioMarkdown : '*No Bio*';

  return (
    <Animated.View entering={FadeIn.duration(300).delay(index * 50)}>
      <PlayerProfilePreviewCard
        displayName={displayName}
        bioMarkdown={bioMarkdown}
        imageUrl={identity.imageUrl || undefined}
        initials={identity.fallbackInitials === '?' ? '' : identity.fallbackInitials}
        profile={profile}
        email={email}
        isLoading={isLoading}
        isDead={isDead}
        rotation={CARD_TILTS[index % CARD_TILTS.length]}
      />
    </Animated.View>
  );
};

// Avatar component - just handles the avatar display
export { PlayerProfileAvatar as PlayerAvatar } from './PlayerProfilePreviewCard';

// Contact info component - only shows if profile exists
export { PlayerProfileContactInfo as PlayerContactInfo } from './PlayerProfilePreviewCard';

// Hook to get player profile
const usePlayerProfile = ({ userId, gameId }: { userId: string; gameId: string }) => {
  const profileKey = getGameScopedKey('playerProfile', gameId);
  const profiles = useFindValues<PlayerProfile>(profileKey, {
    userIds: [userId],
    returnTop: 1,
  });

  return {
    profile: profiles?.[0]?.value || null,
    isLoading: profiles === undefined,
  };
};

export default PhoneBookPagePLAYER;
