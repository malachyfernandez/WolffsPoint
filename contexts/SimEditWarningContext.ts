import { createContext, useContext } from 'react';

/**
 * Call-site signal for "this action mutates simulated data". The provider
 * mounted inside SimProvider shows the one-line simulation warning the first
 * time a guarded edit happens (file creation, role table writes...). Outside
 * a sim, or after "don't warn again" this session, this is a no-op.
 */
export const SimEditWarningContext = createContext<() => void>(() => {});

export const useSimEditWarning = () => useContext(SimEditWarningContext);
