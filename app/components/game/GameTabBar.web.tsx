import React, { ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { guildedButtonRingPresets } from '../ui/buttons/GuildedButton.shared';

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
}

const gameTabBarCSS = `
.guilded-game-tab-bar {
    position: relative;
    z-index: 2;
    display: flex;
    width: 100%;
    align-items: flex-end;
    gap: 10px;
    padding: 0 18px;
    margin-bottom: -5px;
    box-sizing: border-box;
}

.guilded-game-tab-wrap {
    position: relative;
    flex: var(--tab-flex, 1) 1 0%;
    min-width: 0;
    align-self: flex-end;
    filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.18));
    transition: transform 0.2s ease, filter 0.2s ease;
}

.guilded-game-tab-wrap.is-active {
    transform: translateY(5px);
    z-index: 3;
    filter: drop-shadow(0px 8px 14px rgba(0, 0, 0, 0.2));
}

.guilded-game-tab-wrap:not(.is-active):hover {
    transform: translateY(2px);
    filter: drop-shadow(0px 7px 12px rgba(0, 0, 0, 0.2));
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
    border-radius: 24px;
}

.guilded-game-tab-outer {
    width: 100%;
    padding: 1px 1px 0 1px;
    border-radius: 32px 32px 0 0;
    background: linear-gradient(to top right, var(--ring-outer-dark) 26%, var(--ring-outer-light) 100%);
    box-sizing: border-box;
}

.guilded-game-tab-middle {
    width: 100%;
    padding: 3px 3px 0 3px;
    border-radius: 31px 31px 0 0;
    background: var(--ring-middle);
    box-sizing: border-box;
}

.guilded-game-tab-inner {
    width: 100%;
    padding: 1px 1px 0 1px;
    border-radius: 28px 28px 0 0;
    background: linear-gradient(to top right, var(--ring-inner-light) 22%, var(--ring-inner-dark) 100%);
    box-sizing: border-box;
}

.guilded-game-tab-surface {
    position: relative;
    display: flex;
    min-height: 78px;
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 16px 13px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(180deg, rgba(52, 52, 52, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%);
    color: var(--tab-text-inactive);
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
    overflow: hidden;
}

.guilded-game-tab-surface::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 28%, rgba(0, 0, 0, 0.06) 100%);
    pointer-events: none;
}

.guilded-game-tab-wrap.is-active .guilded-game-tab-surface {
    background: linear-gradient(180deg, var(--active-surface-top) 0%, var(--active-surface-bottom) 100%);
    color: var(--tab-text-active);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.guilded-game-tab-wrap:not(.is-active):hover .guilded-game-tab-surface {
    background: linear-gradient(180deg, rgba(62, 62, 62, 0.98) 0%, rgba(34, 34, 34, 0.98) 100%);
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
}

.guilded-game-tab-label {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 1.15;
    font-weight: 600;
    letter-spacing: 0.01em;
}
`;

function cloneTabIcon(icon: React.ReactNode, color: string) {
    if (!React.isValidElement(icon)) {
        return icon;
    }

    return React.cloneElement(icon as ReactElement<any>, {
        color,
    });
}

const GameTabBar = <TTab extends string>({ activeTab, onTabPress, tabs }: GameTabBarProps<TTab>) => {
    const { width } = useWindowDimensions();
    const hasTrueMiddle = tabs.length % 2 === 1;
    const centerIndex = Math.floor(tabs.length / 2);
    const useCondensed = width < 600;
    const goldPalette = guildedButtonRingPresets.gold;
    const textColor = String(useCSSVariable('--color-text') || '#1a1a1a');

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: gameTabBarCSS }} />
            <div
                className="guilded-game-tab-bar"
                style={
                    {
                        '--ring-outer-dark': goldPalette.outerDark,
                        '--ring-outer-light': goldPalette.outerLight,
                        '--ring-middle': goldPalette.middle,
                        '--ring-inner-light': goldPalette.innerLight,
                        '--ring-inner-dark': goldPalette.innerDark,
                        '--tab-text-active': textColor,
                        '--tab-text-inactive': goldPalette.middle,
                        '--active-surface-top': '#d0ab43',
                        '--active-surface-bottom': '#b79031',
                    } as React.CSSProperties & Record<string, string>
                }
            >
                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.value;
                    const tabFlex = hasTrueMiddle && index === centerIndex ? '1.35' : '1';
                    const label = useCondensed ? tab.condensedLabel : tab.label;
                    const iconColor = isActive ? textColor : goldPalette.middle;

                    return (
                        <div
                            key={tab.value}
                            className={`guilded-game-tab-wrap ${isActive ? 'is-active' : ''}`.trim()}
                            style={{ '--tab-flex': tabFlex } as React.CSSProperties & Record<string, string>}
                        >
                            <button
                                type="button"
                                className="guilded-game-tab-button"
                                onClick={() => onTabPress(tab.value)}
                                aria-pressed={isActive}
                            >
                                <div className="guilded-game-tab-outer">
                                    <div className="guilded-game-tab-middle">
                                        <div className="guilded-game-tab-inner">
                                            <div className="guilded-game-tab-surface">
                                                <div className="guilded-game-tab-icon">{cloneTabIcon(tab.icon, iconColor)}</div>
                                                <span className="guilded-game-tab-label">{label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default GameTabBar;
