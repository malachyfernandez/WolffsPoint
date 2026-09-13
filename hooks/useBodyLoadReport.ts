import { useEffect, useRef } from 'react';
import { useBodyReadiness, useBodyReportEnabled } from '../contexts/BodyReadinessContext';

/**
 * Reports a component's loading state to the nearest BodyReadinessProvider.
 * The provider won't fire onAllReady until every registered component
 * has finished loading AND its fade-in animation has completed.
 *
 * Call this in any component that has a loading → ready transition.
 * If no BodyReadinessProvider is present, this is a no-op.
 *
 * @param isLoading - true while the component is still loading data
 * @param fadeDuration - ms for the fade-in animation after loading finishes (default 300)
 * @param label - debug name shown in [BodyReadiness] console logs
 */
export const useBodyLoadReport = (isLoading: boolean, fadeDuration: number = 300, label: string = 'component') => {
    const bodyReadiness = useBodyReadiness();
    const enabled = useBodyReportEnabled();
    const containerIdRef = useRef<string | null>(null);
    const registeredRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        if (bodyReadiness && !registeredRef.current) {
            containerIdRef.current = bodyReadiness.registerContainer(label);
            registeredRef.current = true;
        }
        return () => {
            if (containerIdRef.current) {
                bodyReadiness?.unregisterContainer(containerIdRef.current);
                containerIdRef.current = null;
                registeredRef.current = false;
            }
        };
    }, [bodyReadiness, label, enabled]);

    useEffect(() => {
        if (!enabled || !containerIdRef.current || !bodyReadiness) return;
        if (isLoading) return;
        // Wait for the fade-in animation to complete before reporting
        const timer = setTimeout(() => {
            bodyReadiness.reportReady(containerIdRef.current!);
        }, fadeDuration);
        return () => clearTimeout(timer);
    }, [isLoading, fadeDuration, bodyReadiness, label, enabled]);
};
