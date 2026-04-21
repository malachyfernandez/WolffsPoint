import React, { useEffect, useState } from 'react';
import FontText from '../ui/text/FontText';
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
        <Column className='gap-0'>
            <Row className='gap-0'>
                <Column className={`gap-0 border-border border-2 rounded w-min ${className || ''}`}>
                    {/* Title Row */}
                    <Row className={`gap-0 h-12 w-min bg-background border-b-2 border-border rounded-t-lg`}>
                        <Column className='gap-4 w-32 h-full items-center justify-center'>
                            <FontText weight='medium' className='text-center'>Role</FontText>
                        </Column>
                        <Column className='gap-4 w-24 h-full items-center justify-center'>
                            <FontText weight='medium' className='text-center'>Votes?</FontText>
                        </Column>
                        <Column className='gap-4 w-64 h-full items-center justify-center'>
                            <FontText weight='medium' className='text-center'>Role Message</FontText>
                        </Column>
                        <Column className='gap-4 w-64 h-full items-center justify-center'>
                            <FontText weight='medium' className='text-center'>About Role</FontText>
                        </Column>
                        {/* <Column className='gap-4 w-12 h-full items-center justify-center'> */}
                            
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
