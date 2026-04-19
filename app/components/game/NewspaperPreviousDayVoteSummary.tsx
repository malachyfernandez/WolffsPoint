import React, { useMemo } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import TownSquareAvatar from './townSquare/TownSquareAvatar';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerNightSubmission } from '../../../types/multiplayer';
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
}: {
    gameId: string;
    player: UserTableItem;
    voteCount: number;
    maxVoteCount: number;
}) => {
    const identity = useTownSquareAuthorIdentity({
        gameId,
        userId: player.userId !== 'NOT-JOINED' ? player.userId : '',
    });
    const widthPercent = maxVoteCount > 0 ? Math.max((voteCount / maxVoteCount) * 100, 12) : 12;
    const fallbackName = player.realName || player.email;
    const displayName = player.userId !== 'NOT-JOINED'
        ? identity.displayName
        : fallbackName;
    const avatarUri = player.userId !== 'NOT-JOINED' ? identity.imageUrl : '';
    const avatarFallback = player.userId !== 'NOT-JOINED' ? identity.fallbackInitials : getInitials(fallbackName);

    return (
        <Column gap={2} className='w-full'>
            <Row className='items-center gap-3'>
                <TownSquareAvatar fallbackLabel={avatarFallback} size={44} uri={avatarUri} />
                <Row className='flex-1 items-center justify-between gap-3'>
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
    const gameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        returnTop: 1,
    });
    const operatorUserId = gameRows?.[0]?.userToken ?? '';
    const operatorUserTableRecords = useUserListGet<UserTableItem[]>({
        key: 'userTable',
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const submissionRecords = useUserVariableGet<PlayerNightSubmission>({
        key: getGameScopedKey(`playerNightSubmission-day-${dayIndex - 1}`, gameId),
        returnTop: 200,
    });

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

        return players
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
    }, [dayIndex, operatorUserTableRecords, submissionRecords]);

    const maxVoteCount = voteRows[0]?.voteCount ?? 0;

    if (dayIndex <= 0 || voteRows.length === 0) {
        return null;
    }

    return (
        <Column className='w-full border-t border-border/15 p-4' gap={4}>
            <Column gap={1}>
                <FontText weight='bold' className='text-lg'>Previous Day Vote</FontText>
                <FontText variant='subtext'>Certified results from Day {dayIndex}.</FontText>
            </Column>
            <Column gap={4}>
                {voteRows.map(({ player, voteCount }) => (
                    <VoteSummaryRow
                        key={player.email}
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
