import React, { useState } from 'react';
import { Platform } from 'react-native';
import { Download } from 'lucide-react-native';
import { useList } from 'hooks/useData';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import Row from '../layout/Row';
import { UserTableItem, UserTableTitle } from 'types/playerTable';
import { GameInfo } from 'types/games';
import { getPlayerActionSummary } from '../../../utils/multiplayer';
import { resolveVoteEmailToName } from './VoteEditorDialog';
import * as XLSX from 'xlsx';

interface DownloadPlayerDataButtonProps {
    gameId: string;
}

const DownloadPlayerDataButton = ({ gameId }: DownloadPlayerDataButtonProps) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const [userTable] = useList<UserTableItem[]>('userTable', gameId);
    const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId);
    const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId);
    const [morningMessagesList] = useList<Record<string, string[]>>('morningMessagesList', gameId);
    const [games] = useList<GameInfo>('games', gameId);

    const users = userTable?.value ?? [];
    const titles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
    const dayDates = dayDatesArray?.value ?? [];
    const messages = morningMessagesList?.value ?? {};
    const gameName = games?.value?.name || 'game';

    const handleDownload = async () => {
        if (Platform.OS !== 'web') return;
        if (users.length === 0) return;

        setIsDownloading(true);

        try {
            const workbook = XLSX.utils.book_new();

            // Build Players sheet
            const playersHeaders = [
                'Name',
                'Email',
                'Role',
                'Living State',
                ...titles.extraUserColumns,
            ];
            const playersData = users.map((user) => [
                user.realName,
                user.email,
                user.role,
                user.playerData.livingState,
                ...(user.playerData.extraColumns ?? []),
            ]);
            const playersSheet = XLSX.utils.aoa_to_sheet([playersHeaders, ...playersData]);
            XLSX.utils.book_append_sheet(workbook, playersSheet, 'Players');

            // Build one sheet per day
            dayDates.forEach((dateStr, dayIndex) => {
                const dayHeaders = [
                    'Name',
                    'Vote',
                    'Action',
                    ...titles.extraDayColumns,
                    'Morning Message',
                ];
                const dayData = users.map((user) => {
                    const day = user.days[dayIndex] || { vote: '', action: '', extraColumns: [] };
                    const voteName = resolveVoteEmailToName(day.vote || '', users);
                    const actionSummary = getPlayerActionSummary(day.action);
                    const morningMessage = messages[user.email]?.[dayIndex] ?? '';

                    return [
                        user.realName,
                        voteName,
                        actionSummary,
                        ...(day.extraColumns ?? []),
                        morningMessage,
                    ];
                });

                const sheetLabel = `Day ${dayIndex + 1} (${dateStr.replace(/\//g, '-')})`;
                // Excel sheet names are capped at 31 characters and cannot contain : \ / ? * [ ]
                const sheetName = sheetLabel.slice(0, 31);
                const daySheet = XLSX.utils.aoa_to_sheet([dayHeaders, ...dayData]);
                XLSX.utils.book_append_sheet(workbook, daySheet, sheetName);
            });

            const fileName = `${gameName.replace(/\s+/g, '_')}_players.xlsx`;

            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = (typeof document !== 'undefined' ? document.createElement('a') : null);
            if (a) {
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download player data:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (Platform.OS !== 'web') {
        return null;
    }

    return (
        <AppButton
            variant="secondary"
            onPress={handleDownload}
            disabled={isDownloading || users.length === 0}
        >
            <Row className="gap-2 items-center">
                <Download size={20} />
                <FontText weight="medium">
                    {isDownloading ? 'Preparing...' : 'Download Data'}
                </FontText>
            </Row>
        </AppButton>
    );
};

export default DownloadPlayerDataButton;
