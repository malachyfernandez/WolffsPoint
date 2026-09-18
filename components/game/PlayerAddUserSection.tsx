import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react-native';
import { useList } from 'hooks/useData';
import Row from '../layout/Row';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import UserAddDialog from './UserAddDialog';
import { CONTROLS_STACKED_BREAKPOINT } from './TableFreezeControls';
import { UserTableItem } from 'types/playerTable';

interface PlayerAddUserSectionProps {
  gameId: string;
  removeBottomSpace?: boolean;
  rightContent?: React.ReactNode;
  /** Fires when rightContent drops onto its own line below the button, so the
      caller can switch it to a full-width layout. */
  onRightContentWrapChange?: (isWrapped: boolean) => void;
}

const PlayerAddUserSection = ({
  gameId,
  removeBottomSpace = false,
  rightContent,
  onRightContentWrapChange,
}: PlayerAddUserSectionProps) => {
  const [userTable] = useList<UserTableItem[]>('userTable', gameId);

  const users = userTable.scheduledUpdate?.value ?? userTable.value ?? [];
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);

  // Below CONTROLS_STACKED_BREAKPOINT the button and rightContent can't share a
  // line comfortably, so both stack full-width. Change the value in
  // TableFreezeControls.tsx.
  const isRightContentStacked = rowWidth > 0 && rowWidth < CONTROLS_STACKED_BREAKPOINT;

  useEffect(() => {
    onRightContentWrapChange?.(isRightContentStacked);
  }, [isRightContentStacked, onRightContentWrapChange]);

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
        className={`w-full flex-wrap items-start justify-between gap-4 ${users.length > 0 ? '-mt-4 px-4' : ''} ${removeBottomSpace ? '-mb-6' : ''}`.trim()}
        onLayout={(event: any) => setRowWidth(event.nativeEvent.layout.width)}>
        <AppButton
          variant="accent"
          className={isRightContentStacked ? 'w-full' : ''}
          onPress={handleOpenDialog}>
          {buttonContent}
        </AppButton>
        {/* Stacked = full-width line of its own below the button. */}
        <Column className={isRightContentStacked ? 'w-full items-end' : 'flex-1 items-end'}>
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
