import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from 'react';

type ModalComponent = React.ComponentType<any>;

export interface ModalControls<TResult = unknown> {
  closeModal: (result?: TResult) => void;
  dismissModal: (reason?: unknown) => void;
  modalId?: string;
}

interface ActiveModal {
  id?: string;
  component: ModalComponent;
  props?: Record<string, any>;
}

type ModalResolver = (value?: any) => void;
type ModalRejecter = (reason?: any) => void;

interface ModalContextType {
  registerModal: (id: string, component: ModalComponent) => void;
  unregisterModal: (id: string) => void;
  openModal: <TResult = unknown>(id: string, props?: Record<string, any>) => Promise<TResult>;
  openComponentModal: <TResult = unknown>(
    component: ModalComponent,
    props?: Record<string, any>,
    modalId?: string
  ) => Promise<TResult>;
  closeModal: (result?: unknown) => void;
  dismissModal: (reason?: unknown) => void;
  isVisible: boolean;
  activeModal: ActiveModal | null;
}

const ANIMATION_DURATION_MS = 180;

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const registryRef = useRef<Map<string, ModalComponent>>(new Map());
  const resolverRef = useRef<ModalResolver | null>(null);
  const rejecterRef = useRef<ModalRejecter | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const clearModal = useCallback(() => {
    resolverRef.current = null;
    rejecterRef.current = null;
    setActiveModal(null);
  }, []);

  const registerModal = useCallback((id: string, component: ModalComponent) => {
    registryRef.current.set(id, component);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const openComponentModal = useCallback(<TResult,>(
    component: ModalComponent,
    props?: Record<string, any>,
    modalId?: string,
  ) => {
    setActiveModal({ component, props, id: modalId });
    setIsVisible(true);

    return new Promise<TResult>((resolve, reject) => {
      resolverRef.current = resolve;
      rejecterRef.current = reject;
    });
  }, []);

  const openModal = useCallback(<TResult,>(id: string, props?: Record<string, any>) => {
    const component = registryRef.current.get(id);
    if (!component) {
      return Promise.reject(new Error(`Modal with id "${id}" is not registered.`));
    }
    return openComponentModal<TResult>(component, props, id);
  }, [openComponentModal]);

  const closeModal = useCallback((result?: unknown) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
      rejecterRef.current = null;
    }
    setIsVisible(false);

    setTimeout(() => {
      clearModal();
    }, ANIMATION_DURATION_MS);
  }, [clearModal]);

  const dismissModal = useCallback((reason?: unknown) => {
    if (reason !== undefined) {
      if (rejecterRef.current) {
        rejecterRef.current(reason);
      }
    } else if (resolverRef.current) {
      resolverRef.current(undefined);
    }
    rejecterRef.current = null;
    resolverRef.current = null;
    setIsVisible(false);

    setTimeout(() => {
      clearModal();
    }, ANIMATION_DURATION_MS);
  }, [clearModal]);

  return (
    <ModalContext.Provider
      value={{
        registerModal,
        unregisterModal,
        openModal,
        openComponentModal,
        closeModal,
        dismissModal,
        isVisible,
        activeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export default ModalProvider;
