import React, { ReactElement, useState, useRef, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { usePlayerStatus } from '../../../contexts/PlayerStatusContext';
import { guildedButtonRingPresets } from '../ui/buttons/GuildedButton.shared';
import FadeInAfterDelay from '../ui/loading/FadeInAfterDelay';

// --- ISLAND TAB SVG BACKGROUND ---
interface IslandTabBackgroundProps {
    isActive: boolean;
    isCondensed?: boolean;
}

const IslandTabBackground = ({ isActive, isCondensed = false }: IslandTabBackgroundProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            setDimensions({
                width: entries[0].contentRect.width,
                height: entries[0].contentRect.height,
            });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { width, height } = dimensions;

    const R = 20;
    const T = 5;
    const pw = 140;
    const ph = 22;

    let pathD = "";

    if (width > 0 && height > 0) {
        const cw = width / 2;
        const xL = T;
        const xR = width - T;

        if (isCondensed) {
            // Condensed: Split bowl with flat plateau in middle (10% of width, min 0)
            const plateauWidth = Math.max(width * 0.8 - 80, 0);
            const yApex = T;
            const yShoulder = yApex + R;
            const yBase = height + T;
            const halfPlateau = plateauWidth / 2;

            pathD = `
                M ${xL} ${yBase}
                L ${xL} ${yShoulder + R}
                A ${R} ${R} 0 0 1 ${xL + R} ${yShoulder}
                L ${cw - halfPlateau - R} ${yShoulder}
                A ${R} ${R} 0 0 1 ${cw - halfPlateau} ${yShoulder - R}
                L ${cw - halfPlateau} ${yShoulder - R}
                L ${cw + halfPlateau} ${yShoulder - R}
                A ${R} ${R} 0 0 1 ${cw + halfPlateau + R} ${yShoulder}
                L ${xR - R} ${yShoulder}
                A ${R} ${R} 0 0 1 ${xR} ${yShoulder + R}
                L ${xR} ${yBase}
                Z
            `;
        } else {
            // Expanded: Full 9-part island with raised platform
            const yApex = T;
            const yPlatform = yApex + R;
            const yShoulder = yPlatform + ph;
            const yBase = height + T;

            pathD = `
                M ${xL} ${yBase}
                L ${xL} ${yShoulder + R}
                A ${R} ${R} 0 0 1 ${xL + R} ${yShoulder}
                L ${cw - pw / 2} ${yShoulder}
                A ${R} ${R} 0 0 0 ${cw - pw / 2 + R} ${yShoulder - R}
                L ${cw - pw / 2 + R} ${yPlatform}
                L ${cw - R} ${yPlatform}
                A ${R} ${R} 0 0 1 ${cw} ${yApex}
                A ${R} ${R} 0 0 1 ${cw + R} ${yPlatform}
                L ${cw + pw / 2 - R} ${yPlatform}
                L ${cw + pw / 2 - R} ${yShoulder - R}
                A ${R} ${R} 0 0 0 ${cw + pw / 2} ${yShoulder}
                L ${xR - R} ${yShoulder}
                A ${R} ${R} 0 0 1 ${xR} ${yShoulder + R}
                L ${xR} ${yBase}
                Z
            `;
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            {width > 0 && height > 0 && (
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                    <defs>
                        <linearGradient id="island-outer" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="26%" stopColor="var(--ring-outer-dark)" />
                            <stop offset="100%" stopColor="var(--ring-outer-light)" />
                        </linearGradient>
                        <linearGradient id="island-inner" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="22%" stopColor="var(--ring-inner-light)" />
                            <stop offset="100%" stopColor="var(--ring-inner-dark)" />
                        </linearGradient>
                        <clipPath id="island-clip">
                            <path d={pathD} />
                        </clipPath>
                        <pattern id="island-tex" patternUnits="userSpaceOnUse" width="642" height="642">
                            <image href="https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq" width="642" height="642" />
                        </pattern>
                    </defs>

                    <path d={pathD} stroke="url(#island-outer)" strokeWidth="10" fill="none" strokeLinejoin="round" />
                    <path d={pathD} stroke="var(--ring-middle)" strokeWidth="8" fill="none" strokeLinejoin="round" />
                    <path d={pathD} stroke="url(#island-inner)" strokeWidth="2" fill="none" strokeLinejoin="round" />

                    <g clipPath="url(#island-clip)">
                        <path
                            d={pathD}
                            fill={isActive ? 'var(--active-surface-bg)' : '#383838'}
                            style={{ transition: 'fill 0.2s ease' }}
                        />
                        <path
                            d={pathD}
                            fill="url(#island-tex)"
                            style={{ mixBlendMode: 'multiply', opacity: isActive ? 0.42 : 0, transition: 'opacity 0.2s ease' }}
                        />
                        {isActive && (
                            <path d={pathD} stroke="rgba(255, 255, 255, 0.24)" strokeWidth="2" transform="translate(0, 1)" fill="none" />
                        )}
                    </g>
                </svg>
            )}
        </div>
    );
};

export type GameTabDefinition<TTab extends string> = {
    label: string;
    condensedLabel: string;
    value: TTab;
    icon: React.ReactNode;
};

interface GameTabBarProps<TTab extends string> {
    activeTab: TTab;
    onTabPress: (tab: TTab) => void;
    tabs: GameTabDefinition<TTab>[];
    activeTabIndent?: number;
    iconSize?: number;
    iconStrokeWidth?: number;
}

const gameTabBarCSS = `
.guilded-game-tab-bar {
    --tab-bottom-extension: 28px;
    --tab-bottom-buffer: 22px;
    --center-platform-width: 140px;
    --center-platform-height: 22px;
    position: relative;
    z-index: 0;
    display: flex;
    width: 100%;
    align-items: flex-end;
    gap: 4px;
    padding: 0 8px;
    margin-bottom: calc(-32px - var(--tab-bottom-extension) - var(--tab-bottom-buffer));
    box-sizing: border-box;
    overflow: visible;
}

.guilded-game-tab-wrap {
    margin-bottom: -12px;
    --tab-surface-radius: 20px;
    --tab-t-out: 1px;
    --tab-t-mid: 3px;
    --tab-t-in: 1px;
    position: relative;
    flex: var(--tab-flex, 1) 1 0%;
    min-width: 0;
    align-self: flex-end;
    filter: drop-shadow(0px 5px 8px rgba(0, 0, 0, 0.18));
    transition: transform 0.2s ease, filter 0.2s ease;
    z-index: 0;
    padding-bottom: var(--tab-bottom-buffer);
}

.guilded-game-tab-wrap.is-active {
    transform: translateY(var(--active-indent, 18px));
    filter: drop-shadow(0px 6px 9px rgba(0, 0, 0, 0.2));
}

.guilded-game-tab-wrap:not(.is-active):hover {
    transform: translateY(2px);
    filter: drop-shadow(0px 6px 9px rgba(0, 0, 0, 0.2));
}

.guilded-game-tab-button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    text-align: inherit;
    font: inherit;
}

.guilded-game-tab-button:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.7);
    outline-offset: 4px;
    border-radius: calc(var(--tab-surface-radius) + var(--tab-t-out) + var(--tab-t-mid) + var(--tab-t-in));
}

.guilded-game-tab-outer {
    width: 100%;
    padding: var(--tab-t-out) var(--tab-t-out) 0 var(--tab-t-out);
    border-radius: calc(var(--tab-surface-radius) + var(--tab-t-out) + var(--tab-t-mid) + var(--tab-t-in)) calc(var(--tab-surface-radius) + var(--tab-t-out) + var(--tab-t-mid) + var(--tab-t-in)) 0 0;
    background: linear-gradient(to top right, var(--ring-outer-dark) 26%, var(--ring-outer-light) 100%);
    box-sizing: border-box;
}

.guilded-game-tab-middle {
    width: 100%;
    padding: var(--tab-t-mid) var(--tab-t-mid) 0 var(--tab-t-mid);
    border-radius: calc(var(--tab-surface-radius) + var(--tab-t-mid) + var(--tab-t-in)) calc(var(--tab-surface-radius) + var(--tab-t-mid) + var(--tab-t-in)) 0 0;
    background: var(--ring-middle);
    box-sizing: border-box;
}

.guilded-game-tab-inner {
    width: 100%;
    padding: var(--tab-t-in) var(--tab-t-in) 0 var(--tab-t-in);
    border-radius: calc(var(--tab-surface-radius) + var(--tab-t-in)) calc(var(--tab-surface-radius) + var(--tab-t-in)) 0 0;
    background: linear-gradient(to top right, var(--ring-inner-light) 22%, var(--ring-inner-dark) 100%);
    box-sizing: border-box;
}

.guilded-game-tab-surface {
    position: relative;
    display: flex;
    min-height: calc(82px + var(--tab-bottom-extension));
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0px 4px calc(14px + var(--tab-bottom-extension));
    border-radius: var(--tab-surface-radius) var(--tab-surface-radius) 0 0;
    background-color: #2f2f2f;
    color: var(--tab-text-inactive);
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
    overflow: visible;
}

/* Container to hold the text/icon over the absolute SVG */
.guilded-island-surface {
    position: relative;
    display: flex;
    min-height: calc(82px + var(--tab-bottom-extension) + var(--center-platform-height));
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0px 4px calc(14px + var(--tab-bottom-extension));
    color: var(--tab-text-inactive);
    transition: color 0.2s ease;
    box-sizing: border-box;
}

.guilded-game-tab-wrap.is-active .guilded-island-surface {
    color: var(--tab-text-active);
}

/* Move center tab up as a whole element (only for full 9-part island) */
.guilded-game-tab-wrap.is-center:not(.is-condensed-island) {
    transform: translateY(-13px);
}

.guilded-game-tab-wrap.is-center:not(.is-condensed-island):hover {
    transform: translateY(-11px);
}

/* --------------------------------------------------------
   NORMAL TAB STYLES
-------------------------------------------------------- */

.guilded-game-tab-wrap.is-active .guilded-game-tab-surface {
    background-color: var(--active-surface-bg);
    color: var(--tab-text-active);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.guilded-game-tab-wrap:not(.is-active):hover .guilded-game-tab-surface {
    background-color: #383838;
}

.guilded-game-tab-texture {
    position: absolute;
    inset: 0;
    opacity: 0;
    background-image: url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq');
    background-repeat: repeat;
    background-size: 642px 642px;
    mix-blend-mode: multiply;
    pointer-events: none;
    transition: opacity 0.2s ease;
    border-radius: inherit;
}

.guilded-game-tab-wrap.is-active .guilded-game-tab-texture {
    opacity: 0.42;
}

.guilded-game-tab-icon,
.guilded-game-tab-label {
    position: relative;
    z-index: 1;
}

.guilded-game-tab-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
    margin-top: -12px;
}

.guilded-game-tab-label {
    display: block;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
    font-size: 8px;
    line-height: 1.15;
    font-weight: 1000;
    letter-spacing: 0.05em;
    text-align: center;
    font-family: 'LibreBaskerville', serif;
    text-transform: uppercase;
    margin-top: -0px;
}

/* Larger text for center tab in full island mode */
.guilded-game-tab-wrap.is-expanded-island .guilded-game-tab-label {
    margin-top: 5px;
    font-size: 12px;
}

.guilded-game-tab-wrap.is-expanded-island .guilded-game-tab-icon {
    margin-top: 10px;
}

/* Allow text wrapping for center nav tab only */
.guilded-game-tab-wrap.is-center .guilded-game-tab-label {
    white-space: normal;
    word-wrap: break-word;
}

/* Decrease font size for non-center tabs on small screens */
@media (max-width: 380px) {
    .guilded-game-tab-wrap:not(.is-center) .guilded-game-tab-label {
        font-size: 7px;
    }
}
`;

function cloneTabIcon(icon: React.ReactNode, color: string, size: number, strokeWidth: number) {
    if (!React.isValidElement(icon)) {
        return icon;
    }

    return React.cloneElement(icon as ReactElement<any>, {
        color,
        width: size,
        height: size,
        strokeWidth,
    });
}

const GameTabBar = <TTab extends string>({
    activeTab,
    onTabPress,
    tabs,
    activeTabIndent = 5,
    iconSize = 30,
    iconStrokeWidth = 0,
}: GameTabBarProps<TTab>) => {
    const { width } = useWindowDimensions();
    const hasTrueMiddle = tabs.length % 2 === 1;
    const centerIndex = Math.floor(tabs.length / 2);
    const useCondensed = width < 600;
    const useCondensedIsland = width < 800;
    const { isPlayerDead } = usePlayerStatus();
    const palette = isPlayerDead ? guildedButtonRingPresets.ghostly : guildedButtonRingPresets.gold;
    const textColor = String(useCSSVariable('--color-text') || '#1a1a1a');
    const innerBackground = String(useCSSVariable('--color-inner-background') || 'rgb(165, 159, 150)');

    return (
        <FadeInAfterDelay delayMs={200}>
            <style dangerouslySetInnerHTML={{ __html: gameTabBarCSS }} />
            <div
                className="guilded-game-tab-bar"
                style={
                    {
                        '--ring-outer-dark': palette.outerDark,
                        '--ring-outer-light': palette.outerLight,
                        '--ring-middle': palette.middle,
                        '--ring-inner-light': palette.innerLight,
                        '--ring-inner-dark': palette.innerDark,
                        '--tab-text-active': textColor,
                        '--tab-text-inactive': palette.middle,
                        '--active-surface-bg': innerBackground,
                        '--active-indent': `${activeTabIndent}px`,
                    } as React.CSSProperties & Record<string, string>
                }
            >
                {tabs.map((tab, index) => {
                    const isCenter = hasTrueMiddle && index === centerIndex;
                    const isActive = activeTab === tab.value;
                    const tabFlex = isCenter ? '1.35' : '1';
                    const label = useCondensed ? tab.condensedLabel : tab.label;
                    const iconColor = isActive ? textColor : palette.middle;

                    return (
                        <div
                            key={tab.value}
                            className={`guilded-game-tab-wrap ${isActive ? 'is-active' : ''} ${isCenter ? 'is-center' : ''} ${isCenter && useCondensedIsland ? 'is-condensed-island' : ''} ${isCenter && !useCondensedIsland ? 'is-expanded-island' : ''}`.trim()}
                            style={{ '--tab-flex': tabFlex } as React.CSSProperties & Record<string, string>}
                        >
                            <button
                                type="button"
                                className="guilded-game-tab-button"
                                onClick={() => onTabPress(tab.value)}
                                aria-pressed={isActive}
                            >
                                {isCenter ? (
                                    <div className="guilded-island-surface">
                                        <IslandTabBackground isActive={isActive} isCondensed={useCondensedIsland} />
                                        <div className="guilded-game-tab-icon">{cloneTabIcon(tab.icon, iconColor, iconSize, iconStrokeWidth)}</div>
                                        <span className="guilded-game-tab-label">{label}</span>
                                    </div>
                                ) : (
                                    <div className="guilded-game-tab-outer">
                                        <div className="guilded-game-tab-middle">
                                            <div className="guilded-game-tab-inner">
                                                <div className="guilded-game-tab-surface">
                                                    <div className="guilded-game-tab-texture" />
                                                    <div className="guilded-game-tab-icon">{cloneTabIcon(tab.icon, iconColor, iconSize, iconStrokeWidth)}</div>
                                                    <span className="guilded-game-tab-label">{label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </FadeInAfterDelay>
    );
};

export default GameTabBar;