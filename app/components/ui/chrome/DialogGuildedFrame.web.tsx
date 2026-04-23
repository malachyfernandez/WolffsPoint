import React from 'react';
import { GuildedFrameCore } from './GuildedFrameCore.web';
import { type GuildedButtonVariant } from '../buttons/GuildedButton.shared';

interface DialogGuildedFrameProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
    showTexture?: boolean;
    variant: GuildedButtonVariant;
}

export default function DialogGuildedFrame(props: DialogGuildedFrameProps) {
    console.log('[DialogGuildedFrame] variant:', props.variant);
    return <GuildedFrameCore {...props} />;
}
