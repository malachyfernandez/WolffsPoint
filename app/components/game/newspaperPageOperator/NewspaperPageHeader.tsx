import React from 'react';
import Row from '../../layout/Row';
import NewspaperAddColumnButton from './NewspaperAddColumnButton';
import NewspaperPageTitle from './NewspaperPageTitle';

interface NewspaperPageHeaderProps {
    onAddColumn: () => void;
}

const NewspaperPageHeader = ({ onAddColumn }: NewspaperPageHeaderProps) => {
    return (
        <Row className='gap-3 w-full items-center justify-center px-3'>
            {/* <NewspaperPageTitle /> */}
            <NewspaperAddColumnButton onPress={onAddColumn} />
        </Row>
    );
};

export default NewspaperPageHeader;
