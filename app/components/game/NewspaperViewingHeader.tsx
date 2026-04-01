import React from 'react';
import Row from '../layout/Row';
import NewspaperPageTitle from './newspaperPageOperator/NewspaperPageTitle';

const NewspaperViewingHeader = () => {
    return (
        <Row className='items-center justify-center flex-wrap' gap={3}>
            <NewspaperPageTitle />
        </Row>
    );
};

export default NewspaperViewingHeader;
