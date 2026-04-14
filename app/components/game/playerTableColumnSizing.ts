import { getGameScopedKey } from '../../../utils/multiplayer';

export type ColumnSizeOption = 'small' | 'medium' | 'large';

export type PlayerPageColumnSizes = {
    playerBaseColumns: {
        status: ColumnSizeOption;
        player: ColumnSizeOption;
    };
    playerExtraColumns: ColumnSizeOption[];
    dayBaseColumns: {
        vote: ColumnSizeOption;
        action: ColumnSizeOption;
    };
    dayExtraColumns: ColumnSizeOption[];
};

export const defaultPlayerPageColumnSizes: PlayerPageColumnSizes = {
    playerBaseColumns: {
        status: 'small',
        player: 'small',
    },
    playerExtraColumns: [],
    dayBaseColumns: {
        vote: 'small',
        action: 'small',
    },
    dayExtraColumns: [],
};

export const getPlayerPageColumnSizesKey = (gameId: string) => {
    return getGameScopedKey('playerPageColumnSizes', gameId);
};

export const getWidthForColumnSize = (baseWidth: number, size?: ColumnSizeOption) => {
    if (size === 'large') {
        return baseWidth * 3;
    }

    if (size === 'medium') {
        return baseWidth * 2;
    }

    return baseWidth;
};

export const getInnerTextWidth = (columnWidth: number, reservedSpace: number = 32) => {
    return Math.max(columnWidth - reservedSpace, 24);
};
