import { Platform } from 'react-native';

/**
 * True when running as a web page on a mobile browser (iOS/iPadOS Safari,
 * Android Chrome/Firefox, desktop-mode iPads reporting MacIntel with touch).
 * Mobile browsers use tile-based rasterization and drop/re-rasterize layer
 * tiles under GPU pressure — expensive effects like SVG displacement filters,
 * drop-shadow filters, and scroll masks visibly flicker while scrolling, so
 * callers should degrade to cheap equivalents (clip-path, no mask, no shadow).
 */
export const isMobileWeb = () =>
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1));
