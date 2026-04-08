import React from 'react';
import { ScrollView } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import AppButton from '../ui/buttons/AppButton';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserList } from '../../../hooks/useUserList';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';

interface RuleBookRoleDescriptionsProps {
    gameId: string;
}

const RuleBookRoleDescriptions = ({ gameId }: RuleBookRoleDescriptionsProps) => {
    const [ruleBookData, setRuleBookData] = useUserVariable<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });

    const [roleTable] = useUserList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const roles = roleTable?.value ?? [];
    const visibleRolesWithContent = roles.filter(role => role.isVisible !== false && role.aboutRole && role.aboutRole.trim().length > 0);
    
    // Get ordered roles based on stored order, fallback to original order
    const getOrderedRoles = () => {
        const orderedRoleIndexes = ruleBookData?.value?.roleOrder || [];
        const roleMap = new Map(visibleRolesWithContent.map((role, index) => [roles.indexOf(role), role]));
        
        const orderedRoles: RoleTableItem[] = [];
        orderedRoleIndexes.forEach(originalIndex => {
            const role = roleMap.get(originalIndex);
            if (role) orderedRoles.push(role);
        });
        
        // Add any roles not in the order list
        visibleRolesWithContent.forEach((role, index) => {
            const originalIndex = roles.indexOf(role);
            if (!orderedRoleIndexes.includes(originalIndex)) {
                orderedRoles.push(role);
            }
        });
        
        return orderedRoles;
    };
    
    const orderedRoles = getOrderedRoles();
    
    const moveRoleUp = (currentIndex: number) => {
        if (currentIndex <= 0) return;
        
        const currentOrder = [...(ruleBookData?.value?.roleOrder || [])];
        const roleToMove = orderedRoles[currentIndex];
        const originalIndex = roles.indexOf(roleToMove);
        const roleAbove = orderedRoles[currentIndex - 1];
        const originalIndexAbove = roles.indexOf(roleAbove);
        
        // Swap positions in order array
        const currentIndexInOrder = currentOrder.indexOf(originalIndex);
        const aboveIndexInOrder = currentOrder.indexOf(originalIndexAbove);
        
        if (currentIndexInOrder !== -1 && aboveIndexInOrder !== -1) {
            [currentOrder[currentIndexInOrder], currentOrder[aboveIndexInOrder]] = 
            [currentOrder[aboveIndexInOrder], currentOrder[currentIndexInOrder]];
        } else {
            // If one or both aren't in the order yet, add them in the right positions
            if (currentIndexInOrder === -1) currentOrder.push(originalIndex);
            if (aboveIndexInOrder === -1) currentOrder.push(originalIndexAbove);
            // Then swap
            const newCurrentIndex = currentOrder.indexOf(originalIndex);
            const newAboveIndex = currentOrder.indexOf(originalIndexAbove);
            [currentOrder[newCurrentIndex], currentOrder[newAboveIndex]] = 
            [currentOrder[newAboveIndex], currentOrder[newCurrentIndex]];
        }
        
        setRuleBookData({
            ...(ruleBookData?.value || { content: '', roleOrder: [] }),
            roleOrder: currentOrder
        });
    };
    
    const moveRoleDown = (currentIndex: number) => {
        if (currentIndex >= orderedRoles.length - 1) return;
        
        const currentOrder = [...(ruleBookData?.value?.roleOrder || [])];
        const roleToMove = orderedRoles[currentIndex];
        const originalIndex = roles.indexOf(roleToMove);
        const roleBelow = orderedRoles[currentIndex + 1];
        const originalIndexBelow = roles.indexOf(roleBelow);
        
        // Swap positions in order array
        const currentIndexInOrder = currentOrder.indexOf(originalIndex);
        const belowIndexInOrder = currentOrder.indexOf(originalIndexBelow);
        
        if (currentIndexInOrder !== -1 && belowIndexInOrder !== -1) {
            [currentOrder[currentIndexInOrder], currentOrder[belowIndexInOrder]] = 
            [currentOrder[belowIndexInOrder], currentOrder[currentIndexInOrder]];
        } else {
            // If one or both aren't in the order yet, add them in the right positions
            if (currentIndexInOrder === -1) currentOrder.push(originalIndex);
            if (belowIndexInOrder === -1) currentOrder.push(originalIndexBelow);
            // Then swap
            const newCurrentIndex = currentOrder.indexOf(originalIndex);
            const newBelowIndex = currentOrder.indexOf(originalIndexBelow);
            [currentOrder[newCurrentIndex], currentOrder[newBelowIndex]] = 
            [currentOrder[newBelowIndex], currentOrder[newCurrentIndex]];
        }
        
        setRuleBookData({
            ...(ruleBookData?.value || { content: '', roleOrder: [] }),
            roleOrder: currentOrder
        });
    };

    if (orderedRoles.length === 0) {
        return null;
    }

    return (
        <Column gap={2}>
            <PoppinsText weight='bold' className='text-xl'>Role Descriptions</PoppinsText>
            {/* <ScrollView> */}
                <Column gap={4}>
                    {orderedRoles.map((role, index) => (
                        <Row key={roles.indexOf(role)} className='items-start gap-2'>
                            <Column className='flex-1 gap-2'>
                                {/* <PoppinsText weight='bold' className='text-lg'>
                                    {role.role}
                                </PoppinsText> */}
                                <MarkdownRenderer markdown={role.aboutRole} textAlign="center" viewHeightImages={30}/>
                            </Column>
                            <Column className='gap-1 justify-center' gap={0}>
                                <AppButton 
                                    variant='none' 
                                    className='h-12 w-12' 
                                    onPress={() => moveRoleUp(index)}
                                    disabled={index === 0}
                                >
                                    <ChevronUp size={20} color="white" />
                                </AppButton>
                                <AppButton 
                                    variant='none' 
                                    className='h-12 w-12' 
                                    onPress={() => moveRoleDown(index)}
                                    disabled={index === orderedRoles.length - 1}
                                >
                                    <ChevronDown size={20} color="white" />
                                </AppButton>
                            </Column>
                        </Row>
                    ))}
                </Column>
            {/* </ScrollView> */}
        </Column>
    );
};

export default RuleBookRoleDescriptions;
