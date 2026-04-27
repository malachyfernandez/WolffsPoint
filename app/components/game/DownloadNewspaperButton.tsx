import React, { useState, useMemo } from 'react';
import { Platform } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import { useList, useFindListItems } from 'hooks/useData';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import Row from '../layout/Row';
import { GameInfo } from 'types/games';
import { Usepaper } from 'types/usepaper';
import JSZip from 'jszip';

interface DownloadNewspaperButtonProps {
    gameId: string;
}

const DownloadNewspaperButton = ({ gameId }: DownloadNewspaperButtonProps) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId);
    const [games] = useList<GameInfo>('games', gameId);
    const allNewspaperRecords = useFindListItems<Usepaper>('newspaper', {
        returnTop: 500,
    });

    const dayDates = dayDatesArray?.value ?? [];
    const gameName = games?.value?.name || 'game';

    const newspapersByDay = useMemo(() => {
        const prefix = `${gameId}-day-`;
        const map = new Map<number, string[]>();

        if (!allNewspaperRecords) return map;

        for (const record of allNewspaperRecords) {
            const itemId = record.itemId;
            if (!itemId?.startsWith(prefix)) continue;

            const dayIndexStr = itemId.slice(prefix.length);
            const dayIndex = parseInt(dayIndexStr, 10);
            if (Number.isNaN(dayIndex)) continue;

            const columns = record.value?.columns ?? [];
            map.set(dayIndex, columns);
        }

        return map;
    }, [allNewspaperRecords, gameId]);

    const hasAnyNewspaper = useMemo(() => {
        for (const dayIndex of dayDates.keys()) {
            const columns = newspapersByDay.get(dayIndex);
            if (columns && columns.some((c) => c.trim().length > 0)) {
                return true;
            }
        }
        return false;
    }, [dayDates, newspapersByDay]);

    const handleDownload = async () => {
        if (Platform.OS !== 'web') return;

        setIsDownloading(true);

        try {
            const zip = new JSZip();
            const folder = zip.folder(gameName.replace(/\s+/g, '_') + '_newspaper');
            if (!folder) return;

            let filesAdded = 0;

            for (let dayIndex = 0; dayIndex < dayDates.length; dayIndex++) {
                const columns = newspapersByDay.get(dayIndex) ?? [];
                const hasContent = columns.some((c) => c.trim().length > 0);
                if (!hasContent) continue;

                const dateStr = dayDates[dayIndex]?.replace(/\//g, '-') ?? `day_${dayIndex + 1}`;
                const fileName = `Day_${dayIndex + 1}_${dateStr}.md`;

                let fileContent = '';
                for (let i = 0; i < columns.length; i++) {
                    const columnMarkdown = columns[i] ?? '';
                    fileContent += `# COLUMN ${i + 1}\n\n${columnMarkdown.trim()}\n\n`;
                }

                folder.file(fileName, fileContent.trim() + '\n');
                filesAdded++;
            }

            if (filesAdded === 0) {
                setIsDownloading(false);
                return;
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = typeof document !== 'undefined' ? document.createElement('a') : null;
            if (a) {
                a.href = url;
                a.download = `${gameName.replace(/\s+/g, '_')}_newspaper.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download newspaper:', error);
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
            disabled={isDownloading || !hasAnyNewspaper}
        >
            <Row className="gap-2 items-center">
                <Newspaper size={20} />
                <FontText weight="medium">
                    {isDownloading ? 'Preparing...' : 'Download Newspaper'}
                </FontText>
            </Row>
        </AppButton>
    );
};

export default DownloadNewspaperButton;
