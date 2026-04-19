import React from 'react';
import { Newspaper } from 'lucide-react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';

const NewspaperPageTitle = () => {
    return (
        <Column gap={1}>
            <Row className='items-center' gap={2}>
                <Newspaper size={22} color='#2b2112' />
                <FontText weight='bold' className='text-2xl'>The Wolfs Point Times</FontText>
            </Row>
        </Column>
    );
};

export default NewspaperPageTitle;
