/**
 * LayoutStateAnimatedView - A compound component system for layout-based screen transitions
 * 
 * This component provides a declarative API for managing layout screen transitions based on
 * page hierarchy and directional animations. Unlike traditional state-based animation
 * systems, this uses a page-tree approach where animations are determined by the
 * relative position of pages in the component tree.
 * 
 * @example Basic Usage
 * ```tsx
 * <LayoutStateAnimatedView.Container stateVar={currentScreen} className='flex-1'>
 *   <LayoutStateAnimatedView.Option page={1} stateValue='allGames'>
 *     <AllGamesPage />
 *   </LayoutStateAnimatedView.Option>
 *   
 *   <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
 *     <LayoutStateAnimatedView.Option stateValue='game'>
 *       <GamePage />
 *     </LayoutStateAnimatedView.Option>
 *   </LayoutStateAnimatedView.OptionContainer>
 * </LayoutStateAnimatedView.Container>
 * ```
 * 
 * @example Custom Animation Direction
 * ```tsx
 * <LayoutStateAnimatedView.OptionContainer page={3} pushInAnimation={fromTop}>
 *   <LayoutStateAnimatedView.Option stateValue='settings'>
 *     <SettingsPage />
 *   </LayoutStateAnimatedView.Option>
 * </LayoutStateAnimatedView.OptionContainer>
 * ```
 * 
 * @component LayoutStateAnimatedView.Container
 * The root container that manages the current active state and coordinates transitions.
 * 
 * @props {TState} stateVar - The current active state value
 * @props {string} className - Optional CSS classes for styling
 * @props {ReactNode} children - Option and OptionContainer components
 * 
 * @component LayoutStateAnimatedView.Option
 * Represents a single screen/page in the navigation hierarchy.
 * 
 * @props {TState} stateValue - The state value that activates this option
 * @props {number} page - Page number (inherited from OptionContainer if not provided)
 * @props {ReactNode} children - Content to render when this option is active
 * 
 * @component LayoutStateAnimatedView.OptionContainer
 * Groups options with shared animation settings and page numbering.
 * The higher-numbered page's pushInAnimation controls both forward and backward transitions.
 * 
 * @props {number} page - Page number for determining animation direction
 * @props {LayoutStateAnimatedViewPushInAnimation} pushInAnimation - Animation preset (defaults to fromRight)
 * @props {ReactNode} children - Option components within this container
 * 
 * @animation Behavior
 * - Only adjacent page changes animate (page difference of exactly 1)
 * - Same-page changes and non-adjacent jumps render with no animation
 * - The higher-numbered page's pushInAnimation determines the transition direction
 * - The single content tree is swapped only after its exit animation completes
 * 
 * @animation Presets
 * - fromRight: Enter from right, exit to left (default)
 * - fromLeft: Enter from left, exit to right  
 * - fromTop: Enter from top, exit to bottom
 * - fromBottom: Enter from bottom, exit to top
 * 
 * @performance Notes
 * - The active content has pointerEvents='none' while it exits
 * - Only one content tree is mounted at any point in the transition
 * - No performance overhead from hidden elements after transition
 */
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type TransitionStateKey = string;

export type LayoutStateAnimatedViewAnimation = {
    duration?: number;
    opacity?: [number, number];
    x?: [number, number];
    y?: [number, number];
    scale?: [number, number];
};

type LayoutStateAnimatedViewTransition = {
    entering: LayoutStateAnimatedViewAnimation;
    exiting: LayoutStateAnimatedViewAnimation;
};

export type LayoutStateAnimatedViewPushInAnimation = {
    forward: LayoutStateAnimatedViewTransition;
    backward: LayoutStateAnimatedViewTransition;
};

interface LayoutStateAnimatedViewContainerProps<TState extends TransitionStateKey> extends PropsWithChildren {
    stateVar: TState;
    className?: string;
    highPerformance?: boolean;
}

interface LayoutStateAnimatedViewOptionProps<TState extends TransitionStateKey> extends PropsWithChildren {
    stateValue: TState;
    page?: number;
    isReady?: boolean;
}

interface LayoutStateAnimatedViewOptionContainerProps extends PropsWithChildren {
    page: number;
    pushInAnimation?: LayoutStateAnimatedViewPushInAnimation;
}

type ResolvedOption<TState extends TransitionStateKey> = {
    stateValue: TState;
    page: number;
    pushInAnimation?: LayoutStateAnimatedViewPushInAnimation;
    children: ReactNode;
    isReady: boolean;
};

type TransitionPhase = 'idle' | 'exiting' | 'waiting' | 'swapping' | 'entering';

const DEFAULT_DURATION = 180;
const webPerformanceStyle = Platform.OS === 'web' ? ({ willChange: 'transform, opacity' } as any) : undefined;

const NO_ANIMATION_TRANSITION: LayoutStateAnimatedViewTransition = {
    entering: {},
    exiting: {},
};

const getDuration = (animation: LayoutStateAnimatedViewAnimation) => animation.duration ?? DEFAULT_DURATION;

const getValuePair = (value?: [number, number], fallbackStart = 0, fallbackEnd = 0) => {
    return value ?? [fallbackStart, fallbackEnd];
};

const applyAnimation = (
    animation: LayoutStateAnimatedViewAnimation,
    opacity: SharedValue<number>,
    translateX: SharedValue<number>,
    translateY: SharedValue<number>,
    scale: SharedValue<number>,
) => {
    const [opacityStart, opacityEnd] = getValuePair(animation.opacity, 1, 1);
    const [xStart, xEnd] = getValuePair(animation.x, 0, 0);
    const [yStart, yEnd] = getValuePair(animation.y, 0, 0);
    const [scaleStart, scaleEnd] = getValuePair(animation.scale, 1, 1);
    const duration = getDuration(animation);

    opacity.value = opacityStart;
    translateX.value = xStart;
    translateY.value = yStart;
    scale.value = scaleStart;

    opacity.value = withTiming(opacityEnd, { duration });
    translateX.value = withTiming(xEnd, { duration });
    translateY.value = withTiming(yEnd, { duration });
    scale.value = withTiming(scaleEnd, { duration });
};

const createTransition = (
    entering: LayoutStateAnimatedViewAnimation,
    exiting: LayoutStateAnimatedViewAnimation,
): LayoutStateAnimatedViewTransition => ({
    entering,
    exiting,
});

const createPushInAnimation = (
    forward: LayoutStateAnimatedViewTransition,
    backward: LayoutStateAnimatedViewTransition,
): LayoutStateAnimatedViewPushInAnimation => ({
    forward,
    backward,
});

const enterFromBottom = (duration = 220, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    y: [distance, 0],
});

const enterFromRight = (duration = 200, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    x: [distance, 0],
});

const enterFromLeft = (duration = 200, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    x: [-distance, 0],
});

const enterFromTop = (duration = 220, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    y: [-distance, 0],
});

const exitToBottom = (duration = 160, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    y: [0, distance],
});

const exitToTop = (duration = 160, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    y: [0, -distance],
});

const exitToLeft = (duration = 160, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    x: [0, -distance],
});

const exitToRight = (duration = 160, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    x: [0, distance],
});

const fromRight = createPushInAnimation(
    createTransition(enterFromRight(), exitToLeft()),
    createTransition(enterFromLeft(), exitToRight()),
);

const fromLeft = createPushInAnimation(
    createTransition(enterFromLeft(), exitToRight()),
    createTransition(enterFromRight(), exitToLeft()),
);

const fromTop = createPushInAnimation(
    createTransition(enterFromTop(), exitToBottom()),
    createTransition(enterFromBottom(), exitToTop()),
);

const fromBottom = createPushInAnimation(
    createTransition(enterFromBottom(), exitToTop()),
    createTransition(enterFromTop(), exitToBottom()),
);

const LayoutStateAnimatedViewOption = <TState extends TransitionStateKey>(_props: LayoutStateAnimatedViewOptionProps<TState>) => null;

const LayoutStateAnimatedViewOptionContainer = (_props: LayoutStateAnimatedViewOptionContainerProps) => null;

const collectOptions = <TState extends TransitionStateKey>(
    children: ReactNode,
    inheritedPage?: number,
    inheritedPushInAnimation?: LayoutStateAnimatedViewPushInAnimation,
): ResolvedOption<TState>[] => {
    const options: ResolvedOption<TState>[] = [];

    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) {
            return;
        }

        if (child.type === React.Fragment) {
            options.push(
                ...collectOptions<TState>(
                    (child.props as PropsWithChildren).children,
                    inheritedPage,
                    inheritedPushInAnimation,
                ),
            );
            return;
        }

        if (child.type === LayoutStateAnimatedViewOptionContainer) {
            const optionContainerProps = child.props as LayoutStateAnimatedViewOptionContainerProps;

            options.push(
                ...collectOptions<TState>(
                    optionContainerProps.children,
                    optionContainerProps.page,
                    optionContainerProps.pushInAnimation ?? fromRight,
                ),
            );
            return;
        }

        if (child.type === LayoutStateAnimatedViewOption) {
            const optionProps = child.props as LayoutStateAnimatedViewOptionProps<TState>;
            const page = optionProps.page ?? inheritedPage;

            if (page == null) {
                return;
            }

            options.push({
                stateValue: optionProps.stateValue,
                page,
                pushInAnimation: inheritedPushInAnimation,
                children: optionProps.children,
                isReady: optionProps.isReady !== false,
            });
        }
    });

    return options;
};

const getTransitionForPageChange = <TState extends TransitionStateKey>(
    previousOption?: ResolvedOption<TState>,
    nextOption?: ResolvedOption<TState>,
    adjacentOnly = true,
) => {
    if (!previousOption || !nextOption) {
        return null;
    }

    if (previousOption.page === nextOption.page) {
        return null;
    }

    if (adjacentOnly && Math.abs(previousOption.page - nextOption.page) !== 1) {
        return null;
    }

    const higherPageOption = previousOption.page > nextOption.page ? previousOption : nextOption;
    const pushInAnimation = higherPageOption.pushInAnimation;

    if (!pushInAnimation) {
        return null;
    }

    return nextOption.page > previousOption.page ? pushInAnimation.forward : pushInAnimation.backward;
};

const LayoutStateAnimatedViewContainer = <TState extends TransitionStateKey>({
    stateVar,
    className,
    children,
    highPerformance = false,
}: LayoutStateAnimatedViewContainerProps<TState>) => {
    const options = useMemo(() => collectOptions<TState>(children), [children]);
    const currentOption = options.find((option) => option.stateValue === stateVar);
    const [displayedOption, setDisplayedOption] = useState<ResolvedOption<TState> | undefined>(currentOption);
    const [phase, setPhase] = useState<TransitionPhase>('idle');
    const displayedOptionRef = useRef(displayedOption);
    const targetOptionRef = useRef(currentOption);
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstAnimationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
    const secondAnimationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

    targetOptionRef.current = currentOption;

    const opacity = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    useEffect(() => {
        if (phase === 'waiting') {
            if (displayedOptionRef.current?.stateValue !== currentOption?.stateValue) {
                displayedOptionRef.current = currentOption;
                setDisplayedOption(currentOption);
                opacity.value = 0;
                translateX.value = 0;
                translateY.value = 0;
                scale.value = 1;
                return;
            }

            if (!currentOption?.isReady) {
                return;
            }

            const fadeInAnimation: LayoutStateAnimatedViewAnimation = {
                duration: 150,
                opacity: [0, 1],
            };

            setPhase('swapping');
            firstAnimationFrameRef.current = requestAnimationFrame(() => {
                secondAnimationFrameRef.current = requestAnimationFrame(() => {
                    setPhase('entering');
                    applyAnimation(fadeInAnimation, opacity, translateX, translateY, scale);

                    transitionTimeoutRef.current = setTimeout(() => {
                        setPhase('idle');
                    }, getDuration(fadeInAnimation));
                });
            });
            return;
        }

        if (phase !== 'idle') {
            return;
        }

        const previousOption = displayedOptionRef.current;

        if (previousOption?.stateValue === currentOption?.stateValue) {
            displayedOptionRef.current = currentOption;
            return;
        }

        const activeTransition = getTransitionForPageChange(previousOption, currentOption, !highPerformance);

        if (!activeTransition || !previousOption || !currentOption) {
            displayedOptionRef.current = currentOption;
            setDisplayedOption(currentOption);
            applyAnimation(NO_ANIMATION_TRANSITION.entering, opacity, translateX, translateY, scale);
            return;
        }

        setDisplayedOption(previousOption);
        setPhase('exiting');
        applyAnimation(activeTransition.exiting, opacity, translateX, translateY, scale);

        transitionTimeoutRef.current = setTimeout(() => {
            const nextOption = targetOptionRef.current;
            const enteringTransition = getTransitionForPageChange(previousOption, nextOption);

            const enteringAnimation = enteringTransition?.entering ?? NO_ANIMATION_TRANSITION.entering;

            displayedOptionRef.current = nextOption;
            setDisplayedOption(nextOption);

            if (highPerformance) {
                opacity.value = 0;
                translateX.value = 0;
                translateY.value = 0;
                scale.value = 1;
                setPhase('waiting');
                return;
            }

            setPhase('swapping');
            firstAnimationFrameRef.current = requestAnimationFrame(() => {
                secondAnimationFrameRef.current = requestAnimationFrame(() => {
                    setPhase('entering');
                    applyAnimation(enteringAnimation, opacity, translateX, translateY, scale);

                    transitionTimeoutRef.current = setTimeout(() => {
                        setPhase('idle');
                    }, getDuration(enteringAnimation));
                });
            });
        }, getDuration(activeTransition.exiting));
    }, [currentOption, highPerformance, opacity, phase, scale, stateVar, translateX, translateY]);

    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            if (firstAnimationFrameRef.current !== null) {
                cancelAnimationFrame(firstAnimationFrameRef.current);
            }
            if (secondAnimationFrameRef.current !== null) {
                cancelAnimationFrame(secondAnimationFrameRef.current);
            }
        };
    }, []);

    const displayedContent = phase === 'idle'
        ? displayedOptionRef.current?.stateValue === currentOption?.stateValue
            ? currentOption?.children
            : displayedOptionRef.current?.children
        : displayedOption?.children;

    return (
        <View className={className} style={styles.container}>
            <Animated.View
                pointerEvents={phase === 'exiting' || phase === 'waiting' || phase === 'swapping' ? 'none' : 'auto'}
                style={[styles.fill, webPerformanceStyle, animatedStyle]}
            >
                {displayedContent ?? null}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    fill: {
        flex: 1,
    },
});

const LayoutStateAnimatedView = {
    Container: LayoutStateAnimatedViewContainer,
    Option: LayoutStateAnimatedViewOption,
    OptionContainer: LayoutStateAnimatedViewOptionContainer,
};

export {
    createPushInAnimation,
    fromBottom,
    fromLeft,
    fromRight,
    fromTop,
};

export default LayoutStateAnimatedView;
