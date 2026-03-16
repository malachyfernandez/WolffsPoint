import React, { useEffect } from 'react';
import { useModal } from './ModalContext';

const ModalRegistry: React.FC = () => {
  const { registerModal } = useModal();

  useEffect(() => {
    // Register all modal content components here
    // Currently no registered modals - using simple inline modals instead
    
    // You can add more modals here as needed
    // registerModal('settings', SettingsModalContent);
    // registerModal('profile', ProfileModalContent);
    // registerModal('confirm', ConfirmModalContent);
  }, [registerModal]);

  return null; // This component doesn't render anything, just registers modals
};

export default ModalRegistry;
