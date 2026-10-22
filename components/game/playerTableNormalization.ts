import {
  DayData,
  UserTableColumnVisibility,
  UserTableItem,
  UserTableTitle,
} from 'types/playerTable';
import {
  ColumnSizeOption,
  PlayerPageColumnSizes,
  defaultPlayerPageColumnSizes,
} from './playerTableColumnSizing';
import { adoptCertificationIdentities } from '../../utils/certificationIdentity';

const normalizeStringColumns = (values: string[] | undefined, targetLength: number) => {
  return Array.from({ length: targetLength }, (_, index) => values?.[index] ?? '');
};

const normalizeBooleanColumns = (values: boolean[] | undefined, targetLength: number) => {
  return Array.from({ length: targetLength }, (_, index) => values?.[index] ?? true);
};

const normalizeSizeColumns = (values: ColumnSizeOption[] | undefined, targetLength: number) => {
  return Array.from({ length: targetLength }, (_, index) => values?.[index] ?? 'small');
};

const normalizeDay = (day: DayData | undefined, targetDayColumns: number): DayData => {
  return {
    ...day,
    vote: day?.vote ?? '',
    voteInputs: day?.voteInputs,
    voteInputKey: day?.voteInputKey,
    action: day?.action ?? '',
    voteMultiplier: day?.voteMultiplier,
    extraColumns: normalizeStringColumns(day?.extraColumns, targetDayColumns),
  };
};

export const getTargetDayCount = (
  users: UserTableItem[] | undefined,
  minimumDayCount: number = 0
) => {
  const userDayCount = Math.max(0, ...(users ?? []).map((user) => user.days?.length ?? 0));
  return Math.max(minimumDayCount, userDayCount);
};

export const normalizePlayerPageState = ({
  titles,
  visibility,
  users,
  targetDayCount,
  columnSizes,
}: {
  titles?: UserTableTitle;
  visibility?: UserTableColumnVisibility;
  users?: UserTableItem[];
  targetDayCount: number;
  columnSizes?: PlayerPageColumnSizes;
}) => {
  const normalizedTitles: UserTableTitle = titles ?? { extraUserColumns: [], extraDayColumns: [] };
  const normalizedVisibility: UserTableColumnVisibility = {
    extraUserColumns: normalizeBooleanColumns(
      visibility?.extraUserColumns,
      normalizedTitles.extraUserColumns.length
    ),
    extraDayColumns: normalizeBooleanColumns(
      visibility?.extraDayColumns,
      normalizedTitles.extraDayColumns.length
    ),
  };

  const normalizedUsers: UserTableItem[] = (users ?? []).map((user) => ({
    ...user,
    playerData: {
      ...user.playerData,
      extraColumns: normalizeStringColumns(
        user.playerData.extraColumns,
        normalizedTitles.extraUserColumns.length
      ),
    },
    days: Array.from({ length: targetDayCount }, (_, index) =>
      normalizeDay(user.days?.[index], normalizedTitles.extraDayColumns.length)
    ),
  }));

  const baseSizes = columnSizes ?? defaultPlayerPageColumnSizes;
  const normalizedColumnSizes: PlayerPageColumnSizes = {
    playerBaseColumns: {
      status: baseSizes.playerBaseColumns?.status ?? 'small',
      player: baseSizes.playerBaseColumns?.player ?? 'small',
    },
    playerExtraColumns: normalizeSizeColumns(
      baseSizes.playerExtraColumns,
      normalizedTitles.extraUserColumns.length
    ),
    dayBaseColumns: {
      vote: baseSizes.dayBaseColumns?.vote ?? 'small',
      action: baseSizes.dayBaseColumns?.action ?? 'small',
      morningMessage: baseSizes.dayBaseColumns?.morningMessage ?? 'small',
    },
    dayExtraColumns: normalizeSizeColumns(
      baseSizes.dayExtraColumns,
      normalizedTitles.extraDayColumns.length
    ),
  };

  // Deterministic only for initial adoption: both table normalizers may run
  // before their first writes settle. Persisted IDs are always kept thereafter.
  const seed = JSON.stringify([
    normalizedUsers.map((user) => [user.email, user.realName]),
    normalizedTitles.extraUserColumns,
    normalizedTitles.extraDayColumns,
  ]);
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  let identityIndex = 0;
  const usedIds = new Set([
    ...normalizedUsers.flatMap((user) => [user.id, ...user.days.map((day) => day.id)]),
    ...(normalizedTitles.dayIds ?? []),
    ...(normalizedTitles.extraUserColumnIds ?? []),
    ...(normalizedTitles.extraDayColumnIds ?? []),
  ]);
  const identified = adoptCertificationIdentities(
    normalizedUsers,
    normalizedTitles,
    targetDayCount,
    (kind) => {
      let id: string;
      do {
        id = `${kind}-${(hash >>> 0).toString(36)}-${identityIndex++}`;
      } while (usedIds.has(id));
      usedIds.add(id);
      return id;
    }
  );
  return {
    titles: identified.titles,
    visibility: normalizedVisibility,
    users: identified.users,
    columnSizes: normalizedColumnSizes,
  };
};
