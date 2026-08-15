import React, { useState, useEffect } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import { Pressable } from 'react-native';
import UserEditDialog from './UserEditDialog';
import TagCellDisplay from './TagCellDisplay';
import { useList, useValue } from 'hooks/useData';
import { UserTableItem } from 'types/playerTable';

interface NightlyUserRowProps {
  user: UserTableItem;
  index: number;
  isLast: boolean;
  updatePlayerLivingState: (userIndex: number, livingState: 'alive' | 'dead') => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  gameId: string;
  /** Indices into user.playerData.extraColumns for columns shown in nightly. */
  extraUserColumnIndices?: number[];
  extraUserColumnWidths?: number[];
  extraUserColumnTitles?: string[];
}

const NightlyUserRow = ({
  user,
  index,
  isLast,
  updatePlayerLivingState,
  onEditStart,
  onEditEnd,
  isEditing,
  gameId,
  extraUserColumnIndices = [],
  extraUserColumnWidths = [],
  extraUserColumnTitles = [],
}: NightlyUserRowProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const toggleLivingState = () => {
    const newLivingState = user.playerData.livingState === 'alive' ? 'dead' : 'alive';
    updatePlayerLivingState(index, newLivingState);
  };

  const isDead = user.playerData.livingState === 'dead';

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
  });

  const deleteUser = (userIndex: number) => {
    const filteredUserTable = userTable?.value?.filter((userRow, index) => index != userIndex);
    setUserTable(filteredUserTable ?? []);
  };

  const setExtraColumnValue = (userIndex: number, columnIndex: number, newValue: string) => {
    const currentUsers = userTable?.value ?? [];
    if (userIndex < 0 || userIndex >= currentUsers.length) return;
    const updatedUsers = [...currentUsers];
    const u = updatedUsers[userIndex];
    const extraColumns = [...(u.playerData.extraColumns ?? [])];
    while (extraColumns.length <= columnIndex) {
      extraColumns.push('');
    }
    extraColumns[columnIndex] = newValue;
    updatedUsers[userIndex] = {
      ...u,
      playerData: { ...u.playerData, extraColumns },
    };
    setUserTable(updatedUsers);
  };

  return (
    <>
      <Row className={`h-12 w-min gap-0 ${isEditing ? 'z-50' : ''}`}>
        <Column
          className={`border-subtle-border h-full w-12 items-center justify-center gap-4 border ${isLast && extraUserColumnIndices.length === 0 ? 'rounded-bl-lg' : ''}`}>
          <CustomCheckbox checked={isDead} onChange={toggleLivingState} />
        </Column>
        <Column
          className={`border-subtle-border h-full w-28 items-center justify-center gap-0 border ${isLast && extraUserColumnIndices.length === 0 ? 'rounded-br-lg' : ''}`}>
          <Pressable
            onPress={() => setIsDialogOpen(true)}
            className="h-full w-28 items-center justify-center">
            <FontText
              weight="medium"
              className="w-28 overflow-hidden text-nowrap text-center"
              style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              }}>
              {user.realName || <FontText className="opacity-50">No Name</FontText>}
            </FontText>
            <FontText
              variant="subtext"
              className="w-28 overflow-hidden text-nowrap text-center"
              style={{
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
              }}>
              {user.role || <FontText className="opacity-50">No role</FontText>}
            </FontText>
          </Pressable>
        </Column>
        {extraUserColumnIndices.map((colIdx, i) => {
          const width = extraUserColumnWidths[i] ?? 112;
          const value = user.playerData.extraColumns?.[colIdx] ?? '';
          const isLastExtra = i === extraUserColumnIndices.length - 1;
          return (
            <Column
              key={i}
              className={`border-subtle-border h-full items-center justify-center border ${isLast && isLastExtra ? 'rounded-br-lg' : ''}`}
              style={{ width, position: 'relative', overflow: 'hidden' }}>
              <TagCellDisplay
                gameId={gameId}
                value={value}
                onChange={(newValue) => setExtraColumnValue(index, colIdx, newValue)}
                width={width}
                cellContext={{
                  playerIndex: index,
                  dayIndex: null,
                  column: extraUserColumnTitles[i] ?? `Column ${colIdx + 1}`,
                }}
              />
            </Column>
          );
        })}
      </Row>
      <UserEditDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userIndex={index}
        currentRealName={user.realName}
        currentEmail={user.email}
        currentRole={user.role}
        onPress={() => setIsDialogOpen(true)}
        gameId={gameId}
        onDelete={() => deleteUser(index)}
      />
    </>
  );
};

export default NightlyUserRow;
