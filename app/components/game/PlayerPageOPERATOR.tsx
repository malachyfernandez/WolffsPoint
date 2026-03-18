import React, { useEffect, useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import prettyLog from 'utils/prettyLog';
import ChangeDateInfo from './ChangeDateInfo';
import Row from '../layout/Row';
import { Checkbox } from 'heroui-native';
import UserRow from './UserRow';
import TitleRow from './TitleRow';



interface PlayerPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

type PlayerData = {
    livingState: 'alive' | 'dead';
    extraColumns?: any[]; // array of values
};

type DayData = {
    vote?: string;
    action?: string;
    extraColumns?: any[];
};

type UserTableItem = {
    realName: string;
    email: string;
    userId: string | "NOT-JOINED";
    role: string;
    playerData: PlayerData;
    days: DayData[];
};

type PlayerTableItem = {
    email: string;
    role: string;
};

type UserTableTitle = {
    extraUserColumns: string[];
    extraDayColumns: string[];
};

const PlayerPageOPERATOR = ({ currentUserId, gameId }: PlayerPageOPERATORProps) => {
    const [editingRow, setEditingRow] = useState<'title' | number | null>(null);

    const handleRowEditStart = (rowType: 'title' | number) => {
        setEditingRow(rowType);
    };

    const handleRowEditEnd = () => {
        setEditingRow(null);
    };

    const [playerTable, setPlayerTable] = useUserList<PlayerTableItem[]>({
        key: "playerTable",
        itemId: gameId,
        defaultValue: [],
        privacy: "PUBLIC",
    });

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        defaultValue: [{ realName: "John Doe", email: "john.doe@example.com", userId: "NOT-JOINED", role: "player", playerData: { livingState: "alive", extraColumns: ["Testing"] }, days: [{ vote: "", action: "", extraColumns: [""] }] }],
        privacy: "PUBLIC",
    });
    const users = userTable?.value ?? [];


    const [userTableTitle, setUserTableTitle] = useUserList<UserTableTitle>({
        key: "userTableTitle",
        itemId: gameId,
        defaultValue: { extraUserColumns: ["Strings"], extraDayColumns: ["More Strings"] },
        privacy: "PUBLIC",
    });

    const tableTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };

    const addUser = () => {
        // setUserTable([...users, { realName: "John Doe", email: "john.doe@example.com", role: "player", playerData: { livingState: "alive", extraColumns: [] } }]);
    };

    const [startingDate, setStartingDate] = useUserList({
        key: "startingDate",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: "Unset",
    });

    const [realDaysPerInGameDay, setRealDaysPerInGameDay] = useUserList({
        key: "realDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: "2",
    });

    const setLivingState = (userIndex: number, newLivingState: 'alive' | 'dead') => {
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                playerData: {
                    ...updatedUsers[userIndex].playerData,
                    livingState: newLivingState
                }
            };
            setUserTable(updatedUsers);
        }
    };

    const isUsersEmpty = users.length === 0;

    const setExtraColumnValue = (userIndex: number, extraColumnIndex: number, newExtraColumnValue: string) => {
        const updatedUsers = [...users];
        if (userIndex >= 0 && userIndex < updatedUsers.length) {
            const currentExtraColumns = updatedUsers[userIndex].playerData.extraColumns || [];
            const updatedExtraColumns = [...currentExtraColumns];
            updatedExtraColumns[extraColumnIndex] = newExtraColumnValue;

            updatedUsers[userIndex] = {
                ...updatedUsers[userIndex],
                playerData: {
                    ...updatedUsers[userIndex].playerData,
                    extraColumns: updatedExtraColumns
                }
            };
            setUserTable(updatedUsers);
        }
    };

    const setColumnTitle = (columnIndex: number, newTitle: string) => {
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedExtraUserColumns = [...currentTitles.extraUserColumns];
        updatedExtraUserColumns[columnIndex] = newTitle;

        const updatedTitles = {
            ...currentTitles,
            extraUserColumns: updatedExtraUserColumns
        };
        setUserTableTitle(updatedTitles);
    };

    const addColumn = () => {
        // Add new column title
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedTitles = {
            ...currentTitles,
            extraUserColumns: [...currentTitles.extraUserColumns, `Column ${currentTitles.extraUserColumns.length + 1}`]
        };
        setUserTableTitle(updatedTitles);

        // Add new column value to each user
        const updatedUsers = users.map(user => ({
            ...user,
            playerData: {
                ...user.playerData,
                extraColumns: [...(user.playerData.extraColumns || []), ""]
            }
        }));
        setUserTable(updatedUsers);
    };

    const removeColumn = (columnIndex: number) => {
        // Remove column title
        const currentTitles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
        const updatedExtraUserColumns = currentTitles.extraUserColumns.filter((_, index) => index !== columnIndex);
        const updatedTitles = {
            ...currentTitles,
            extraUserColumns: updatedExtraUserColumns
        };
        setUserTableTitle(updatedTitles);

        // Remove column value from each user
        const updatedUsers = users.map(user => ({
            ...user,
            playerData: {
                ...user.playerData,
                extraColumns: (user.playerData.extraColumns || []).filter((_, index) => index !== columnIndex)
            }
        }));
        setUserTable(updatedUsers);
    };


    // prettyLog(users);


    return (
        <Column>
            {/* if startingDate.value === "Unset" show dialog */}

            <>
                <PoppinsText>startingDate: {startingDate.value}</PoppinsText>
                {/*<PoppinsText>realDaysPerInGameDay: {realDaysPerInGameDay.value}</PoppinsText>
                    <ChangeDateInfo gameId={gameId} isGettingStarted={false} /> */}

                <Row gap={0}>
                    <Column gap={0} className='border-border border-2 rounded w-min z-10'>
                        <TitleRow 
                            userTableTitle={userTableTitle?.value} 
                            setColumnTitle={setColumnTitle} 
                            removeColumn={removeColumn}
                            onEditStart={() => handleRowEditStart('title')}
                            onEditEnd={handleRowEditEnd}
                            isEditing={editingRow === 'title'}
                        />

                        {users.map((user, index) => (
                            <UserRow
                                key={index}
                                user={user}
                                index={index}
                                isLast={index === users.length - 1}
                                setLivingState={setLivingState}
                                setExtraColumnValue={setExtraColumnValue}
                                onEditStart={() => handleRowEditStart(index)}
                                onEditEnd={handleRowEditEnd}
                                isEditing={editingRow === index}
                            />
                        ))}
                    </Column>
                    <Row className='w-12 h-12 bg-light items-center justify-center'>
                    <AppButton variant="green" className='w-8 max-h-8 ' onPress={addColumn}>
                        <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>+</PoppinsText>
                    </AppButton>
                    </Row>

                </Row>
                <AppButton variant="black" className='w-40 h-12' onPress={addUser}>
                    <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                    <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                </AppButton>
            </>

        </Column>
    );
};

export default PlayerPageOPERATOR;
