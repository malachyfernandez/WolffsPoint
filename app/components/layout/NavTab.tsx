import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import PoppinsText from '../ui/text/PoppinsText';

interface NavTabProps {
  text: string;
  children: React.ReactNode;
  isLast?: boolean;
  isInvisible?: boolean;
  isHighlighted?: boolean;
  onPress?: () => void;
}

const NavTab = ({ text, children, isLast = false, isInvisible = false, isHighlighted = false, onPress }: NavTabProps): React.ReactElement => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`h-20 justify-center flex-auto border-border border-t-2 border-x-2 rounded-t-xl rounded-b-[1px] flex-col items-center gap-0 box-border ${isHighlighted ? 'bg-inner-background' : 'bg-background'} ${!isLast ? 'mr-[-5px]' : ''} ${isInvisible ? 'opacity-0' : 'opacity-100'}`}
    >
      {children}
      <PoppinsText className='text-xs' weight='medium'>{text}</PoppinsText>
    </TouchableOpacity>
  );
};

export default NavTab;
