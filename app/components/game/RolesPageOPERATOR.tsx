import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollShadow } from 'heroui-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import RoleTable from './RoleTable';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from '../../../hooks/useUserList';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface RolesPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const RolesPageOPERATOR = ({ currentUserId, gameId }: RolesPageOPERATORProps) => {
    const { executeCommand } = useUndoRedo();
    const createUndoSnapshot = useCreateUndoSnapshot();
    
    const [roleTable, setRoleTable] = useUserList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const roles = roleTable?.value ?? [];
    const visibleRoles = roles.filter(role => role.isVisible !== false);
    const isSyncing = roleTable?.state?.isSyncing ?? false;
    const lastOpStatus = roleTable?.state?.lastOpStatus ?? "idle";

    const [doSync, setDoSync] = useState(false);
    const [isRoleTableBeingEdited, setIsRoleTableBeingEdited] = useState(false);

    const addRole = () => {
        const newRole: RoleTableItem = {
            role: "New Role",
            doesRoleVote: true,
            roleMessage: "Unset role message",
            aboutRole: "## NEW ROLE - No description set",
            isVisible: true
        };
        setRoleTable([...roles, newRole]);
        setDoSync(true);
    };

    const UNDOABLEaddRole = () => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        
        executeCommand({
            action: addRole,
            undoAction: () => {
                setRoleTable(previousRoleTable);
                setDoSync(true);
            },
            description: "Add Role"
        });
    };

    return (
        <Column className='min-h-[760px]'>

            {!isSyncing && (
                visibleRoles.length > 0 ? (

                    <Column>
                        <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1'>
                            <ScrollView horizontal={true} className='px-1 py-5'>
                                <Row>
                                    <Column gap={1}>
                                        <Row className='h-6'>
                                            {/* spacer to align with table */}
                                        </Row>
                                        <Row className={isRoleTableBeingEdited ? 'z-50' : ''}>
                                            <RoleTable
                                                gameId={gameId}
                                                doSync={doSync}
                                                setDoSync={setDoSync}
                                                isBeingEdited={isRoleTableBeingEdited}
                                                setIsBeingEdited={setIsRoleTableBeingEdited}
                                                showInputs={true}
                                            />
                                        </Row>
                                    </Column>
                                </Row>
                            </ScrollView>
                        </ScrollShadow>
                        <AppButton variant="filled" className='w-40 h-8 ml-4 -mt-6' onPress={UNDOABLEaddRole}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Role</PoppinsText>
                        </AppButton>
                    </Column>

                ) : (
                    <Row className='items-center justify-center'>
                        <AppButton variant="filled" className='w-40 h-8' onPress={UNDOABLEaddRole}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Role</PoppinsText>
                        </AppButton>
                    </Row>
                )
            )}
        </Column>
    );
};

export default RolesPageOPERATOR;
