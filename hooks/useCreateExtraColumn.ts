import { useCallback } from 'react';
import { useList, useValue } from './useData';
import { createClientId } from '../utils/multiplayer';
import {
  defaultPlayerPageColumnSizes,
  getPlayerPageColumnSizesKey,
  type PlayerPageColumnSizes,
} from '../components/game/playerTableColumnSizing';
import type {
  CellContentType,
  UserTableColumnVisibility,
  UserTableItem,
  UserTableTitle,
} from '../types/playerTable';

export type ExtraColumnScope = 'user' | 'day';

/**
 * Create a new players-table column from inside the script editor (the
 * UpdateCell column dropdown's "New Column" footer). Mirrors the table
 * editors' add-column flows: titles + ids + content types, an empty cell on
 * every row, visibility on, and 'small' sizing for day columns.
 * Writes go through the normal data layer, so staged/sim warnings apply.
 */
export const useCreateExtraColumn = (gameId: string | undefined, enabled = true) => {
  const active = enabled && !!gameId;
  const itemId = active ? gameId! : '__no-game__';
  const [userTableTitle, setUserTableTitle] = useList<UserTableTitle>('userTableTitle', itemId, {
    privacy: 'PUBLIC',
    enabled: active,
  });
  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', itemId, {
    privacy: 'PUBLIC',
    enabled: active,
  });
  const [visibility, setVisibility] = useList<UserTableColumnVisibility>(
    'userTableColumnVisibility',
    itemId,
    { privacy: 'PUBLIC', enabled: active }
  );
  const [columnSizes, setColumnSizes] = useValue<PlayerPageColumnSizes>(
    active ? getPlayerPageColumnSizesKey(gameId!) : '__no-column-sizes__',
    {
      defaultValue: defaultPlayerPageColumnSizes,
      privacy: 'PUBLIC',
      autoCreate: false,
      enabled: active,
    }
  );

  return useCallback(
    (scope: ExtraColumnScope, rawName: string, type: CellContentType): boolean => {
      const name = rawName.trim();
      if (!active || !name) return false;

      const titles = userTableTitle.scheduledUpdate?.value ?? userTableTitle.value;
      if (!titles) return false;
      const namesKey = scope === 'user' ? 'extraUserColumns' : 'extraDayColumns';
      const idsKey = scope === 'user' ? 'extraUserColumnIds' : 'extraDayColumnIds';
      const typesKey = scope === 'user' ? 'extraUserColumnTypes' : 'extraDayColumnTypes';
      const names = titles[namesKey] ?? [];
      if (names.some((n) => n.toLowerCase() === name.toLowerCase())) return false;

      // Keep the optional types array aligned: pad with the 'tags' default
      // (same materialization as the table's column-type switcher).
      const types = [...(titles[typesKey] ?? [])];
      while (types.length < names.length) types.push('tags');
      types.push(type);

      setUserTableTitle({
        ...titles,
        [namesKey]: [...names, name],
        [idsKey]: titles[idsKey] ? [...titles[idsKey]!, createClientId('column')] : undefined,
        [typesKey]: types,
      });

      const users = userTable.scheduledUpdate?.value ?? userTable.value;
      if (users) {
        setUserTable(
          users.map((u) =>
            scope === 'user'
              ? {
                  ...u,
                  playerData: {
                    ...u.playerData,
                    extraColumns: [...(u.playerData?.extraColumns ?? []), ''],
                  },
                }
              : {
                  ...u,
                  days: (u.days ?? []).map((d) => ({
                    ...d,
                    extraColumns: [...(d.extraColumns ?? []), ''],
                  })),
                }
          )
        );
      }

      const vis = visibility.scheduledUpdate?.value ?? visibility.value;
      const baseVis: UserTableColumnVisibility = vis ?? {
        extraUserColumns: [],
        extraDayColumns: [],
      };
      setVisibility({ ...baseVis, [namesKey]: [...(baseVis[namesKey] ?? []), true] });

      if (scope === 'day') {
        const sizes = columnSizes.value ?? defaultPlayerPageColumnSizes;
        setColumnSizes({ ...sizes, dayExtraColumns: [...sizes.dayExtraColumns, 'small'] });
      }
      return true;
    },
    [
      active,
      userTableTitle,
      userTable,
      visibility,
      columnSizes,
      setUserTableTitle,
      setUserTable,
      setVisibility,
      setColumnSizes,
    ]
  );
};
