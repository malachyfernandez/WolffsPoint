import React from 'react';
import Column from '../layout/Column';
import PaperTextureOverlay from './PaperTextureOverlay';

interface PlaceholderCardProps {
    children: React.ReactNode;
}

/**
 * Generic placeholder card container with consistent styling.
 * Reads as a small pinned scrap of paper: near-square corners, card-stock
 * tint, grain overlay, and a soft drop shadow.
 * Content (icon, text, buttons) should be passed as children.
 */
const PlaceholderCard = ({ children }: PlaceholderCardProps) => {
    return (
        <Column className='gap-5 items-center justify-center py-16'>
            <Column
                className='gap-5 rounded-[3px] border border-border/30 bg-[#b0a999] px-16 py-8 max-w-md items-center'
                style={{
                    transform: [{ rotate: '-0.4deg' }],
                    boxShadow: '0px 4px 10px rgba(20, 15, 8, 0.28)',
                }}
            >
                <PaperTextureOverlay opacity={0.4} borderRadius={3} />
                {children}
            </Column>
        </Column>
    );
};

export default PlaceholderCard;
