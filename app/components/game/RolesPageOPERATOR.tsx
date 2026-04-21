import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollShadow } from 'heroui-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import RoleTable from './RoleTable';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import { useUserList } from '../../../hooks/useUserList';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';

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
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

    useEffect(() => {
        if (!isSyncing && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);
        }
    }, [isSyncing, hasInitiallyLoaded]);

    if (isSyncing || !hasInitiallyLoaded) {
        return (
            <Column className='gap-4 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading roles' />
            </Column>
        );
    }

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
        <Animated.View entering={FadeIn.duration(300)} className='min-h-[760px]'>
            <Column className='gap-4 py-3 sm:px-4'>
                {visibleRoles.length > 0 ? (
                    <Column className='gap-4'>
                        <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1'>
                            <ScrollView horizontal={true} className='px-1 py-5'>
                                <Row className='gap-4'>
                                    <Column className='gap-1'>
                                        <Row className='gap-4 h-6'>
                                            {/* spacer to align with table */}
                                        </Row>
                                        <Row className={`gap-4 ${isRoleTableBeingEdited ? 'z-50' : ''}`.trim()}>
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
                        <Row className='gap-4 sm:ml-4 -mt-2 sm:-mt-6'>
                            <AppButton variant="accent" className='w-36' onPress={UNDOABLEaddRole}>
                                <Row className='gap-2 items-center'>
                                    <Plus size={20} color='white' />
                                    <FontText weight='medium' color='white'>Add Role</FontText>
                                </Row>
                                {/* <FontText weight='bold' className='text-white text-xl'>+</FontText>
                                <FontText weight='bold' className='text-white'>Add Role</FontText> */}
                            </AppButton>
                        </Row>
                    </Column>
                ) : (
                    <Row className='gap-4 w-full items-center justify-center'>
                        <AppButton variant="accent" className='w-36' onPress={UNDOABLEaddRole}>
                            <Row className='gap-2 items-center'>
                                <Plus size={20} color='white' />
                                <FontText weight='medium' color='white'>Add Role</FontText>
                            </Row>
                        </AppButton>
                    </Row>
                )}
            </Column>
        </Animated.View>
    );
};

export default RolesPageOPERATOR;
