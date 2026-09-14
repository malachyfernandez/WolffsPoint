import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { List } from 'lucide-react-native';

interface StickyTocButtonProps {
    onPress: () => void;
}

const TAG = '[StickyToc]';

/**
 * Table-of-contents button that sticks to the top-right of the screen once
 * the user scrolls past its resting position. Web only — on native it just
 * renders the button inline.
 */
const StickyTocButton = ({ onPress }: StickyTocButtonProps) => {
    const sentinelRef = useRef<View>(null);
    const buttonRef = useRef<Pressable>(null);
    const [isStuck, setIsStuck] = useState(false);

    useEffect(() => {
        console.log(TAG, 'mounted. window?', typeof window !== 'undefined', 'IO?', typeof IntersectionObserver !== 'undefined');
        if (
            typeof window === 'undefined' ||
            typeof IntersectionObserver === 'undefined'
        ) {
            return;
        }
        const sentinel = sentinelRef.current as unknown as Element | null;
        console.log(TAG, 'sentinel ref ->', sentinel, 'isElement?', sentinel instanceof Element);
        if (!sentinel || !(sentinel instanceof Element)) {
            console.warn(TAG, 'sentinel is not a DOM element, observer not attached');
            return;
        }

        const rect = sentinel.getBoundingClientRect();
        console.log(TAG, 'sentinel initial rect:', JSON.stringify(rect));

        const observer = new IntersectionObserver(
            ([entry]) => {
                const stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
                console.log(
                    TAG,
                    'IO callback: isIntersecting=', entry.isIntersecting,
                    'top=', entry.boundingClientRect.top,
                    '=> stuck?', stuck
                );
                setIsStuck(stuck);
            },
            { threshold: 0 }
        );
        observer.observe(sentinel);

        // Fallback diagnostic: log sentinel position on scroll even if IO is silent
        const onScroll = () => {
            const r = sentinel.getBoundingClientRect();
            console.log(TAG, 'scroll event — sentinel top:', r.top);
        };
        window.addEventListener('scroll', onScroll, true);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const btn = buttonRef.current as unknown as Element | null;
        if (btn instanceof Element) {
            const cs = window.getComputedStyle(btn);
            const r = btn.getBoundingClientRect();
            console.log(
                TAG,
                'isStuck changed ->', isStuck,
                '| computed position:', cs.position,
                '| rect:', JSON.stringify(r)
            );
        } else {
            console.log(TAG, 'isStuck changed ->', isStuck, '| button ref is not a DOM element:', btn);
        }
    }, [isStuck]);

    return (
        <View ref={sentinelRef} className='h-10 w-10'>
            <Pressable
                ref={buttonRef}
                onPress={onPress}
                className={`bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full ${
                    isStuck ? 'shadow-md' : ''
                }`}
                style={
                    isStuck
                        ? { position: 'fixed' as never, top: 16, right: 16, zIndex: 50 }
                        : undefined
                }
            >
                <List size={20} color='rgb(46, 41, 37)' />
            </Pressable>
        </View>
    );
};

export default StickyTocButton;
