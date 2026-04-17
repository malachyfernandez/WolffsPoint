import { getGameScopedKey } from '../../../utils/multiplayer';

export type ColumnSizeOption = 'small' | 'medium' | 'large';

export type NightlyPageColumnSizes = {
    vote: ColumnSizeOption;
    action: ColumnSizeOption;
    morningMessage: ColumnSizeOption;
};

export const defaultNightlyPageColumnSizes: NightlyPageColumnSizes = {
    vote: 'small',
    action: 'small',
    morningMessage: 'medium',
};

export const getNightlyPageColumnSizesKey = (gameId: string) => {
    return getGameScopedKey('nightlyPageColumnSizes', gameId);
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
