import React, { useState } from 'react';
import { Plus } from 'lucide-react-native';
import { useList } from 'hooks/useData';
import Row from '../layout/Row';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import UserAddDialog from './UserAddDialog';
import { UserTableItem } from 'types/playerTable';

interface PlayerAddUserSectionProps {
  gameId: string;
  removeBottomSpace?: boolean;
  rightContent?: React.ReactNode;
}

const PlayerAddUserSection = ({
  gameId,
  removeBottomSpace = false,
  rightContent,
}: PlayerAddUserSectionProps) => {
  const [userTable] = useList<UserTableItem[]>('userTable', gameId);

  const users = userTable.scheduledUpdate?.value ?? userTable.value ?? [];
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsAddUserDialogOpen(true);
  };

  const buttonContent = (
    <Row className="items-center gap-2">
      <Plus size={20} color="white" />
      <FontText weight="medium" color="white">
        Add Player
      </FontText>
    </Row>
  );

  return (
    <>
      <Row
        className={`w-full flex-wrap items-start justify-between gap-4 ${users.length > 0 ? '-mt-4 px-4' : ''} ${removeBottomSpace ? '-mb-6' : ''}`.trim()}>
        <AppButton variant="accent" onPress={handleOpenDialog}>
          {buttonContent}
        </AppButton>
        <Column className="min-w-0 flex-1 items-end">
          {rightContent}
        </Column>
      </Row>

      <UserAddDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        gameId={gameId}
      />
    </>
  );
};

export default PlayerAddUserSection;
