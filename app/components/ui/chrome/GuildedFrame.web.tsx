import React from 'react';
import { usePlayerStatus } from '../../../../contexts/PlayerStatusContext';
import {
    type GuildedButtonVariant,
} from '../buttons/GuildedButton.shared';
import { GuildedFrameCore } from './GuildedFrameCore.web';

interface GuildedFrameProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
    showTexture?: boolean;
    variant?: Exclude<GuildedButtonVariant, 'ghostly'>;
}

const GuildedFrame = ({
    children,
    className = '',
    contentClassName = '',
    backgroundToken = 'inner-background',
    showTexture = true,
    variant = 'gold',
}: GuildedFrameProps) => {
    const { isPlayerDead } = usePlayerStatus();
    const effectiveVariant: GuildedButtonVariant =
        variant === 'gold' && isPlayerDead ? 'ghostly' : variant;

    return (
        <GuildedFrameCore
            className={className}
            contentClassName={contentClassName}
            backgroundToken={backgroundToken}
            showTexture={showTexture}
            variant={effectiveVariant}
        >
            {children}
        </GuildedFrameCore>
    );
};

export default GuildedFrame;
