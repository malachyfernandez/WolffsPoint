import { useWindowDimensions } from 'react-native';
import { useSidebarWidth } from 'utils/sidebarWidth';

/**
 * Viewport width minus whatever the sim sidebar claims. Use this instead of
 * useWindowDimensions for breakpoint decisions inside the game area so
 * expanded sidebars collapse layouts at the right point.
 */
export const useContentWidth = () => {
  const { width } = useWindowDimensions();
  return width - useSidebarWidth();
};
