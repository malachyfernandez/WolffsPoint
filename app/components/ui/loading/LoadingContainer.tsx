import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../../layout/Column';
import LoadingText from './LoadingText';

// Type for useUserVariable / useUserList result shape
type UserVarResult<T = unknown> = {
    state?: {
        isSyncing?: boolean;
    };
    value?: T;
} | undefined;

// Type for useUserVariableGet / useUserListGet result (array or undefined)
type UserVarGetResult<T = unknown> = Array<{ value: T }> | undefined;

// Type for the dependency items we accept
type DependencyItem = UserVarResult<unknown> | UserVarGetResult<unknown> | boolean | undefined;

interface LoadingContainerProps {
    children: React.ReactNode;
    /** Array of variables to check - can be useUserVariable results, useUserList results, 
     *  useUserVariableGet results, useUserListGet results, or boolean flags */
    dependencies: DependencyItem[];
    /** Text to show in LoadingText while loading */
    loadingText: string;
    /** Optional delay before showing loading text (ms) */
    loadingDelayMs?: number;
    /** Container className for styling (applied to both loading and content containers) */
    className?: string;
    /** Fade-in animation duration (ms), default 300 */
    fadeInDuration?: number;
}

/**
 * LoadingContainer - A generic loading wrapper that fades in content once all dependencies are ready.
 * 
 * Checks each dependency:
 * - undefined → loading (useUserVariableGet/useUserListGet still fetching)
 * - { state: { isSyncing: true } } → loading (useUserVariable/useUserList still syncing)
 * - false boolean → loading (explicit flag)
 * - Anything else → ready
 * 
 * Shows centered LoadingText while loading, then fades in children with reanimated FadeIn.
 * 
 * @example
 * ```tsx
 * const [profile] = useUserVariable({ key: 'profile' });
 * const posts = useUserListGet({ key: 'posts' });
 * 
 * <LoadingContainer 
 *   dependencies={[profile, posts]} 
 *   loadingText='Loading profile'
 *   className='flex-1 min-h-[760px] pb-8'
 * >
 *   <ProfileContent profile={profile.value} posts={posts} />
 * </LoadingContainer>
 * ```
 */
const LoadingContainer = ({
    children,
    dependencies,
    loadingText,
    loadingDelayMs,
    className = '',
    fadeInDuration = 300,
}: LoadingContainerProps) => {
    const isLoading = dependencies.some((dep) => {
        // undefined means still loading (useUserVariableGet/useUserListGet)
        if (dep === undefined) return true;

        // Check for isSyncing in state (useUserVariable/useUserList results)
        if (typeof dep === 'object' && dep !== null && 'state' in dep) {
            const state = (dep as UserVarResult)?.state;
            if (state?.isSyncing === true) return true;
        }

        // false boolean means loading
        if (dep === false) return true;

        return false;
    });

    if (isLoading) {
        return (
            <Column className={`items-center justify-center ${className}`} gap={7}>
                <LoadingText text={loadingText} delayMs={loadingDelayMs} />
            </Column>
        );
    }

    return (
        <Animated.View 
            entering={FadeIn.duration(fadeInDuration)}
            className={className}
        >
            {children}
        </Animated.View>
    );
};

export default LoadingContainer;
