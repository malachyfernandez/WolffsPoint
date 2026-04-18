export type GuildedButtonBackground =
    | string
    | {
          from: string;
          to?: string;
      };

export type GuildedButtonVariant = 'gold' | 'silver';

export interface GuildedButtonRingPalette {
    outerDark: string;
    outerLight: string;
    middle: string;
    innerLight: string;
    innerDark: string;
}

export interface GuildedButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    className?: string;
    rootClassName?: string;
    variant?: GuildedButtonVariant;
    radius?: number;
    outerThickness?: number;
    middleThickness?: number;
    innerThickness?: number;
    outerShadowYOffset?: number;
    outerShadowBlur?: number;
    outerShadowAlpha?: number;
    innerShadowYOffset?: number;
    innerShadowBlur?: number;
    innerShadowAlpha?: number;
    width?: number | string;
    height?: number | string;
    contentPaddingX?: number;
    contentPaddingY?: number;
    background?: GuildedButtonBackground;
}

export const guildedButtonRingPresets: Record<GuildedButtonVariant, GuildedButtonRingPalette> = {
    gold: {
        outerDark: '#bf6c18',
        outerLight: '#ecd9ab',
        middle: '#d9b458',
        innerLight: '#c79a2e',
        innerDark: '#ba681e',
    },
    silver: {
        outerDark: '#595f66',
        outerLight: '#dde3e8',
        middle: '#aeb5bd',
        innerLight: '#818a93',
        innerDark: '#6f7780',
    },
};

export const guildedButtonDefaults = {
    variant: 'gold' as GuildedButtonVariant,
    radius: 8,
    outerThickness: 1,
    middleThickness: 3,
    innerThickness: 1,
    outerShadowYOffset: 3,
    outerShadowBlur: 3,
    outerShadowAlpha: 0.4,
    innerShadowYOffset: 1,
    innerShadowBlur: 10,
    innerShadowAlpha: 0.3,
    contentPaddingX: 15,
    contentPaddingY: 8,
    background: 'inner-background' as GuildedButtonBackground,
};

export function getGuildedInnerHeight(height: number | string | undefined, totalThickness: number) {
    if (typeof height !== 'number') {
        return height;
    }

    return Math.max(height - totalThickness * 2, 0);
}
