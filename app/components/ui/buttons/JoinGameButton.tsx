import React from 'react';
import AppButton from './AppButton';
import PoppinsText from '../text/PoppinsText';

interface JoinGameButtonProps {
  onPress: () => void;
  className?: string;
}

const JoinGameButton = ({ onPress, className = "h-12 w-40 shrink" }: JoinGameButtonProps) => {
  return (
    <AppButton variant="green" className={className} onPress={onPress}>
      <PoppinsText weight='medium' color="white">Join a Game</PoppinsText>
    </AppButton>
  );
};

export default JoinGameButton;
