import React, { useEffect, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import NightlyUserRow from './NightlyUserRow';
import NightlyTitleRow from './NightlyTitleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { UserTableItem } from 'types/playerTable';

interface NightlyPlayerTableProps {
    gameId: string;
    doSync: boolean;
    setDoSync: (value: boolean) => void;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    dayDatesArray: Date[];
    updatePlayerLivingState: (userIndex: number, livingState: 'alive' | 'dead') => void;
    onColumnsReady?: (ready: boolean) => void;
}

const NightlyPlayerTable = ({ 
    gameId, 
    doSync, 
    setDoSync, 
    isBeingEdited, 
    setIsBeingEdited, 
    className, 
    dayDatesArray,
    updatePlayerLivingState,
    onColumnsReady
}: NightlyPlayerTableProps) => {
    const { executeCommand } = useUndoRedo();
    const [editingRow, setEditingRow] = useState<'title' | number | null>(null);

    const handleRowEditStart = (rowType: 'title' | number) => {
        setEditingRow(rowType);
        setIsBeingEdited(true);
    };

    const handleRowEditEnd = () => {
        setEditingRow(null);
        setIsBeingEdited(false);
    };

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    // Track when column data is ready (only check isSyncing)
    const areColumnsReady = !userTable?.state?.isSyncing 
        && !selectedDayIndex?.state?.isSyncing;

    useEffect(() => {
        onColumnsReady?.(areColumnsReady);
    }, [areColumnsReady, onColumnsReady]);

    useEffect(() => {
        if (!doSync) return;
        setDoSync(false);
    }, [doSync]);

    const UNDOABLEupdatePlayerLivingState = (userIndex: number, livingState: 'alive' | 'dead') => {
        const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
        if (userIndex < 0 || userIndex >= previousUserTable.length) return;

        const nextUserTable = createUndoSnapshot(previousUserTable);
        nextUserTable[userIndex] = {
            ...nextUserTable[userIndex],
            playerData: {
                ...nextUserTable[userIndex].playerData,
                livingState: livingState
            }
        };

        executeCommand({
            action: () => updatePlayerLivingState(userIndex, livingState),
            undoAction: () => updatePlayerLivingState(userIndex, previousUserTable[userIndex].playerData.livingState),
            description: "Change Living State"
        });
    };

    return (
        <Column gap={0}>
            <Row gap={0}>
                <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                    <NightlyTitleRow
                        onEditStart={() => handleRowEditStart('title')}
                        onEditEnd={handleRowEditEnd}
                        isEditing={editingRow === 'title'}
                    />

                    {users.map((user, index) => (
                        <Animated.View key={index} entering={FadeIn.duration(300).delay(index * 50)}>
                            <NightlyUserRow
                                user={user}
                                index={index}
                                isLast={index === users.length - 1}
                                updatePlayerLivingState={UNDOABLEupdatePlayerLivingState}
                                onEditStart={() => handleRowEditStart(index)}
                                onEditEnd={handleRowEditEnd}
                                isEditing={editingRow === index}
                                gameId={gameId}
                            />
                        </Animated.View>
                    ))}
                </Column>
            </Row>
        </Column>
    );
};

export default NightlyPlayerTable;
