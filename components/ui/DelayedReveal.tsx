import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

interface DelayedRevealProps {
  /** When this flips true, children stay invisible for delayMs, then fade in. */
  visible: boolean;
  /** How long to hold at 0 opacity after becoming visible. */
  delayMs?: number;
  /** Fade-in duration once the delay elapses. */
  fadeMs?: number;
  children: React.ReactNode;
}

/**
 * Renders children mounted but at 0 opacity, then fades them in after a short
 * delay. Resets every time `visible` goes false → true, so heavy subtrees
 * (e.g. a freshly re-rendered markdown page) get a beat to paint before the
 * user sees them.
 */
const DelayedReveal = ({
  visible,
  delayMs = 100,
  fadeMs = 200,
  children,
}: DelayedRevealProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }
    const timeout = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: fadeMs,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [visible, delayMs, fadeMs, opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

export default DelayedReveal;
