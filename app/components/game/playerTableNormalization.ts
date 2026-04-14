import { DayData, UserTableColumnVisibility, UserTableItem, UserTableTitle } from 'types/playerTable';
import { ColumnSizeOption, PlayerPageColumnSizes, defaultPlayerPageColumnSizes } from './playerTableColumnSizing';

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
        vote: day?.vote ?? '',
        action: day?.action ?? '',
        extraColumns: normalizeStringColumns(day?.extraColumns, targetDayColumns),
    };
};

export const getTargetDayCount = (users: UserTableItem[] | undefined, minimumDayCount: number = 0) => {
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
        extraUserColumns: normalizeBooleanColumns(visibility?.extraUserColumns, normalizedTitles.extraUserColumns.length),
        extraDayColumns: normalizeBooleanColumns(visibility?.extraDayColumns, normalizedTitles.extraDayColumns.length),
    };

    const normalizedUsers: UserTableItem[] = (users ?? []).map((user) => ({
        ...user,
        playerData: {
            ...user.playerData,
            extraColumns: normalizeStringColumns(user.playerData.extraColumns, normalizedTitles.extraUserColumns.length),
        },
        days: Array.from({ length: targetDayCount }, (_, index) => normalizeDay(user.days?.[index], normalizedTitles.extraDayColumns.length)),
    }));

    const baseSizes = columnSizes ?? defaultPlayerPageColumnSizes;
    const normalizedColumnSizes: PlayerPageColumnSizes = {
        playerBaseColumns: {
            status: baseSizes.playerBaseColumns?.status ?? 'small',
            player: baseSizes.playerBaseColumns?.player ?? 'small',
        },
        playerExtraColumns: normalizeSizeColumns(baseSizes.playerExtraColumns, normalizedTitles.extraUserColumns.length),
        dayBaseColumns: {
            vote: baseSizes.dayBaseColumns?.vote ?? 'small',
            action: baseSizes.dayBaseColumns?.action ?? 'small',
        },
        dayExtraColumns: normalizeSizeColumns(baseSizes.dayExtraColumns, normalizedTitles.extraDayColumns.length),
    };

    return {
        titles: normalizedTitles,
        visibility: normalizedVisibility,
        users: normalizedUsers,
        columnSizes: normalizedColumnSizes,
    };
};
