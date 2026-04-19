import React, { ReactElement } from 'react';
import { useCSSVariable } from 'uniwind';
import { guildedButtonRingPresets } from '../ui/buttons/GuildedButton.shared';

export interface GameTabIconProps {
    icon: React.ReactNode;
    isActive?: boolean;
    size?: number;
    strokeWidth?: number;
    inactiveColor?: string;
    activeColor?: string;
}

export function GameTabIcon({
    icon,
    isActive = false,
    size = 24,
    strokeWidth = 0,
    inactiveColor,
    activeColor,
}: GameTabIconProps) {
    const textColor = String(useCSSVariable('--color-text') || '#1a1a1a');
    const goldPalette = guildedButtonRingPresets.gold;
    
    const color = isActive 
        ? (activeColor || textColor)
        : (inactiveColor || goldPalette.middle);

    if (!React.isValidElement(icon)) {
        return <>{icon}</>;
    }

    const iconElement = icon as ReactElement<any>;
    const IconComponent = iconElement.type;
    
    // Pass color and strokeWidth to the icon component
    return (
        <IconComponent
            {...iconElement.props}
            width={size}
            height={size}
            color={color}
            strokeWidth={strokeWidth}
        />
    );
}

export default GameTabIcon;
