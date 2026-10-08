/**
 * Single source of truth for "is the app running in simulation mode".
 * Set EXPO_PUBLIC_SIM=1 before `expo start`/`export` — metro.config.js then
 * aliases convex/react(+clerk) and @clerk/clerk-expo onto the sim mocks, and
 * components use this flag to mount sim instrumentation. See sim/README.md.
 */
export const isSimMode = process.env.EXPO_PUBLIC_SIM === '1';
