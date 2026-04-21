import React, { useState, useEffect } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import { Pressable } from 'react-native';
import UserEditDialog from './UserEditDialog';
import { useUserList } from 'hooks/useUserList';
import { UserTableItem } from 'types/playerTable';

interface NightlyUserRowProps {
    user: {
        userId: string | "NOT-JOINED";
        realName: string;
        email: string;
        role: string;
        playerData: {
            livingState: 'alive' | 'dead';
            extraColumns?: string[];
        };
        days: Array<{
            votes?: string[];
            actions?: string[];
            extraColumns?: string[];
        }>;
    };
    index: number;
    isLast: boolean;
    updatePlayerLivingState: (userIndex: number, livingState: 'alive' | 'dead') => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    gameId: string;
}

const NightlyUserRow = ({ 
    user, 
    index, 
    isLast, 
    updatePlayerLivingState,
    onEditStart, 
    onEditEnd, 
    isEditing, 
    gameId
}: NightlyUserRowProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const toggleLivingState = () => {
        const newLivingState = user.playerData.livingState === 'alive' ? 'dead' : 'alive';
        updatePlayerLivingState(index, newLivingState);
    };

    const isDead = user.playerData.livingState === 'dead';

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const deleteUser = (userIndex: number) => {
        const filteredUserTable = userTable?.value?.filter((userRow, index) => index != userIndex);
        setUserTable(filteredUserTable ?? []);
    };

    return (
        <>
            <Row className={`gap-0 h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`gap-4 w-12 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-bl-lg' : ''}`}>
                    <CustomCheckbox checked={isDead} onChange={toggleLivingState} />
                </Column>
                <Column className={`gap-0 w-28 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                    <Pressable onPress={() => setIsDialogOpen(true)} className='w-28 h-full items-center justify-center'>
                        <FontText
                            weight='medium'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.realName || (
                                <FontText className="opacity-50">No Name</FontText>
                            )}
                        </FontText>
                        <FontText
                            variant='subtext'
                            className='text-center text-nowrap overflow-hidden w-28'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {user.role || (
                                <FontText className="opacity-50">No role</FontText>
                            )}
                        </FontText>
                    </Pressable>
                </Column>
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
