import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ban } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import TownSquareAvatar from './townSquare/TownSquareAvatar';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import {
  getGameScopedKey,
  normalizeGameSchedule,
  defaultGameSchedule,
} from '../../../utils/multiplayer';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';

interface NewspaperPreviousDayVoteSummaryProps {
  gameId: string;
  dayIndex: number;
}

const getInitials = (value: string) => {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '?';
  }

  return parts.map((part) => part.slice(0, 1).toUpperCase()).join('');
};

const SkipVoteRow = ({
  voteCount,
  maxVoteCount,
  voters,
  publicVoting,
  gameId,
  emailToUserIdMap,
}: {
  voteCount: number;
  maxVoteCount: number;
  voters: UserTableItem[];
  publicVoting: boolean;
  gameId: string;
  emailToUserIdMap: Map<string, string>;
}) => {
  const [showVoters, setShowVoters] = useState(false);
  const widthPercent =
    maxVoteCount > 0 ? Math.max((Math.abs(voteCount) / maxVoteCount) * 100, 12) : 12;

  const content = (
    <Column className="w-full gap-2">
      <Row className="items-center gap-4">
        <View className="border-subtle-border/60 bg-border/10 h-11 w-11 items-center justify-center rounded-full border">
          <Ban size={20} color="rgb(46, 41, 37)" />
        </View>
        <Row className="flex-1 items-center justify-between gap-4">
          <View className="bg-border/10 h-5 flex-1 overflow-hidden rounded-full">
            <View
              className="bg-text/80 h-full rounded-full"
              style={{ width: `${widthPercent}%` }}
            />
          </View>
          <FontText weight="bold" className="min-w-[28px] text-right">
            {voteCount}
          </FontText>
        </Row>
      </Row>
      <FontText weight="medium">Skipped Vote</FontText>
    </Column>
  );

  if (!publicVoting || voters.length === 0) {
    return content;
  }

  return (
    <>
      <Pressable onPress={() => setShowVoters(true)}>{content}</Pressable>
      <ConvexDialog.Root isOpen={showVoters} onOpenChange={setShowVoters}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
            />
            <Column className="gap-4">
              <DialogHeader
                text="SKIPPED VOTE"
                subtext={`${voters.length} player${voters.length === 1 ? '' : 's'} skipped voting`}
              />
              <Column className="gap-3">
                {voters.map((voter) => (
                  <VoterRow
                    key={voter.email.toLowerCase()}
                    gameId={gameId}
                    voter={voter}
                    emailToUserIdMap={emailToUserIdMap}
                  />
                ))}
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

const VoterRow = ({
  gameId,
  voter,
  emailToUserIdMap,
}: {
  gameId: string;
  voter: UserTableItem;
  emailToUserIdMap: Map<string, string>;
}) => {
  const resolvedUserId = useMemo(() => {
    if (voter.userId !== 'NOT-JOINED') {
      return voter.userId;
    }
    return emailToUserIdMap.get(voter.email.toLowerCase()) || '';
  }, [voter.userId, voter.email, emailToUserIdMap]);

  const identity = useTownSquareAuthorIdentity({
    gameId,
    userId: resolvedUserId,
  });
  const fallbackName = voter.realName || voter.email;
  const displayName = resolvedUserId ? identity.displayName : fallbackName;
  const avatarUri = resolvedUserId ? identity.imageUrl : '';
  const avatarFallback = resolvedUserId ? identity.fallbackInitials : getInitials(fallbackName);

  return (
    <Row className="items-center gap-3">
      <TownSquareAvatar fallbackLabel={avatarFallback} size={36} uri={avatarUri} />
      <FontText weight="medium" className="text-sm">
        {displayName}
      </FontText>
    </Row>
  );
};

const VoteSummaryRow = ({
  gameId,
  player,
  voteCount,
  maxVoteCount,
  emailToUserIdMap,
  voters,
  publicVoting,
}: {
  gameId: string;
  player: UserTableItem;
  voteCount: number;
  maxVoteCount: number;
  emailToUserIdMap: Map<string, string>;
  voters: UserTableItem[];
  publicVoting: boolean;
}) => {
  const [showVoters, setShowVoters] = useState(false);

  // For NOT-JOINED players, look up their real userId from the profile map
  const resolvedUserId = useMemo(() => {
    if (player.userId !== 'NOT-JOINED') {
      return player.userId;
    }
    // Try to find userId by email from the profile map
    return emailToUserIdMap.get(player.email.toLowerCase()) || '';
  }, [player.userId, player.email, emailToUserIdMap]);

  const identity = useTownSquareAuthorIdentity({
    gameId,
    userId: resolvedUserId,
  });
  const widthPercent =
    maxVoteCount > 0 ? Math.max((Math.abs(voteCount) / maxVoteCount) * 100, 12) : 12;
  const fallbackName = player.realName || player.email;
  const displayName = resolvedUserId ? identity.displayName : fallbackName;
  const avatarUri = resolvedUserId ? identity.imageUrl : '';
  const avatarFallback = resolvedUserId ? identity.fallbackInitials : getInitials(fallbackName);

  const content = (
    <Column className="w-full gap-2">
      <Row className="items-center gap-4">
        <TownSquareAvatar fallbackLabel={avatarFallback} size={44} uri={avatarUri} />
        <Row className="flex-1 items-center justify-between gap-4">
          <View className="bg-border/10 h-5 flex-1 overflow-hidden rounded-full">
            <View
              className="bg-text/80 h-full rounded-full"
              style={{ width: `${widthPercent}%` }}
            />
          </View>
          <FontText weight="bold" className="min-w-[28px] text-right">
            {voteCount}
          </FontText>
        </Row>
      </Row>
      <FontText weight="medium">{displayName}</FontText>
    </Column>
  );

  if (!publicVoting || voters.length === 0) {
    return content;
  }

  return (
    <>
      <Pressable onPress={() => setShowVoters(true)}>{content}</Pressable>
      <ConvexDialog.Root isOpen={showVoters} onOpenChange={setShowVoters}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm">
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
            />
            <Column className="gap-4">
              <DialogHeader
                text="VOTES RECEIVED"
                subtext={`${voteCount} vote${voteCount === 1 ? '' : 's'} for ${displayName}`}
              />
              <Column className="gap-3">
                {voters.map((voter) => (
                  <VoterRow
                    key={voter.email.toLowerCase()}
                    gameId={gameId}
                    voter={voter}
                    emailToUserIdMap={emailToUserIdMap}
                  />
                ))}
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

const NewspaperPreviousDayVoteSummary = ({
  gameId,
  dayIndex,
}: NewspaperPreviousDayVoteSummaryProps) => {
  const gameRows = useFindListItems('games', {
    itemId: gameId,
    returnTop: 1,
  });
  const operatorUserId = gameRows?.[0]?.userToken ?? '';
  const operatorUserTableRecords = useFindListItems<UserTableItem[]>('userTable', {
    itemId: gameId,
    userIds: operatorUserId ? [operatorUserId] : undefined,
    returnTop: 1,
  });
  // Fetch all player profiles to map email -> userId for NOT-JOINED players
  const allProfiles = useFindValues<PlayerProfile>(getGameScopedKey('playerProfile', gameId), {
    returnTop: 200,
  });
  const scheduleRecord = useFindValues(getGameScopedKey('gameSchedule', gameId), {
    returnTop: 1,
  });
  const schedule = normalizeGameSchedule(scheduleRecord?.[0]?.value ?? defaultGameSchedule);
  const publicVoting = schedule.publicVoting ?? false;

  // Build email -> userId map from all profiles
  const emailToUserIdMap = useMemo(() => {
    const map = new Map<string, string>();
    (allProfiles ?? []).forEach((record) => {
      if (record.value.email && record.value.userId) {
        map.set(record.value.email.toLowerCase(), record.value.userId);
      }
    });
    return map;
  }, [allProfiles]);

  const { voteRows, skipVoteCount, skipVoters, votersByTargetEmail } = useMemo(() => {
    if (dayIndex <= 0) {
      return {
        voteRows: [] as { player: UserTableItem; voteCount: number; voters: UserTableItem[] }[],
        skipVoteCount: 0,
        skipVoters: [] as UserTableItem[],
        votersByTargetEmail: new Map<string, UserTableItem[]>(),
      };
    }

    const players = operatorUserTableRecords?.[0]?.value ?? [];
    const voteCounts = new Map<string, number>();
    const votersMap = new Map<string, UserTableItem[]>();
    let skipVotes = 0;
    const skipVoterList: UserTableItem[] = [];
    const targetDay = dayIndex - 1;

    players.forEach((player) => {
      const vote = player.days?.[targetDay]?.vote?.trim() ?? '';
      if (!vote) {
        return;
      }

      const multiplier = player.days?.[targetDay]?.voteMultiplier ?? 1;

      if (vote === 'SKIP_VOTE') {
        skipVotes += 1;
        skipVoterList.push(player);
        return;
      }

      const voteKey = vote.toLowerCase();
      voteCounts.set(voteKey, (voteCounts.get(voteKey) ?? 0) + multiplier);
      const existing = votersMap.get(voteKey);
      if (existing) {
        existing.push(player);
      } else {
        votersMap.set(voteKey, [player]);
      }
    });

    const rows = players
      .map((player) => ({
        player,
        voteCount: voteCounts.get(player.email.toLowerCase()) ?? 0,
        voters: votersMap.get(player.email.toLowerCase()) ?? [],
      }))
      .filter((row) => row.voters.length > 0)
      .sort((a, b) => {
        const aLabel = a.player.realName || a.player.email;
        const bLabel = b.player.realName || b.player.email;
        return b.voteCount - a.voteCount || aLabel.localeCompare(bLabel);
      });

    return {
      voteRows: rows,
      skipVoteCount: skipVotes,
      skipVoters: skipVoterList,
      votersByTargetEmail: votersMap,
    };
  }, [dayIndex, operatorUserTableRecords]);

  const maxVoteCount = Math.max(Math.abs(voteRows[0]?.voteCount ?? 0), skipVoteCount);

  if (dayIndex <= 0 || (voteRows.length === 0 && skipVoteCount === 0)) {
    return null;
  }

  return (
    <Column className="border-border/15 w-full gap-4 border-t p-4">
      <Column className="gap-1">
        <FontText weight="bold" className="text-lg">
          Previous Day Vote
        </FontText>
        <FontText variant="subtext">
          Certified results from Day {dayIndex}.
          {publicVoting && ' Tap a player to see who voted for them.'}
        </FontText>
      </Column>
      <Column className="gap-4">
        {skipVoteCount > 0 && (
          <SkipVoteRow
            voteCount={skipVoteCount}
            maxVoteCount={maxVoteCount}
            voters={skipVoters}
            publicVoting={publicVoting}
            gameId={gameId}
            emailToUserIdMap={emailToUserIdMap}
          />
        )}
        {voteRows.map(({ player, voteCount, voters }) => (
          <VoteSummaryRow
            key={player.email.toLowerCase()}
            emailToUserIdMap={emailToUserIdMap}
            gameId={gameId}
            maxVoteCount={maxVoteCount}
            player={player}
            voteCount={voteCount}
            voters={voters}
            publicVoting={publicVoting}
          />
        ))}
      </Column>
    </Column>
  );
};

export default NewspaperPreviousDayVoteSummary;
