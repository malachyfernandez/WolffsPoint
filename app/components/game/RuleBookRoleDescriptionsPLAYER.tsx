import React from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookRoleDescriptionsPLAYERProps {
    gameId: string;
}

const RuleBookRoleDescriptionsPLAYER = ({ gameId }: RuleBookRoleDescriptionsPLAYERProps) => {
    const gameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;

    const roleTableRecords = useUserListGet<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : [],
    });

    const ruleBookRecords = useUserVariableGet<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const roles = roleTableRecords?.[0]?.value ?? [];
    const ruleBookData = ruleBookRecords?.[0]?.value;
    const visibleRolesWithContent = roles.filter(role => role.isVisible !== false && role.aboutRole && role.aboutRole.trim().length > 0);
    
    // Get ordered roles based on stored order, fallback to original order
    const getOrderedRoles = () => {
        const orderedRoleIndexes = ruleBookData?.roleOrder || [];
        const roleMap = new Map(visibleRolesWithContent.map((role) => [roles.indexOf(role), role]));
        
        const orderedRoles: RoleTableItem[] = [];
        orderedRoleIndexes.forEach((originalIndex: number) => {
            const role = roleMap.get(originalIndex);
            if (role) orderedRoles.push(role);
        });
        
        visibleRolesWithContent.forEach((role) => {
            const originalIndex = roles.indexOf(role);
            if (!orderedRoleIndexes.includes(originalIndex)) {
                orderedRoles.push(role);
            }
        });
        
        return orderedRoles;
    };
    
    const orderedRoles = getOrderedRoles();

    if (orderedRoles.length === 0) {
        return null;
    }

    return (
        <Column className='gap-2'>
            <FontText weight='bold' className='text-xl'>Role Descriptions</FontText>
            <Column className='gap-4'>
                {orderedRoles.map((role) => (
                    <Row key={roles.indexOf(role)} className='gap-4 items-start'>
                        <Column className='gap-4 flex-1'>
                            <MarkdownRenderer 
                                markdown={role.aboutRole} 
                                textAlign="center" 
                                viewHeightImages={30}
                            />
                        </Column>
                    </Row>
                ))}
            </Column>
        </Column>
    );
};

export default RuleBookRoleDescriptionsPLAYER;
