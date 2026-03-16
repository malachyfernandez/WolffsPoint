import React from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import Column from '../layout/Column';

interface ModalHeaderProps {
  text: string;
  subtext: string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ text, subtext }) => {
  return (
    <Column gap={0} className='bg-primary-accent p-4 items-center m-[-1.5rem] mb-0'>
      <PoppinsText weight='medium' color='white'>{text}</PoppinsText>
      <PoppinsText varient='subtext' weight='medium' color='white'>{subtext}</PoppinsText>
    </Column>
  );
};

export default ModalHeader;
