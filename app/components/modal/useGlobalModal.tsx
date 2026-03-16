import { useModal } from './ModalContext';

export const useGlobalModal = () => {
  const {
    openModal,
    openComponentModal,
    closeModal,
    dismissModal,
  } = useModal();


  const openExampleModal = (message: string) =>
    openModal<void>('example', { message });

  const openModalById = <TResult = unknown>(id: string, props?: Record<string, any>) =>
    openModal<TResult>(id, props);

  const openInlineModal = <TResult = unknown>(component: React.ComponentType<any>, props?: Record<string, any>) =>
    openComponentModal<TResult>(component, props);

  return {
    openExampleModal,
    openModalById,
    openInlineModal,
    closeModal,
    dismissModal,
  };
};

export default useGlobalModal;
