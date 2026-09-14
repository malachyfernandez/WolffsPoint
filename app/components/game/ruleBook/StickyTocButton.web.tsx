import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { List } from 'lucide-react-native';

interface StickyTocButtonProps {
    onPress: () => void;
    isOpen?: boolean;
}

// Exact same geometry as the lucide `List` icon rendered by the inline button.
const LIST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(46,41,37)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;

const REST_BG = 'rgba(46, 41, 37, 0.05)';
const ON_HOVER_BG = 'rgba(46, 41, 37, 0.1)';

// Tuned base offsets. A runtime offset is applied automatically:
// when the measured new-y would be < 30 the offset is 0, otherwise -30.
const X_BUFFER = 0;
const SWITCH_ON_BASE = 40;
const SWITCH_OFF_BASE = 40;
const Y_BASE = 20;

/** Walk up the DOM to find the element that actually scrolls. */
const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
    let node = el?.parentElement ?? null;
    while (node) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight
        ) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
};

/** True if `el` (or an ancestor up to `boundary`) is fixed/sticky positioned. */
const isFixedOverlay = (el: Element, boundary: Element | null): boolean => {
    let node: Element | null = el;
    while (node && node !== boundary && node !== document.body) {
        const pos = window.getComputedStyle(node).position;
        if (pos === 'fixed' || pos === 'sticky') return true;
        node = node.parentElement;
    }
    return false;
};

/**
 * Web-only table-of-contents button. Once the inline button scrolls under the
 * fixed site header, a fixed-position clone docks just below the header's
 * bottom edge — all measured live by hit-testing.
 */
const StickyTocButton = ({ onPress, isOpen = false }: StickyTocButtonProps) => {
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const floatingElRef = useRef<HTMLDivElement | null>(null);
    const onPressRef = useRef(onPress);

    // Latest measured position for the floating element.
    const posRef = useRef({ left: 0, top: 0 });
    const stuckRef = useRef(false);

    const [isStuck, setIsStuck] = useState(false);

    // Tracks whether the dialog was open before the last effect run, so we can
    // add a small resume delay when it closes.
    const wasOpenRef = useRef(false);

    useEffect(() => { onPressRef.current = onPress; }, [onPress]);

    // Create the floating TOC element on body.
    useEffect(() => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        floatingElRef.current = el;

        const handleClick = () => onPressRef.current();
        el.addEventListener('click', handleClick);

        return () => {
            el.remove();
            floatingElRef.current = null;
        };
    }, []);

    // Style/show the floating element (same size, colors, icon as the inline button).
    useEffect(() => {
        const el = floatingElRef.current;
        if (!el) return;

        const show = isStuck;
        el.innerHTML = '';
        el.onmouseenter = null;
        el.onmouseleave = null;

        el.style.cssText = `
            position: fixed;
            left: ${posRef.current.left}px;
            top: ${posRef.current.top}px;
            width: 40px;
            height: 40px;
            border-radius: 9999px;
            background: ${REST_BG};
            display: ${show ? 'flex' : 'none'};
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            cursor: pointer;
            transition: background 0.15s;
            user-select: none;
        `;
        el.innerHTML = LIST_SVG;
        el.onmouseenter = () => { el.style.background = ON_HOVER_BG; };
        el.onmouseleave = () => { el.style.background = REST_BG; };
    }, [isStuck]);

    // Continuously measure the button, the scroll container, and the header's
    // bottom edge so the floating element tracks resizes and layout changes.
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;

        const update = () => {
            // Freeze all measurement/movement while the TOC dialog is open.
            if (isOpen) return;

            // The sentinel's parent is the 40x40 View wrapping the Pressable —
            // measure that so we get the real button bounds.
            const btn = node.parentElement as HTMLElement | null;
            if (!btn) return;
            const btnRect = btn.getBoundingClientRect();

            const el = floatingElRef.current;

            // Tab hidden / not laid out yet.
            if (btnRect.width === 0) {
                stuckRef.current = false;
                setIsStuck(false);
                return;
            }

            const scrollParent = findScrollParent(node);
            const scrollLeft = scrollParent ? scrollParent.scrollLeft : window.scrollX;

            // Where the button sits when the scroll container is at the top.
            const restLeft = btnRect.left + scrollLeft;

            const cx = btnRect.left + btnRect.width / 2;
            const cy = btnRect.top + btnRect.height / 2;
            const mid = cy;

            // Let hit-tests pass through the floating element so it can't
            // occlude its own measurements (which would make it drift down).
            if (el) el.style.pointerEvents = 'none';

            // The dock point: scan down at the button's center-x until we hit
            // real scrollable content. That's the bottom edge of whatever
            // overlay (the header) the button disappeared under.
            let dockTop = 0;
            if (scrollParent) {
                for (let y = 0; y < window.innerHeight; y += 1) {
                    const hit = document.elementFromPoint(cx, y);
                    if (hit &&
                        (hit === scrollParent || scrollParent.contains(hit)) &&
                        !isFixedOverlay(hit, scrollParent)) {
                        dockTop = y;
                        break;
                    }
                }
            }

            if (el) el.style.pointerEvents = '';

            // Auto-offset rule: if the natural new-y would be < 30, no offset;
            // otherwise pull the whole switch/position system up by 30px.
            const measuredTop = dockTop + Y_BASE;
            const offset = measuredTop < 30 ? 0 : -30;

            // "Passed" = the button's midpoint crossed the switch line.
            // Separate ON/OFF lines give hysteresis so it can't flicker.
            const onLine = dockTop + SWITCH_ON_BASE + offset;
            const offLine = dockTop + SWITCH_OFF_BASE + offset;
            let stuck = stuckRef.current;
            if (cy < 0 || cy > window.innerHeight || cx < 0 || cx > window.innerWidth) {
                stuck = true;
            } else if (!stuck && mid <= onLine) {
                stuck = true;
            } else if (stuck && mid > offLine) {
                stuck = false;
            }
            stuckRef.current = stuck;
            setIsStuck(stuck);

            posRef.current = {
                left: restLeft + X_BUFFER,
                top: measuredTop + offset,
            };

            // Glue the floating element to the measured dock spot.
            if (el) {
                el.style.left = `${posRef.current.left}px`;
                el.style.top = `${posRef.current.top}px`;
            }
        };

        const wasOpen = wasOpenRef.current;
        wasOpenRef.current = isOpen;

        let interval: ReturnType<typeof setInterval> | null = null;
        let timeout: ReturnType<typeof setTimeout> | null = null;

        if (isOpen) {
            // Dialog is open — freeze. No polling or scroll/resize listeners.
        } else if (wasOpen) {

            // Dialog just closed — wait 1s before resuming so the layout
            // has time to settle and the button doesn't snap immediately.
            timeout = setTimeout(() => {
                update();
                interval = setInterval(update, 200);
                window.addEventListener('scroll', update, true);
                window.addEventListener('resize', update);
            }, 1000);
        } else {
            // Normal operation (mount / already closed) — run immediately.
            update();
            interval = setInterval(update, 200);
            window.addEventListener('scroll', update, true);
            window.addEventListener('resize', update);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
            if (interval) clearInterval(interval);
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [isOpen]);

    return (
        <View className='h-10 w-10 relative'>
            <div
                ref={sentinelRef}
                style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }}
            />
            <Pressable
                onPress={onPress}
                pointerEvents={isStuck ? 'none' : 'auto'}
                style={{ opacity: isStuck ? 0 : 1 }}
                className='bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full'
            >
                <List size={20} color='rgb(46, 41, 37)' />
            </Pressable>
        </View>
    );
};

export default StickyTocButton;
