/**
 * GuildedButton - Web-only guilded-style button with scooped corners and layered gradients
 * 
 * Replicates the exact guilded button from testiongButton.html with:
 * - Scooped corners via radial gradient masks
 * - Three-layer gradient effect (outer, middle, inner)
 * - Drop shadow with Safari-specific 20-step animation
 * - Inner shadow
 * - 3px hover translate
 * 
 * @web-only This component is designed for web use. On native, it falls back to accent styling.
 */
import React from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import {
    getGuildedInnerHeight,
    guildedButtonDefaults,
    type GuildedButtonProps,
    guildedButtonRingPresets,
} from './GuildedButton.shared';

export const GuildedButton = ({
    children,
    onPress,
    disabled = false,
    variant = guildedButtonDefaults.variant,
    radius = guildedButtonDefaults.radius,
    outerThickness = guildedButtonDefaults.outerThickness,
    middleThickness = guildedButtonDefaults.middleThickness,
    innerThickness = guildedButtonDefaults.innerThickness,
    width,
    height,
    contentPaddingX = guildedButtonDefaults.contentPaddingX,
    contentPaddingY = guildedButtonDefaults.contentPaddingY,
    background = guildedButtonDefaults.background,
}: GuildedButtonProps) => {
    const effectiveRadius = radius + outerThickness + middleThickness + innerThickness;
    const backgroundColor = typeof background === 'string' ? background : background.from;
    const ringPalette = guildedButtonRingPresets[variant];
    const totalThickness = outerThickness + middleThickness + innerThickness;
    const resolvedWidth = width as DimensionValue | undefined;
    const resolvedHeight = getGuildedInnerHeight(height, totalThickness) as DimensionValue | undefined;

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={[
                nativeStyles.container,
                {
                    borderRadius: effectiveRadius,
                    borderWidth: outerThickness,
                    borderColor: ringPalette.outerDark,
                    backgroundColor: ringPalette.outerDark,
                    padding: middleThickness + innerThickness,
                },
                disabled && nativeStyles.disabled,
            ]}
        >
            <View
                style={[
                    nativeStyles.inner,
                    {
                        borderRadius: radius + middleThickness + innerThickness,
                        borderWidth: middleThickness,
                        borderColor: ringPalette.middle,
                        paddingHorizontal: contentPaddingX,
                        paddingVertical: contentPaddingY,
                        backgroundColor,
                        width: resolvedWidth,
                        height: resolvedHeight,
                    },
                ]}
            >
                {children}
            </View>
        </Pressable>
    );
};

const nativeStyles = StyleSheet.create({
    container: {
        alignSelf: 'flex-start',
    },
    inner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
});

export default GuildedButton;
