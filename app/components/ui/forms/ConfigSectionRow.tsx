import React from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../text/FontText';

interface ConfigSectionRowProps {
    title: string;
    subtext: string;
    children: React.ReactNode;
    showDivider?: boolean;
}

/**
 * A standardized row component for configuration sections.
 * Provides consistent layout and styling for config items with title, description, and control.
 */
const ConfigSectionRow = ({ title, subtext, children, showDivider = true }: ConfigSectionRowProps) => {
    return (
        <Row className={`items-center justify-between gap-4 py-4 ${showDivider ? 'border-b border-border/15' : ''}`} style={{ flexWrap: 'wrap' }}>
            <Column className='min-w-[220px] flex-1' gap={1}>
                <FontText weight='medium'>{title}</FontText>
                <FontText variant='subtext'>{subtext}</FontText>
            </Column>
            {children}
        </Row>
    );
};

export default ConfigSectionRow;
