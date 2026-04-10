import React, { useEffect, useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import RoleRow from './RoleRow';
import { createUndoSnapshot, useUndoRedo } from 'hooks/useUndoRedo';
import { RoleTableItem } from 'types/roleTable';

interface RoleTableProps {
    gameId: string;
    doSync: boolean;
    setDoSync: (value: boolean) => void;
    isBeingEdited: boolean;
    setIsBeingEdited: (value: boolean) => void;
    className?: string;
    showInputs?: boolean;
}

const RoleTable = ({ gameId, doSync, setDoSync, isBeingEdited, setIsBeingEdited, className, showInputs = false }: RoleTableProps) => {
    const { executeCommand } = useUndoRedo();
    const [editingRow, setEditingRow] = useState<number | null>(null);

    const handleRowEditStart = (rowIndex: number) => {
        setEditingRow(rowIndex);
        setIsBeingEdited(true);
    };

    const handleRowEditEnd = () => {
        setEditingRow(null);
        setIsBeingEdited(false);
    };

    const [roleTable, setRoleTable] = useUserList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const roles = roleTable?.value ?? [];
    const visibleRoles = roles.filter(role => role.isVisible !== false);

    useEffect(() => {
        if (!doSync) return;
        setDoSync(false);
    }, [doSync]);


    const UNDOABLEsetRoleName = (roleIndex: number, newRoleName: string) => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

        const nextRoleTable = createUndoSnapshot(previousRoleTable);
        nextRoleTable[roleIndex] = {
            ...nextRoleTable[roleIndex],
            role: newRoleName
        };

        executeCommand({
            action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
            undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
            description: "Set Role Name"
        });
    };


    const UNDOABLEsetDoesRoleVote = (roleIndex: number, newDoesRoleVote: boolean) => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

        const nextRoleTable = createUndoSnapshot(previousRoleTable);
        nextRoleTable[roleIndex] = {
            ...nextRoleTable[roleIndex],
            doesRoleVote: newDoesRoleVote
        };

        executeCommand({
            action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
            undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
            description: "Set Role Vote"
        });
    };



    const UNDOABLEsetRoleMessage = (roleIndex: number, newRoleMessage: string) => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

        const nextRoleTable = createUndoSnapshot(previousRoleTable);
        nextRoleTable[roleIndex] = {
            ...nextRoleTable[roleIndex],
            roleMessage: newRoleMessage
        };

        executeCommand({
            action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
            undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
            description: "Set Role Message"
        });
    };

    const UNDOABLEsetAboutRole = (roleIndex: number, newAboutRole: string) => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

        const nextRoleTable = createUndoSnapshot(previousRoleTable);
        nextRoleTable[roleIndex] = {
            ...nextRoleTable[roleIndex],
            aboutRole: newAboutRole
        };

        executeCommand({
            action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
            undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
            description: "Set About Role"
        });
    };




    const UNDOABLEdeleteRole = (roleIndex: number) => {
        const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
        if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

        const nextRoleTable = createUndoSnapshot(previousRoleTable);
        nextRoleTable[roleIndex] = {
            ...nextRoleTable[roleIndex],
            isVisible: false
        };
        
        executeCommand({
            action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
            undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
            description: "Delete Role"
        });
    };

    return (
        <Column gap={0}>
            <Row gap={0}>
                <Column gap={0} className={`border-border border-2 rounded w-min ${className || ''}`}>
                    {/* Title Row */}
                    <Row gap={0} className={`h-12 w-min bg-background border-b-2 border-border rounded-t-lg`}>
                        <Column className='w-32 h-full items-center justify-center'>
                            <PoppinsText weight='medium' className='text-center'>Role</PoppinsText>
                        </Column>
                        <Column className='w-24 h-full items-center justify-center'>
                            <PoppinsText weight='medium' className='text-center'>Votes?</PoppinsText>
                        </Column>
                        <Column className='w-64 h-full items-center justify-center'>
                            <PoppinsText weight='medium' className='text-center'>Role Message</PoppinsText>
                        </Column>
                        <Column className='w-64 h-full items-center justify-center'>
                            <PoppinsText weight='medium' className='text-center'>About Role</PoppinsText>
                        </Column>
                        {/* <Column className='w-12 h-full items-center justify-center'> */}
                            
                        {/* </Column> */}
                    </Row>

                    {visibleRoles.map((role, index) => {
                        // Find the actual index in the full roles array
                        const actualIndex = roles.findIndex(r => r === role);
                        return (
                            <RoleRow
                                key={actualIndex}
                                gameId={gameId}
                                role={role}
                                index={actualIndex}
                                isLast={index === visibleRoles.length - 1}
                                setRoleName={UNDOABLEsetRoleName}
                                setDoesRoleVote={UNDOABLEsetDoesRoleVote}
                                setRoleMessage={UNDOABLEsetRoleMessage}
                                setAboutRole={UNDOABLEsetAboutRole}
                                onDeleteRole={UNDOABLEdeleteRole}
                                onEditStart={() => handleRowEditStart(actualIndex)}
                                onEditEnd={handleRowEditEnd}
                                isEditing={editingRow === actualIndex}
                                showInputs={showInputs}
                            />
                        );
                    })}
                </Column>
            </Row>
        </Column>
    );
};

export default RoleTable;
