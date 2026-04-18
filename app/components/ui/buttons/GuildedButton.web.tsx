import React from 'react';
import { useCSSVariable } from 'uniwind';
import {
    getGuildedInnerHeight,
    guildedButtonDefaults,
    type GuildedButtonBackground,
    type GuildedButtonProps,
    guildedButtonRingPresets,
} from './GuildedButton.shared';

const guildedButtonCSS = `
.guilded-button-root {
    display: inline-flex;
    width: fit-content;
    max-width: max-content;
    cursor: pointer;
    user-select: none;
    vertical-align: top;
}

.guilded-button-root.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.guilded-button-root:focus-visible {
    outline: none;
}

.guilded-button-place {
    display: block;
    width: fit-content;
    padding: 4px;
    padding-bottom: 9px;
    transition: transform 0.3s ease;
}

.guilded-button-root:not(.is-disabled):hover .guilded-button-place {
    transform: translateY(3px);
}

.guilded-button-shadow-wrapper {
    --r: 20px;
    --t-out: 2px;
    --t-mid: 6px;
    --t-in: 2px;
    --out-y: 3px;
    --out-blur: 3px;
    --out-alpha: 0.4;
    --in-y: 1px;
    --in-blur: 10px;
    --in-alpha: 0.3;
    display: block;
    width: fit-content;
    max-width: max-content;
    filter: drop-shadow(0px var(--out-y) var(--out-blur) rgba(0, 0, 0, var(--out-alpha)));
    transition: all 0.3s ease;
}

.guilded-button-root:not(.is-disabled):hover .guilded-button-shadow-wrapper {
    --out-y: 1px;
    --out-blur: 1px;
}

@supports (-webkit-appearance: none) and (not (-ms-ime-align: auto)) {
    .guilded-button-shadow-wrapper {
        transition: none;
    }

    .guilded-button-root:not(.is-disabled):hover .guilded-button-shadow-wrapper {
        animation: guilded-shadow-animation 0.3s ease forwards;
    }

    .guilded-button-root:not(:hover) .guilded-button-shadow-wrapper {
        animation: guilded-shadow-reset 0.3s ease forwards;
    }

    @keyframes guilded-shadow-animation {
        0% { --out-y: 3px; --out-blur: 3px; }
        5% { --out-y: 2.9px; --out-blur: 2.9px; }
        10% { --out-y: 2.8px; --out-blur: 2.8px; }
        15% { --out-y: 2.7px; --out-blur: 2.7px; }
        20% { --out-y: 2.6px; --out-blur: 2.6px; }
        25% { --out-y: 2.5px; --out-blur: 2.5px; }
        30% { --out-y: 2.4px; --out-blur: 2.4px; }
        35% { --out-y: 2.3px; --out-blur: 2.3px; }
        40% { --out-y: 2.2px; --out-blur: 2.2px; }
        45% { --out-y: 2.1px; --out-blur: 2.1px; }
        50% { --out-y: 2px; --out-blur: 2px; }
        55% { --out-y: 1.9px; --out-blur: 1.9px; }
        60% { --out-y: 1.8px; --out-blur: 1.8px; }
        65% { --out-y: 1.7px; --out-blur: 1.7px; }
        70% { --out-y: 1.6px; --out-blur: 1.6px; }
        75% { --out-y: 1.5px; --out-blur: 1.5px; }
        80% { --out-y: 1.4px; --out-blur: 1.4px; }
        85% { --out-y: 1.3px; --out-blur: 1.3px; }
        90% { --out-y: 1.2px; --out-blur: 1.2px; }
        95% { --out-y: 1.1px; --out-blur: 1.1px; }
        100% { --out-y: 1px; --out-blur: 1px; }
    }

    @keyframes guilded-shadow-reset {
        0% { --out-y: 1px; --out-blur: 1px; }
        5% { --out-y: 1.1px; --out-blur: 1.1px; }
        10% { --out-y: 1.2px; --out-blur: 1.2px; }
        15% { --out-y: 1.3px; --out-blur: 1.3px; }
        20% { --out-y: 1.4px; --out-blur: 1.4px; }
        25% { --out-y: 1.5px; --out-blur: 1.5px; }
        30% { --out-y: 1.6px; --out-blur: 1.6px; }
        35% { --out-y: 1.7px; --out-blur: 1.7px; }
        40% { --out-y: 1.8px; --out-blur: 1.8px; }
        45% { --out-y: 1.9px; --out-blur: 1.9px; }
        50% { --out-y: 2px; --out-blur: 2px; }
        55% { --out-y: 2.1px; --out-blur: 2.1px; }
        60% { --out-y: 2.2px; --out-blur: 2.2px; }
        65% { --out-y: 2.3px; --out-blur: 2.3px; }
        70% { --out-y: 2.4px; --out-blur: 2.4px; }
        75% { --out-y: 2.5px; --out-blur: 2.5px; }
        80% { --out-y: 2.6px; --out-blur: 2.6px; }
        85% { --out-y: 2.7px; --out-blur: 2.7px; }
        90% { --out-y: 2.8px; --out-blur: 2.8px; }
        95% { --out-y: 2.9px; --out-blur: 2.9px; }
        100% { --out-y: 3px; --out-blur: 3px; }
    }
}

.guilded-button-frame {
    position: relative;
    display: block;
    width: fit-content;
    max-width: max-content;
    padding: calc(var(--t-out) + var(--t-mid) + var(--t-in));
    background: linear-gradient(to top right, var(--ring-outer-dark) 50%, var(--ring-outer-light) 50%);
    --offset: 0px;
    --offset-right: 100%;
    --rad: var(--r);
    -webkit-mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    -webkit-mask-size: 51% 51%;
    mask-size: 51% 51%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
}

.guilded-button-frame::before {
    content: "";
    position: absolute;
    inset: var(--t-out);
    background: var(--ring-middle);
    z-index: 0;
    --offset: calc(-1 * var(--t-out));
    --offset-right: calc(100% + var(--t-out));
    --rad: calc(var(--r) + var(--t-out));
    -webkit-mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    -webkit-mask-size: 51% 51%;
    mask-size: 51% 51%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
}

.guilded-button-frame::after {
    content: "";
    position: absolute;
    inset: calc(var(--t-out) + var(--t-mid));
    background: linear-gradient(to top right, var(--ring-inner-light) 50%, var(--ring-inner-dark) 50%);
    z-index: 0;
    --t-total: calc(var(--t-out) + var(--t-mid));
    --offset: calc(-1 * var(--t-total));
    --offset-right: calc(100% + var(--t-total));
    --rad: calc(var(--r) + var(--t-total));
    -webkit-mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    -webkit-mask-size: 51% 51%;
    mask-size: 51% 51%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
}

.guilded-button-inner-box {
    position: relative;
    display: block;
    z-index: 1;
    overflow: hidden;
    max-width: 100%;
    box-sizing: border-box;
    --t-total: calc(var(--t-out) + var(--t-mid) + var(--t-in));
    --offset: calc(-1 * var(--t-total));
    --offset-right: calc(100% + var(--t-total));
    --rad: calc(var(--r) + var(--t-total));
    -webkit-mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    mask:
        radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
        radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
        radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
        radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
    -webkit-mask-size: 51% 51%;
    mask-size: 51% 51%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
}

.guilded-button-inner-box::before {
    content: "";
    position: absolute;
    inset: -40px;
    border: 40px solid rgba(0, 0, 0, var(--in-alpha));
    filter: blur(var(--in-blur));
    transform: translateY(var(--in-y));
    pointer-events: none;
    z-index: 0;
}

.guilded-button-content {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: var(--content-padding-y) var(--content-padding-x);
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
}

.guilded-button-content,
.guilded-button-content * {
    position: relative;
    z-index: 1;
}
`;

function useResolvedGuildedColor(value: string) {
    const isThemeToken = /^[a-zA-Z0-9-_]+$/.test(value);
    const resolvedThemeColor = useCSSVariable(isThemeToken ? `--color-${value}` : '--color-text');
    return isThemeToken ? String(resolvedThemeColor || value) : value;
}

function resolveGuildedBackground(background: GuildedButtonBackground) {
    if (typeof background === 'string') {
        return {
            from: background,
            to: background,
        };
    }

    return {
        from: background.from,
        to: background.to ?? background.from,
    };
}

function normalizeCssSize(value: number | string | undefined, fallback: string) {
    if (value === undefined) {
        return fallback;
    }

    return typeof value === 'number' ? `${value}px` : value;
}

function hasUtilityClass(className: string, patterns: RegExp[]) {
    return patterns.some((pattern) => pattern.test(className));
}

export default function GuildedButton({
    children,
    onPress,
    disabled = false,
    className = '',
    rootClassName = '',
    variant = guildedButtonDefaults.variant,
    radius = guildedButtonDefaults.radius,
    outerThickness = guildedButtonDefaults.outerThickness,
    middleThickness = guildedButtonDefaults.middleThickness,
    innerThickness = guildedButtonDefaults.innerThickness,
    outerShadowYOffset = guildedButtonDefaults.outerShadowYOffset,
    outerShadowBlur = guildedButtonDefaults.outerShadowBlur,
    outerShadowAlpha = guildedButtonDefaults.outerShadowAlpha,
    innerShadowYOffset = guildedButtonDefaults.innerShadowYOffset,
    innerShadowBlur = guildedButtonDefaults.innerShadowBlur,
    innerShadowAlpha = guildedButtonDefaults.innerShadowAlpha,
    width,
    height,
    contentPaddingX = guildedButtonDefaults.contentPaddingX,
    contentPaddingY = guildedButtonDefaults.contentPaddingY,
    background = guildedButtonDefaults.background,
}: GuildedButtonProps) {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPress?.();
        }
    };

    const resolvedBackground = resolveGuildedBackground(background);
    const resolvedCenterBackgroundFrom = useResolvedGuildedColor(resolvedBackground.from);
    const resolvedCenterBackgroundTo = useResolvedGuildedColor(resolvedBackground.to);
    const ringPalette = guildedButtonRingPresets[variant];
    const totalThickness = outerThickness + middleThickness + innerThickness;
    const resolvedInnerHeight = getGuildedInnerHeight(height, totalThickness);

    const hasWidthUtility = hasUtilityClass(className, [/\bw-/, /\bmin-w-/, /\bmax-w-/]);
    const hasHeightUtility = hasUtilityClass(className, [/\bh-/, /\bmin-h-/, /\bmax-h-/]);
    const hasBackgroundUtility = hasUtilityClass(className, [/\bbg-/, /\bfrom-/, /\bto-/]);

    const cssVariables = {
        '--r': `${radius}px`,
        '--t-out': `${outerThickness}px`,
        '--t-mid': `${middleThickness}px`,
        '--t-in': `${innerThickness}px`,
        '--out-y': `${outerShadowYOffset}px`,
        '--out-blur': `${outerShadowBlur}px`,
        '--out-alpha': String(outerShadowAlpha),
        '--in-y': `${innerShadowYOffset}px`,
        '--in-blur': `${innerShadowBlur}px`,
        '--in-alpha': String(innerShadowAlpha),
        '--content-padding-x': `${contentPaddingX}px`,
        '--content-padding-y': `${contentPaddingY}px`,
        '--center-bg-from': resolvedCenterBackgroundFrom,
        '--center-bg-to': resolvedCenterBackgroundTo,
        '--ring-outer-dark': ringPalette.outerDark,
        '--ring-outer-light': ringPalette.outerLight,
        '--ring-middle': ringPalette.middle,
        '--ring-inner-light': ringPalette.innerLight,
        '--ring-inner-dark': ringPalette.innerDark,
    } as React.CSSProperties & Record<string, string>;

    const innerBoxStyle: React.CSSProperties = {
        ...(width !== undefined
            ? { width: normalizeCssSize(width, 'fit-content') }
            : hasWidthUtility
              ? {}
              : { width: 'fit-content' }),
        ...(resolvedInnerHeight !== undefined
            ? { height: normalizeCssSize(resolvedInnerHeight, 'auto') }
            : hasHeightUtility
              ? {}
              : {}),
        ...(hasBackgroundUtility
            ? {}
            : {
                  backgroundColor: resolvedCenterBackgroundFrom,
                  backgroundImage: `linear-gradient(to bottom, ${resolvedCenterBackgroundFrom}, ${resolvedCenterBackgroundTo})`,
              }),
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: guildedButtonCSS }} />
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled || undefined}
                className={`guilded-button-root ${disabled ? 'is-disabled' : ''} ${rootClassName}`.trim()}
                onClick={disabled ? undefined : onPress}
                onKeyDown={handleKeyDown}
            >
                <div className="guilded-button-place">
                    <div className="guilded-button-shadow-wrapper" style={cssVariables}>
                        <div className="guilded-button-frame">
                            <div className={`guilded-button-inner-box ${className}`.trim()} style={innerBoxStyle}>
                                <div className="guilded-button-content">{children}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
