import { useCallback } from 'react';
import { useGlobalModal } from './useGlobalModal';
import type { ModalControls } from './ModalContext';

export const useSimpleModal = () => {
  const { openInlineModal } = useGlobalModal();

  const showModal = useCallback(<TProps = {}>(
    Component: React.ComponentType<TProps & { closeModal: () => void }>,
    props?: TProps
  ) => {
    const Wrapper = ({ modalControls }: { modalControls: ModalControls }) => (
      <Component
        {...(props as TProps)}
        closeModal={() => modalControls.closeModal()}
      />
    );

    return openInlineModal(Wrapper);
  }, [openInlineModal]);

  return { showModal };
};

export default useSimpleModal;
