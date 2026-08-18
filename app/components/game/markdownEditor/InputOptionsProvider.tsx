import React, { useMemo } from 'react';
import { useList, useValue } from '../../../../hooks/useData';
import { RoleTableItem } from '../../../../types/roleTable';
import { UserTableItem, UserTableTitle } from '../../../../types/playerTable';
import { MarkdownRendererInputDataProvider } from '../../ui/markdown/MarkdownRenderer';
import type { ScriptSourceData } from '../../../script/runtime/sources';

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

export function InputOptionsProvider({ gameId, showInputs, children }: InputOptionsProviderProps) {
  const [userTable] = useList<UserTableItem[]>(
    'userTable',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );
  const [roleTable] = useList<RoleTableItem[]>(
    'roleTable',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );
  const [dayDatesArray] = useList<string[]>(
    'dayDatesArray',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );
  const [selectedDayIndex] = useList<number>(
    'selectedDayIndex',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );
  const [userTableTitle] = useList<UserTableTitle>(
    'userTableTitle',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );
  const [morningMessagesList] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId || '__markdown_editor_dialog_no_game__',
    { privacy: 'PUBLIC' }
  );

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

  const scriptSources = useMemo<ScriptSourceData>(
    () => ({
      capability: 'operator',
      players: userTable?.value ?? [],
      roles: roleTable?.value ?? [],
      currentDay: selectedDayIndex?.value ?? 0,
      dayDates: dayDatesArray?.value ?? [],
      userTableTitle: userTableTitle?.value,
      morningMessagesList: morningMessagesList?.value,
    }),
    [
      userTable?.value,
      roleTable?.value,
      selectedDayIndex?.value,
      dayDatesArray?.value,
      userTableTitle?.value,
      morningMessagesList?.value,
    ]
  );

  return (
    <MarkdownRendererInputDataProvider
      playerOptions={playerOptions}
      roleOptions={roleOptions}
      scriptSources={scriptSources}>
      {children}
    </MarkdownRendererInputDataProvider>
  );
}
export default InputOptionsProvider;
