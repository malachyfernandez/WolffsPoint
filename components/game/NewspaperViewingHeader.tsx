import React from 'react';
import Row from '../layout/Row';
import NewspaperPageTitle from './newspaperPageOperator/NewspaperPageTitle';

const NewspaperViewingHeader = () => {
    return (
        <Row className='gap-3 w-full items-center justify-center flex-wrap'>
            <NewspaperPageTitle />
        </Row>
    );
};

export default NewspaperViewingHeader;
