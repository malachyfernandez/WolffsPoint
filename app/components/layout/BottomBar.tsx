import React, { PropsWithChildren } from 'react';

import Row from './Row';

interface BottomBarProps extends PropsWithChildren {
    className?: string;
}

const BottomBar = ({ children, className }: BottomBarProps) => {
    return (
        <Row className={`p-6 border-t border-subtle-border justify-between ${className}`}>
            {children}
        </Row>
    );
};

export default BottomBar;
