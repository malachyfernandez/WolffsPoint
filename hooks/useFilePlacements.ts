import { useMemo } from 'react';
import { useList, useValue } from './useData';
import {
  buildFilePlacements,
  type FilePlacement,
  type FilePlacements,
  type ScriptFilesIndex,
} from '../utils/scriptFiles';
import { collectPieceFileRefs, formatCellAddress } from '../utils/cellPieces';
import { getGameScopedKey } from '../utils/multiplayer';
import type { RoleTableItem } from 'types/roleTable';
import type { RuleBookData } from 'types/ruleBook';
import type { UserTableItem, UserTableTitle } from 'types/playerTable';

/**
 * File-usage graph for a game; which files are called by real cells
 * (roleMessage / voteMessage / morningMessage / default vote message),
 * which files call them transitively, and which files are orphaned.
 *
 * Everything rides records already subscribed by the game pages
 * (roleTable, voteMessageDefault, morningMessagesList, userTable): the
 * DataStore dedupes the subscriptions, so this adds no extra backend reads.
 * Rebuilt only when one of the sources or the files index changes.
 */
export const useFilePlacements = (
  gameId: string | undefined,
  index: ScriptFilesIndex
): FilePlacements => {
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId ?? '', {
    privacy: 'PUBLIC',
  });
  const [voteMessageDefault] = useList<string>('voteMessageDefault', gameId ?? '', {
    privacy: 'PUBLIC',
  });
  const [morningMessagesList] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId ?? '',
    { privacy: 'PUBLIC', defaultValue: {} }
  );
  const [userTable] = useList<UserTableItem[]>('userTable', gameId ?? '');
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId ?? '');
  const [ruleBook] = useValue<RuleBookData>(getGameScopedKey('ruleBook', gameId ?? ''), {
    privacy: 'PUBLIC',
  });

  return useMemo(() => {
    const cells: {
      label: string;
      text: string;
      cellKind?: FilePlacement['cellKind'];
      owner?: string;
      targetKey?: string;
      day?: number;
      column?: string;
      extraRefs?: { id?: string; path: string }[];
    }[] = [];

    const roles = roleTable?.scheduledUpdate?.value ?? roleTable?.value ?? [];
    for (const role of roles) {
      if (role.roleMessage) {
        cells.push({
          label: `Role message · ${role.role}`,
          text: role.roleMessage,
          cellKind: 'roleMessage',
          owner: role.role,
          targetKey: role.role,
          extraRefs: collectPieceFileRefs(role.roleMessage, index),
        });
      }
      if (role.voteMessage) {
        cells.push({
          label: `Vote message · ${role.role}`,
          text: role.voteMessage,
          cellKind: 'voteMessage',
          owner: role.role,
          targetKey: role.role,
          extraRefs: collectPieceFileRefs(role.voteMessage, index),
        });
      }
      // About Role is a composition cell too (modular games), and a plain
      // markdown cell for legacy games - both get scanned like the others.
      if (role.aboutRole) {
        cells.push({
          label: `About role · ${role.role}`,
          text: role.aboutRole,
          cellKind: 'aboutRole',
          owner: role.role,
          targetKey: role.role,
          extraRefs: collectPieceFileRefs(role.aboutRole, index),
        });
      }
    }

    const voteDefault = voteMessageDefault?.scheduledUpdate?.value ?? voteMessageDefault?.value;
    if (voteDefault) {
      cells.push({
        label: 'Default vote message',
        text: voteDefault,
        cellKind: 'voteDefault',
        extraRefs: collectPieceFileRefs(voteDefault, index),
      });
    }

    const users = userTable?.scheduledUpdate?.value ?? userTable?.value ?? [];
    const nameByEmail = new Map(
      users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.realName])
    );

    // Table cells (extra user + day columns) - these carry tag/file markers.
    // Only cells with a marker open are worth scanning; plain-text cells have
    // no file refs by construction.
    const titlesValue = userTableTitle?.scheduledUpdate?.value ?? userTableTitle?.value;
    const hasMarkers = (text: string | undefined): text is string =>
      !!text && (text.includes('[/') || text.includes('File('));
    users.forEach((user, playerIndex) => {
      const name = user.realName || user.email;
      user.playerData?.extraColumns?.forEach((text, columnIndex) => {
        if (!hasMarkers(text)) return;
        const column = titlesValue?.extraUserColumns?.[columnIndex] ?? `Column ${columnIndex + 1}`;
        cells.push({
          label: `${name} · ${column}`,
          text,
          cellKind: 'tableCell',
          owner: name,
          targetKey: formatCellAddress({ playerIndex, dayIndex: null, column }),
          column,
          extraRefs: collectPieceFileRefs(text, index),
        });
      });
      user.days?.forEach((dayData, dayIndex) => {
        dayData.extraColumns?.forEach((text, columnIndex) => {
          if (!hasMarkers(text)) return;
          const column = titlesValue?.extraDayColumns?.[columnIndex] ?? `Column ${columnIndex + 1}`;
          cells.push({
            label: `${name} · ${column} · Day ${dayIndex + 1}`,
            text,
            cellKind: 'tableCell',
            owner: name,
            targetKey: formatCellAddress({ playerIndex, dayIndex, column }),
            day: dayIndex + 1,
            column,
            extraRefs: collectPieceFileRefs(text, index),
          });
        });
      });
    });
    const mornings =
      morningMessagesList?.scheduledUpdate?.value ?? morningMessagesList?.value ?? {};
    for (const [email, days] of Object.entries(mornings)) {
      const name = nameByEmail.get(email.toLowerCase()) ?? email;
      (days ?? []).forEach((text, i) => {
        if (text) {
          cells.push({
            label: `Morning · ${name} · Day ${i + 1}`,
            text,
            cellKind: 'morningMessage',
            owner: name,
            targetKey: email.toLowerCase(),
            day: i + 1,
            extraRefs: collectPieceFileRefs(text, index),
          });
        }
      });
    }

    // The rule book acts as one cell: files it references count as used.
    const ruleBookValue = ruleBook?.scheduledUpdate?.value ?? ruleBook?.value;
    const ruleBookText =
      ruleBookValue?.modularContent !== undefined
        ? ruleBookValue.modularContent
        : (ruleBookValue?.content ?? '');
    if (ruleBookText) {
      cells.push({
        label: 'Rule book',
        text: ruleBookText,
        cellKind: 'ruleBook',
        extraRefs: collectPieceFileRefs(ruleBookText, index),
      });
    }

    return buildFilePlacements(index, cells);
  }, [
    index,
    roleTable,
    voteMessageDefault,
    morningMessagesList,
    userTable,
    userTableTitle,
    ruleBook,
  ]);
};
