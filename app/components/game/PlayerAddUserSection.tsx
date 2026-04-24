import React, { useState } from 'react';
import { Plus } from 'lucide-react-native';
import { useList } from 'hooks/useData';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import UserAddDialog from './UserAddDialog';
import { UserTableItem } from 'types/playerTable';

interface PlayerAddUserSectionProps {
    gameId: string;
    removeBottomSpace?: boolean;
}

const PlayerAddUserSection = ({ gameId, removeBottomSpace = false }: PlayerAddUserSectionProps) => {
    const [userTable] = useList<UserTableItem[]>('userTable', gameId);

    const users = userTable?.value ?? [];
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

    const handleOpenDialog = () => {
        setIsAddUserDialogOpen(true);
    };

    const buttonContent = (
        <Row className='gap-2 items-center'>
            <Plus size={20} color='white' />
            <FontText weight='medium' color='white'>Add Player</FontText>
        </Row>
    );

    return (
        <>
            {users.length > 0 ? (
                <Row className='gap-4 ml-4 -mt-4'>
                    <AppButton variant="accent" onPress={handleOpenDialog}>
                        {buttonContent}
                    </AppButton>
                </Row>
            ) : (
                <Row className={`gap-4 items-center justify-center ${removeBottomSpace ? '-mb-6' : ''}`}>
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
