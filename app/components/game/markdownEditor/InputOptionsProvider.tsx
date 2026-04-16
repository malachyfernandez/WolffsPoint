import React, { useMemo } from 'react';
import { useUserList } from '../../../../hooks/useUserList';
import { RoleTableItem } from '../../../../types/roleTable';
import { UserTableItem } from '../../../../types/playerTable';
import { MarkdownRendererInputDataProvider } from '../../ui/markdown/MarkdownRenderer';

interface InputOption {
    value: string;
    label: string;
    meta?: {
        livingState?: string;
    };
}

interface InputOptionsProviderProps {
    gameId: string | undefined;
    showInputs: boolean;
    children: React.ReactNode;
}

export function InputOptionsProvider({
    gameId,
    showInputs,
    children,
}: InputOptionsProviderProps) {
    const [userTable] = useUserList<UserTableItem[]>({
        key: 'userTable',
        itemId: gameId || '__markdown_editor_dialog_no_game__',
        privacy: 'PUBLIC',
    });
    const [roleTable] = useUserList<RoleTableItem[]>({
        key: 'roleTable',
        itemId: gameId || '__markdown_editor_dialog_no_game__',
        privacy: 'PUBLIC',
    });

    const playerOptions = useMemo(() => {
        if (!showInputs) {
            return [];
        }

        return (userTable?.value ?? []).map((user) => ({
            value: user.realName,
            label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
            meta: {
                livingState: user.playerData.livingState,
            },
        }));
    }, [showInputs, userTable?.value]);

    const roleOptions = useMemo(() => {
        if (!showInputs) {
            return [];
        }

        return (roleTable?.value ?? [])
            .filter((role) => role.role.trim().length > 0 && role.isVisible !== false)
            .map((role) => ({
                value: role.role,
                label: role.role,
            }));
    }, [roleTable?.value, showInputs]);

    return (
        <MarkdownRendererInputDataProvider playerOptions={playerOptions} roleOptions={roleOptions}>
            {children}
        </MarkdownRendererInputDataProvider>
    );
}
