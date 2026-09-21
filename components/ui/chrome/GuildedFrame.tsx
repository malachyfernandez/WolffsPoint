import React from 'react';
import Column from '../../layout/Column';
import PaperTextureOverlay from '../PaperTextureOverlay';

interface GuildedFrameProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
    showTexture?: boolean;
    variant?: 'gold' | 'silver';
}

const GuildedFrame = ({ children, className = '', contentClassName = '', variant }: GuildedFrameProps) => {
    return (
        <Column className={`gap-4 w-full relative bg-inner-background outline-accent outline-2 outline-offset-2 rounded-md ${className}`.trim()}>
            <PaperTextureOverlay opacity={0.5} borderRadius={6} />
            <Column className={`gap-4 w-full bg-none rounded-md m-0 ${contentClassName}`.trim()}>{children}</Column>
        </Column>
    );
};

export default GuildedFrame;
