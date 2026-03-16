import React from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import Column from '../layout/Column';
import { useModal } from './ModalContext';

const GenericModal: React.FC = () => {
  const { isVisible, activeModal, closeModal, dismissModal } = useModal();

  if (!isVisible || !activeModal) return null;

  const ModalContent = activeModal.component;
  const modalControls = {
    closeModal,
    dismissModal,
    modalId: activeModal.id,
  };

  return (
    <Column className='absolute w-screen h-screen justify-center items-center'>
      <Animated.View
        entering={FadeIn.duration(100)}
        exiting={FadeOut.duration(100)}
      >
        <Column className='w-screen h-screen justify-center items-center'>
          <Pressable onPress={() => dismissModal()} className='w-screen h-screen z-[-10] absolute bg-black/50' />

          <Animated.View
            entering={FadeInDown.duration(100)}
            exiting={FadeOutDown.duration(100)}
          >
            <Column className='bg-background p-6 rounded border-2 border-border w-[80vw] max-w-96'>
              <ModalContent {...(activeModal.props ?? {})} modalControls={modalControls} />
            </Column>
          </Animated.View>
        </Column>
      </Animated.View>
    </Column>
  );
};

export default GenericModal;
