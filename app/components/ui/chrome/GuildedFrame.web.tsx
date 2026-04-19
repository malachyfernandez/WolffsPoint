import React from 'react';
import { useCSSVariable } from 'uniwind';
import { guildedButtonRingPresets } from '../buttons/GuildedButton.shared';

interface GuildedFrameProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
    showTexture?: boolean;
}

const guildedFrameCSS = `
.guilded-frame-root {
    position: relative;
    display: block;
    width: 100%;
}

.guilded-frame-shadow {
    --r: 20px;
    --t-out: 1px;
    --t-mid: 3px;
    --t-in: 1px;
    --out-y: 6px;
    --out-blur: 18px;
    --out-alpha: 0.18;
    --in-y: 1px;
    --in-blur: 10px;
    --in-alpha: 0.18;
    position: relative;
    display: block;
    width: 100%;
    filter: drop-shadow(0px var(--out-y) var(--out-blur) rgba(0, 0, 0, var(--out-alpha)));
}

.guilded-frame-shell {
    position: relative;
    display: block;
    width: 100%;
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
    box-sizing: border-box;
}

.guilded-frame-shell::before {
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

.guilded-frame-shell::after {
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

.guilded-frame-surface {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    background-color: var(--surface-bg);
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

.guilded-frame-surface::before {
    content: "";
    position: absolute;
    inset: -40px;
    border: 40px solid rgba(0, 0, 0, var(--in-alpha));
    filter: blur(var(--in-blur));
    transform: translateY(var(--in-y));
    pointer-events: none;
    z-index: 0;
}

.guilded-frame-texture {
    position: absolute;
    inset: 0;
    opacity: 0.42;
    background-image: url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq');
    background-repeat: repeat;
    background-size: 642px 642px;
    mix-blend-mode: multiply;
    pointer-events: none;
    z-index: 0;
}

.guilded-frame-content {
    position: relative;
    z-index: 1;
    width: 100%;
    box-sizing: border-box;
}
`;

const GuildedFrame = ({
    children,
    className = '',
    contentClassName = '',
    backgroundToken = 'inner-background',
    showTexture = true,
}: GuildedFrameProps) => {
    const goldPalette = guildedButtonRingPresets.gold;
    const surfaceBackground = String(useCSSVariable(`--color-${backgroundToken}`) || backgroundToken);

    const cssVariables = {
        '--ring-outer-dark': goldPalette.outerDark,
        '--ring-outer-light': goldPalette.outerLight,
        '--ring-middle': goldPalette.middle,
        '--ring-inner-light': goldPalette.innerLight,
        '--ring-inner-dark': goldPalette.innerDark,
        '--surface-bg': surfaceBackground,
    } as React.CSSProperties & Record<string, string>;

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: guildedFrameCSS }} />
            <div className={`guilded-frame-root ${className}`.trim()} style={cssVariables}>
                <div className="guilded-frame-shadow">
                    <div className="guilded-frame-shell">
                        <div className="guilded-frame-surface">
                            {showTexture ? <div className="guilded-frame-texture" /> : null}
                            <div className={`guilded-frame-content ${contentClassName}`.trim()}>{children}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GuildedFrame;
