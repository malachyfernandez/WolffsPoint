import React from 'react';
import Row from '../../layout/Row';
import NewspaperAddColumnButton from './NewspaperAddColumnButton';
import NewspaperPageTitle from './NewspaperPageTitle';

interface NewspaperPageHeaderProps {
    onAddColumn: () => void;
}

const NewspaperPageHeader = ({ onAddColumn }: NewspaperPageHeaderProps) => {
    return (
        <Row className='items-center justify-between flex-wrap' gap={3}>
            <NewspaperPageTitle />
            <NewspaperAddColumnButton onPress={onAddColumn} />
        </Row>
    );
};

export default NewspaperPageHeader;
