import React, { useState } from 'react';
import { useUserList } from 'hooks/useUserList';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import UserAddDialog from './UserAddDialog';
import { UserTableItem } from 'types/playerTable';

interface PlayerAddUserSectionProps {
    gameId: string;
    removeBottomSpace?: boolean;
}

const PlayerAddUserSection = ({ gameId, removeBottomSpace = false }: PlayerAddUserSectionProps) => {
    const [userTable] = useUserList<UserTableItem[]>({
        key: 'userTable',
        itemId: gameId,
        privacy: 'PUBLIC',
    });

    const users = userTable?.value ?? [];
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

    const handleOpenDialog = () => {
        setIsAddUserDialogOpen(true);
    };

    return (
        <>
            {users.length > 0 ? (
                <AppButton variant="filled" className='w-40 h-8 ml-4 -mt-6' onPress={handleOpenDialog}>
                    <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                    <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                </AppButton>
            ) : (
                <Row className={`items-center justify-center ${removeBottomSpace ? '-mb-6' : ''}`}>
                    <AppButton variant="filled" className='w-40 h-8' onPress={handleOpenDialog}>
                        <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                        <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                    </AppButton>
                </Row>
            )}

            <UserAddDialog
                isOpen={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
                gameId={gameId}
            />
        </>
    );
};

export default PlayerAddUserSection;
