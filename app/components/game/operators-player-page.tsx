import React, { useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import prettyLog from 'utils/prettyLog';
import DayConfigModal from '../modals/DayConfigModal';
import useSimpleModal from '../modal/useSimpleModal';
import SimpleJoinGameModal from '../modals/SimpleJoinGameModal';



interface OperatorsPlayerPageProps {
    currentUserId: string;
    gameId: string;
}

type PlayerData = {
    livingState: 'alive' | 'dead';
    extraColumns?: string[];
};

type DayData = {
    votes?: string[];
    actions?: string[];
    extraColumns?: string[];
};

type UserTableItem = {
    userId: string;
    role: string;
    playerData: PlayerData;
    days: DayData[];
};

type PlayerTableItem = {
    email: string;
    role: string;
};

const OperatorsPlayerPage = ({ currentUserId, gameId }: OperatorsPlayerPageProps) => {

    const [playerTable, setPlayerTable] = useUserList<PlayerTableItem[]>({
        key: "playerTable",
        itemId: gameId,
        defaultValue: [],
        privacy: "PUBLIC",
    });

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        defaultValue: [],
        privacy: "PUBLIC",
    });
    const users = userTable?.value ?? [];

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

    const { showModal } = useSimpleModal();
    const openDayConfigModal = () => {
        showModal(DayConfigModal, { setStartingDate, setRealDaysPerInGameDay });
    };

    let isNoStartingDate = false;

    if (!startingDate.state.isSyncing) {
        isNoStartingDate = (startingDate.value === "Unset");
    }


    // open modal when no date is set
    useEffect(() => {
        if (isNoStartingDate) {
            openDayConfigModal();
        }
    }, [isNoStartingDate]);







    // prettyLog(users);


    return (
        <Column>
            {/* if startingDate.value === "Unset" show modal */}
            {isNoStartingDate ? (
                <>
                    <PoppinsText>Set starting date</PoppinsText>
                    <AppButton variant="green" className='w-52 h-12'
                        onPress={openDayConfigModal}
                    >
                        <PoppinsText weight='bold' className='text-white'>Set Starting Date</PoppinsText>
                    </AppButton>
                </>
            ) : (
                <>
                
                    {users.map((user, index) => (
                        <PoppinsText key={index}>{user.userId || 'Unnamed player'}</PoppinsText>
                    ))}
                    <AppButton variant="black" className='w-12 h-12'
                        onPress={openDayConfigModal}
                    >
                        <PoppinsText weight='bold' className='text-white text-2xl'>+</PoppinsText>
                    </AppButton>
                </>
            )}
        </Column>
    );
};

export default OperatorsPlayerPage;
