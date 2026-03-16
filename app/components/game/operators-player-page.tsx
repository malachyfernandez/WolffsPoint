import React from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';

type OperatorPlayer = {
    name?: string;
};

interface OperatorsPlayerPageProps {
    currentUserId: string;
    gameId: string;
}

const OperatorsPlayerPage = ({ currentUserId, gameId }: OperatorsPlayerPageProps) => {
    const [userTable, setUserTable] = useUserList<OperatorPlayer[]>({
        key: "userTable",
        itemId: gameId,
        defaultValue: [{ name: "" }],
        privacy: "PUBLIC",
    });
    const users = userTable?.value ?? [];

    const addUser = () => {
        setUserTable([...users, { name: "John Doe" }]);
    };

    return (
        <Column>
            {users.map((user, index) => (
                <PoppinsText key={index}>{user.name || 'Unnamed player'}</PoppinsText>
            ))}
            <AppButton variant="black" className='w-12 h-12' onPress={addUser}>
                <PoppinsText weight='bold' className='text-white text-2xl'>+</PoppinsText>
            </AppButton>
        </Column>
    );
};

export default OperatorsPlayerPage;
