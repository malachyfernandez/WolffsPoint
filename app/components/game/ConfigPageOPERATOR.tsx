import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import RoleTable from './RoleTable';
import { RoleTableItem } from 'types/roleTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ConfigPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const ConfigPageOPERATOR = ({ currentUserId, gameId }: ConfigPageOPERATORProps) => {
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
            doesRoleVote: false,
            roleMessage: "",
            isVisible: true
        };
        setRoleTable([...roles, newRole]);
        setDoSync(true);
    };

    return (
        <Column>

            {!isSyncing && (
                visibleRoles.length > 0 ? (

                    <Column>
                        <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1'>
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
                                            />
                                        </Row>
                                    </Column>
                                </Row>
                            </ScrollView>
                        </ScrollShadow>
                        <AppButton variant="black" className='w-40 h-8 ml-4 -mt-6' onPress={addRole}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Role</PoppinsText>
                        </AppButton>
                    </Column>

                ) : (
                    <Row className='items-center justify-center'>
                        <AppButton variant="black" className='w-40 h-8' onPress={addRole}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Role</PoppinsText>
                        </AppButton>
                    </Row>
                )
            )}
        </Column>
    );
};

export default ConfigPageOPERATOR;
