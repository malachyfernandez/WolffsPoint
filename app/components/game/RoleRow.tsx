import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import CustomCheckbox from '../ui/CustomCheckbox';
import AppButton from '../ui/buttons/AppButton';
import { Pressable, Text } from 'react-native';
import TableMarkdownDialog from './TableMarkdownDialog';
import { RoleTableItem } from 'types/roleTable';

interface RoleRowProps {
    gameId: string;
    role: RoleTableItem;
    index: number;
    isLast: boolean;
    setRoleName: (roleIndex: number, newRoleName: string) => void;
    setDoesRoleVote: (roleIndex: number, newDoesRoleVote: boolean) => void;
    setRoleMessage: (roleIndex: number, newRoleMessage: string) => void;
    setAboutRole: (roleIndex: number, newAboutRole: string) => void;
    onDeleteRole: (roleIndex: number) => void;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    isEditing?: boolean;
    showInputs?: boolean;
}

const RoleRow = ({ gameId, role, index, isLast, setRoleName, setDoesRoleVote, setRoleMessage, setAboutRole, onDeleteRole, onEditStart, onEditEnd, isEditing, showInputs = false }: RoleRowProps) => {
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [isRoleMessageDialogOpen, setIsRoleMessageDialogOpen] = useState(false);
    const [isAboutRoleDialogOpen, setIsAboutRoleDialogOpen] = useState(false);

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
                <Column className={`w-64 h-full border border-subtle-border items-center justify-center`}>
                    <Pressable onPress={() => setIsRoleMessageDialogOpen(true)} className='w-60 h-full items-center justify-center'>
                        <PoppinsText 
                            weight='medium' 
                            className='text-center text-nowrap overflow-hidden w-60'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {role.roleMessage ? (
                                <PoppinsText className="text-center">{role.roleMessage.slice(0, 30)}{role.roleMessage.length > 30 ? '...' : ''}</PoppinsText>
                            ) : (
                                <PoppinsText className="opacity-50">Role message...</PoppinsText>
                            )}
                        </PoppinsText>
                    </Pressable>
                </Column>
                <Column className={`w-64 h-full border border-subtle-border items-center justify-center ${isLast ? 'rounded-br-lg' : ''}`}>
                    <Pressable onPress={() => setIsAboutRoleDialogOpen(true)} className='w-full h-full items-center justify-center'>
                        <PoppinsText 
                            weight='medium' 
                            className='text-center text-nowrap overflow-hidden w-60'
                            style={{
                                textDecorationLine: 'underline',
                                textDecorationStyle: 'dotted',
                            }}
                        >
                            {role.aboutRole ? (
                                <PoppinsText className="text-center">{role.aboutRole.slice(0, 30)}{role.aboutRole.length > 30 ? '...' : ''}</PoppinsText>
                            ) : (
                                <PoppinsText className="opacity-50">About role...</PoppinsText>
                            )}
                        </PoppinsText>
                    </Pressable>
                </Column>
                <Column className={`w-0 h-12 items-center justify-center`}>
                    <AppButton variant="filled" className='w-8 max-h-8' onPress={() => onDeleteRole(index)}>
                        <PoppinsText weight='bold' color='white' className='text-xl mt-[-0.1rem]'>-</PoppinsText>
                    </AppButton>
                </Column>
            </Row>
            <TableMarkdownDialog
                isOpen={isRoleMessageDialogOpen}
                onOpenChange={setIsRoleMessageDialogOpen}
                title={`${role.role || 'Role'} Role Message`}
                submitLabel="Save Message"
                initialMarkdown={role.roleMessage}
                onSubmit={(markdown) => setRoleMessage(index, markdown)}
                gameId={gameId}
                showInputs={showInputs}
            />
            <TableMarkdownDialog
                isOpen={isAboutRoleDialogOpen}
                onOpenChange={setIsAboutRoleDialogOpen}
                title={`About ${role.role || 'Role'}`}
                submitLabel="Save About"
                initialMarkdown={role.aboutRole}
                onSubmit={(markdown) => setAboutRole(index, markdown)}
            />
        </>
    );
};

export default RoleRow;
