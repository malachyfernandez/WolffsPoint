import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <Column className='w-full relative bg-inner-background  outline-accent outline-2 outline-offset-2 rounded-xl'>
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 12,
                    opacity: 1,

                    // --- Web-Only Properties ---
                    // @ts-ignore: RN types don't know about web CSS
                    backgroundImage: "url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '442px 442px',
                    mixBlendMode: 'multiply',
                }}
            />
            <Column
                className='w-full bg-none rounded-xl p-4 m-0'
            // style={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            >
                {children}
            </Column>

        </Column>
    );
};

export default PaperContainer;
