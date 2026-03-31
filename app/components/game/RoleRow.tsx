import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import AppButton from '../ui/buttons/AppButton';
import { Pressable, Text } from 'react-native';
import VoteMessageDialog from './VoteMessageDialog';
import { RoleTableItem } from 'types/roleTable';

interface RoleRowProps {
    role: RoleTableItem;
    index: number;
    isLast: boolean;
    setRoleName: (roleIndex: number, newRoleName: string) => void;
    setDoesRoleVote: (roleIndex: number, newDoesRoleVote: boolean) => void;
    setRoleMessage: (roleIndex: number, newRoleMessage: string) => void;
    onDeleteRole: (roleIndex: number) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
}

const RoleRow = ({ role, index, isLast, setRoleName, setDoesRoleVote, setRoleMessage, onDeleteRole, onEditStart, onEditEnd, isEditing }: RoleRowProps) => {
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const toggleDoesRoleVote = () => {
        const newDoesRoleVote = !role.doesRoleVote;
        setDoesRoleVote(index, newDoesRoleVote);
    };

    const handleCellEditStart = (cellType: string) => {
        setEditingCell(cellType);
        onEditStart?.();
    };

    const handleCellEditEnd = () => {
        setEditingCell(null);
        onEditEnd?.();
    };

    return (
        <>
            <Row gap={0} className={` h-12 w-min ${isEditing ? 'z-50' : ''}`}>
                <Column className={`w-32 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-bl-lg' : ''}`}>
                    <InlineEditableText
                        value={role.role || ''}
                        onChange={(newValue) => setRoleName(index, newValue)}
                        placeholder='Role name'
                        className='w-28 text-center text-nowrap overflow-hidden'
                        weight='medium'
                        compact={true}
                        onEditStart={() => handleCellEditStart('role')}
                        onEditEnd={handleCellEditEnd}
                    />
                </Column>
                <Column className='w-24 h-full border border-subtle-border items-center justify-center'>
                    <CustomCheckbox checked={role.doesRoleVote} onChange={toggleDoesRoleVote} />
                </Column>
                <Column className={`w-64 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                    <Pressable onPress={() => setIsDialogOpen(true)} className='w-60 h-full items-center justify-center'>
                        <PoppinsText 
                            weight='medium' 
                            className='text-center text-nowrap overflow-hidden w-60'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {role.roleMessage || (
                                <PoppinsText className="opacity-50">Role message...</PoppinsText>
                            )}
                        </PoppinsText>
                    </Pressable>
                </Column>
                <Column className={`w-0 h-12 items-center justify-center`}>
                    <AppButton variant="black" className='w-8 max-h-8' onPress={() => onDeleteRole(index)}>
                        <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>-</PoppinsText>
                    </AppButton>
                </Column>
            </Row>
            <VoteMessageDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                roleIndex={index}
                roleName={role.role || 'Role'}
                currentMessage={role.roleMessage}
                onPress={() => setIsDialogOpen(true)}
                setRoleMessage={setRoleMessage}
            />
        </>
    );
};

export default RoleRow;
