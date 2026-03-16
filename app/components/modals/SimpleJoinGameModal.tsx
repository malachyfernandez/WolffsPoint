import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import JoinHandler from '../ui/forms/JoinHandler';

interface SimpleJoinGameModalProps {
  closeModal: () => void;
  onJoin: (code: string) => void;
}

const SimpleJoinGameModal: React.FC<SimpleJoinGameModalProps> = ({ closeModal, onJoin }) => {
  const [gameCode, setGameCode] = useState('');
  
  const handleJoin = (code: string) => {
    onJoin(code);
    closeModal();
  };
  
  return (
    <>
      <PoppinsText>Code:</PoppinsText>
      <PoppinsTextInput
        placeholder="Enter game code"
        className="w-full border border-subtle-border p-2"
        value={gameCode}
        onChangeText={setGameCode}
      />
      <JoinHandler onJoin={handleJoin} gameCode={gameCode} />
    </>
  );
};

export default SimpleJoinGameModal;
