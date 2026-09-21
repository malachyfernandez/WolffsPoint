import React from 'react';
import Column from '../layout/Column';
import PaperTextureOverlay from './PaperTextureOverlay';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <Column className='gap-4 w-full relative bg-inner-background outline-accent outline-2 outline-offset-2 rounded-md'>
            <PaperTextureOverlay opacity={0.5} borderRadius={6} />
            <Column
                className='gap-4 w-full bg-none rounded-md p-4 m-0'
            // style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            >
                {children}
            </Column>

        </Column>
    );
};

export default PaperContainer;
