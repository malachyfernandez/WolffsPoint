import { Platform } from 'react-native';

/**
 * True when running as a web page inside iOS/iPadOS Safari (including
 * desktop-mode iPads, which report as MacIntel but have touch points).
 * Used to degrade GPU-heavy effects (SVG filters, masks, drop-shadow filters)
 * that cause tile-drop flicker on iOS.
 */
export const isIOSSafari = () =>
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1));
