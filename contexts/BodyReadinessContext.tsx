import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

interface BodyReadinessContextValue {
    /** Register a container that needs to finish loading + fading. Returns an ID to pass to reportReady. */
    registerContainer: (label?: string) => string;
    /** Report that a container has finished loading AND its fade-in is complete */
    reportReady: (id: string) => void;
    /** Remove a container without reporting (e.g. it unmounted before finishing) */
    unregisterContainer: (id: string) => void;
}

const BodyReadinessContext = createContext<BodyReadinessContextValue | null>(null);

/** Whether descendants should report load state — false inside hidden/inactive tabs
 *  whose content can't finish (e.g. onLayout never fires under display:none). */
const BodyReportEnabledContext = createContext(true);

export const useBodyReadiness = () => useContext(BodyReadinessContext);
export const useBodyReportEnabled = () => useContext(BodyReportEnabledContext);

export const BodyReportScope = ({ enabled, children }: { enabled: boolean; children: React.ReactNode }) => (
    <BodyReportEnabledContext.Provider value={enabled}>
        {children}
    </BodyReportEnabledContext.Provider>
);

interface BodyReadinessProviderProps {
    children: React.ReactNode;
    /** True when the outer wrapper has mounted/settled */
    outerReady: boolean;
    /** Called when ALL registered containers report ready AND outerReady is true */
    onAllReady: () => void;
}

export const BodyReadinessProvider = ({ children, outerReady, onAllReady }: BodyReadinessProviderProps) => {
    const pendingRef = useRef(new Map<string, string>());
    const counterRef = useRef(0);
    const firedRef = useRef(false);
    const outerReadyRef = useRef(outerReady);

    const checkAndFire = useCallback(() => {
        if (outerReadyRef.current && pendingRef.current.size === 0 && !firedRef.current) {
            firedRef.current = true;
            onAllReady();
        }
    }, [onAllReady]);

    // Keep ref in sync and re-check when outerReady flips
    useEffect(() => {
        outerReadyRef.current = outerReady;
        checkAndFire();
    }, [outerReady, checkAndFire]);

    const registerContainer = useCallback((label?: string) => {
        const id = `lc-${++counterRef.current}`;
        pendingRef.current.set(id, label ?? id);
        return id;
    }, []);

    const reportReady = useCallback((id: string) => {
        pendingRef.current.delete(id);
        checkAndFire();
    }, [checkAndFire]);

    const unregisterContainer = useCallback((id: string) => {
        if (pendingRef.current.delete(id)) {
            checkAndFire();
        }
    }, [checkAndFire]);

    return (
        <BodyReadinessContext.Provider value={{ registerContainer, reportReady, unregisterContainer }}>
            {children}
        </BodyReadinessContext.Provider>
    );
};
