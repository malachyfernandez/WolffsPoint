import { useSyncExternalStore } from 'react';

/**
 * The horizontal space the left sim sidebar currently claims. Game-area
 * components read this through useContentWidth so their breakpoints respond
 * to the width actually available to content - not the raw viewport. Only
 * notifies when the claimed width changes, mirroring the simNow store.
 */
let sidebarWidth = 0;
const listeners = new Set<() => void>();

export const getSidebarWidth = () => sidebarWidth;

export const setSidebarWidth = (px: number) => {
  if (px === sidebarWidth) return;
  sidebarWidth = px;
  listeners.forEach((listener) => listener());
};

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const useSidebarWidth = () =>
  useSyncExternalStore(subscribe, getSidebarWidth, getSidebarWidth);
