import React from 'react';
import { useCSSVariable } from 'uniwind';
import { guildedButtonRingPresets } from './buttons/GuildedButton.shared';

interface PaperContainerProps {
    children: React.ReactNode;
}

const guildedPaperContainerCSS = `
.guilded-paper-container-root {
    --panel-radius: 26px;
    --panel-t-out: 1px;
    --panel-t-mid: 3px;
    --panel-t-in: 1px;
    position: relative;
    width: 100%;
}

.guilded-paper-container-shadow {
    width: 100%;
    filter: drop-shadow(0px 10px 18px rgba(0, 0, 0, 0.18));
}

.guilded-paper-container-outer {
    width: 100%;
    padding: var(--panel-t-out);
    border-radius: var(--panel-radius);
    background: linear-gradient(to top right, var(--ring-outer-dark) 36%, var(--ring-outer-light) 100%);
}

.guilded-paper-container-middle {
    width: 100%;
    padding: var(--panel-t-mid);
    border-radius: calc(var(--panel-radius) - var(--panel-t-out));
    background: var(--ring-middle);
}

.guilded-paper-container-inner {
    width: 100%;
    padding: var(--panel-t-in);
    border-radius: calc(var(--panel-radius) - var(--panel-t-out) - var(--panel-t-mid));
    background: linear-gradient(to top right, var(--ring-inner-light) 22%, var(--ring-inner-dark) 100%);
}

.guilded-paper-container-surface {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: calc(var(--panel-radius) - var(--panel-t-out) - var(--panel-t-mid) - var(--panel-t-in));
    background: linear-gradient(180deg, var(--panel-bg-top) 0%, var(--panel-bg-bottom) 100%);
    min-height: 100%;
}

.guilded-paper-container-surface::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 18%, rgba(0, 0, 0, 0.02) 100%);
    pointer-events: none;
}

.guilded-paper-container-texture {
    position: absolute;
    inset: 0;
    opacity: 0.45;
    background-image: url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq');
    background-repeat: repeat;
    background-size: 642px 642px;
    mix-blend-mode: multiply;
    pointer-events: none;
}

.guilded-paper-container-content {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 16px;
    box-sizing: border-box;
}
`;

const PaperContainer = ({ children }: PaperContainerProps) => {
    const goldPalette = guildedButtonRingPresets.gold;
    const innerBackground = String(useCSSVariable('--color-inner-background') || 'rgb(165, 159, 150)');

    const cssVariables = {
        '--ring-outer-dark': goldPalette.outerDark,
        '--ring-outer-light': goldPalette.outerLight,
        '--ring-middle': goldPalette.middle,
        '--ring-inner-light': goldPalette.innerLight,
        '--ring-inner-dark': goldPalette.innerDark,
        '--panel-bg-top': 'rgba(255, 255, 255, 0.12)',
        '--panel-bg-bottom': innerBackground,
    } as React.CSSProperties & Record<string, string>;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: guildedPaperContainerCSS }} />
            <div className="guilded-paper-container-root" style={cssVariables}>
                <div className="guilded-paper-container-shadow">
                    <div className="guilded-paper-container-outer">
                        <div className="guilded-paper-container-middle">
                            <div className="guilded-paper-container-inner">
                                <div className="guilded-paper-container-surface">
                                    <div className="guilded-paper-container-texture" />
                                    <div className="guilded-paper-container-content">{children}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaperContainer;
