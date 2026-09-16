import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface FadeInAfterDelayProps {
    delayMs?: number;
    fadeDuration?: number;
    /** When false, the fade timer won't start. When it becomes true, the timer starts. Defaults to true. */
    ready?: boolean;
    /** Called when the fade-in animation completes */
    onComplete?: () => void;
    children: React.ReactNode;
}

const FadeInAfterDelay = ({
    delayMs = 1000,
    fadeDuration = 300,
    ready = true,
    onComplete,
    children,
}: FadeInAfterDelayProps) => {
    const opacity = useSharedValue(.01);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    useEffect(() => {
        if (!ready) return;
        const fadeInTimer = setTimeout(() => {
            opacity.value = withTiming(1, { duration: fadeDuration });
            if (onComplete) {
                const completeTimer = setTimeout(onComplete, fadeDuration);
                return () => clearTimeout(completeTimer);
            }
        }, delayMs);

        return () => clearTimeout(fadeInTimer);
    }, [delayMs, fadeDuration, opacity, ready, onComplete]);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default FadeInAfterDelay;
