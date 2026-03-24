import React from 'react';
import Row from '../../layout/Row';
import PoppinsText from '../../ui/text/PoppinsText';

const NewspaperColumnFooter = () => {
    return (
        <Row className='items-center justify-between border-t border-border pt-3' gap={2}>
            <PoppinsText varient='subtext'>Tap column to edit</PoppinsText>
        </Row>
    );
};

export default NewspaperColumnFooter;
