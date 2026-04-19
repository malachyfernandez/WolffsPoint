import React, { useState } from 'react';
import { Plus } from 'lucide-react-native';
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

    const buttonContent = (
        <Row className='items-center gap-2' gap={2}>
            <Plus size={20} color='white' />
            <PoppinsText weight='medium' color='white'>Add Player</PoppinsText>
        </Row>
    );

    return (
        <>
            {users.length > 0 ? (
                <Row className='ml-4 -mt-4'>
                    <AppButton variant="accent" onPress={handleOpenDialog}>
                        {buttonContent}
                    </AppButton>
                </Row>
            ) : (
                <Row className={`items-center justify-center ${removeBottomSpace ? '-mb-6' : ''}`}>
                    <AppButton variant="accent" onPress={handleOpenDialog}>
                        {buttonContent}
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
