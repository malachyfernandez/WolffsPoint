import React from 'react';
import { View } from 'react-native';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import Row from '../../layout/Row';

interface DayButtonProps {
  date: Date;
  index: number;
  label?: string;
  isSelected: boolean;
  showCurrentDayIndicator: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

const DayButton = ({
  date,
  index,
  label,
  isSelected,
  showCurrentDayIndicator,
  onPress,
  children,
}: DayButtonProps) => {
  if (children) {
    return children;
  }

  return (
    <AppButton
      key={index}
      variant={isSelected ? 'black' : 'grey'}
      className="max-h-6 min-w-28 max-w-64 px-2"
      onPress={onPress}>
      <Row className="items-center gap-2">
        {showCurrentDayIndicator && <View className="h-1.5 w-1.5 rounded-full bg-red-500" />}
        <FontText className="text-white" numberOfLines={1}>
          {label || `${date.getMonth() + 1}/${date.getDate()}`}
        </FontText>
      </Row>
    </AppButton>
  );
};

export default DayButton;
