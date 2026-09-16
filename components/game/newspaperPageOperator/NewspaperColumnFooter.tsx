import React from 'react';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';

const NewspaperColumnFooter = () => {
    return (
        <Row className='gap-2 items-center justify-between border-t border-border pt-3'>
            <FontText variant='subtext'>Tap column to edit</FontText>
        </Row>
    );
};

export default NewspaperColumnFooter;
