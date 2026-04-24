import React, { useMemo } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import TownSquareAvatar from './townSquare/TownSquareAvatar';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import { PlayerNightSubmission, PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';

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

const VoteSummaryRow = ({
    gameId,
    player,
    voteCount,
    maxVoteCount,
    emailToUserIdMap,
}: {
    gameId: string;
    player: UserTableItem;
    voteCount: number;
    maxVoteCount: number;
    emailToUserIdMap: Map<string, string>;
}) => {
    // For NOT-JOINED players, look up their real userId from the profile map
    const resolvedUserId = useMemo(() => {
        if (player.userId !== 'NOT-JOINED') {
            return player.userId;
        }
        // Try to find userId by email from the profile map
        return emailToUserIdMap.get(player.email) || '';
    }, [player.userId, player.email, emailToUserIdMap]);

    const identity = useTownSquareAuthorIdentity({
        gameId,
        userId: resolvedUserId,
    });
    const widthPercent = maxVoteCount > 0 ? Math.max((voteCount / maxVoteCount) * 100, 12) : 12;
    const fallbackName = player.realName || player.email;
    const displayName = resolvedUserId
        ? identity.displayName
        : fallbackName;
    const avatarUri = resolvedUserId ? identity.imageUrl : '';
    const avatarFallback = resolvedUserId ? identity.fallbackInitials : getInitials(fallbackName);

    return (
        <Column className='gap-2 w-full'>
            <Row className='gap-4 items-center'>
                <TownSquareAvatar fallbackLabel={avatarFallback} size={44} uri={avatarUri} />
                <Row className='gap-4 flex-1 items-center justify-between'>
                    <View className='flex-1 h-5 rounded-full bg-border/10 overflow-hidden'>
                        <View className='h-full rounded-full bg-text/80' style={{ width: `${widthPercent}%` }} />
                    </View>
                    <FontText weight='bold' className='min-w-[28px] text-right'>{voteCount}</FontText>
                </Row>
            </Row>
            <FontText weight='medium'>{displayName}</FontText>
        </Column>
    );
};

const NewspaperPreviousDayVoteSummary = ({ gameId, dayIndex }: NewspaperPreviousDayVoteSummaryProps) => {
    const gameRows = useFindListItems("games", {
        itemId: gameId,
        returnTop: 1,
    });
    const operatorUserId = gameRows?.[0]?.userToken ?? '';
    const operatorUserTableRecords = useFindListItems<UserTableItem[]>("userTable", {
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const submissionRecords = useFindValues<PlayerNightSubmission>(getGameScopedKey(`playerNightSubmission-day-${dayIndex - 1}`, gameId), {
        returnTop: 200,
    });

    // Fetch all player profiles to map email -> userId for NOT-JOINED players
    const allProfiles = useFindValues<PlayerProfile>(getGameScopedKey('playerProfile', gameId), {
        returnTop: 200,
    });

    // Build email -> userId map from all profiles
    const emailToUserIdMap = useMemo(() => {
        const map = new Map<string, string>();
        (allProfiles ?? []).forEach((record) => {
            if (record.value.email && record.value.userId) {
                map.set(record.value.email, record.value.userId);
            }
        });
        return map;
    }, [allProfiles]);

    const voteRows = useMemo(() => {
        if (dayIndex <= 0) {
            return [] as { player: UserTableItem; voteCount: number }[];
        }

        const players = operatorUserTableRecords?.[0]?.value ?? [];
        const voteCounts = new Map<string, number>();

        (submissionRecords ?? []).forEach((record) => {
            const voteTargetEmail = record.value.vote?.trim();
            if (!voteTargetEmail) {
                return;
            }

            voteCounts.set(voteTargetEmail, (voteCounts.get(voteTargetEmail) ?? 0) + 1);
        });

        const result = players
            .map((player) => ({
                player,
                voteCount: voteCounts.get(player.email) ?? 0,
            }))
            .filter((row) => row.voteCount > 0)
            .sort((a, b) => {
                const aLabel = a.player.realName || a.player.email;
                const bLabel = b.player.realName || b.player.email;
                return b.voteCount - a.voteCount || aLabel.localeCompare(bLabel);
            });

        return result;
    }, [dayIndex, operatorUserTableRecords, submissionRecords]);

    const maxVoteCount = voteRows[0]?.voteCount ?? 0;

    if (dayIndex <= 0 || voteRows.length === 0) {
        return null;
    }

    return (
        <Column className='gap-4 w-full border-t border-border/15 p-4'>
            <Column className='gap-1'>
                <FontText weight='bold' className='text-lg'>Previous Day Vote</FontText>
                <FontText variant='subtext'>Certified results from Day {dayIndex}.</FontText>
            </Column>
            <Column className='gap-4'>
                {voteRows.map(({ player, voteCount }) => (
                    <VoteSummaryRow
                        key={player.email}
                        emailToUserIdMap={emailToUserIdMap}
                        gameId={gameId}
                        maxVoteCount={maxVoteCount}
                        player={player}
                        voteCount={voteCount}
                    />
                ))}
            </Column>
        </Column>
    );
};

export default NewspaperPreviousDayVoteSummary;
