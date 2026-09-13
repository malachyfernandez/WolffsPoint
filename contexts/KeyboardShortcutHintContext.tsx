import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { View, Text, Platform } from 'react-native';
import { createPortal } from 'react-dom';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface KeyboardShortcutHintContextType {
    setHint: (keys: string[] | null) => void;
}

const KeyboardShortcutHintContext = createContext<KeyboardShortcutHintContextType | undefined>(undefined);

export const useKeyboardShortcutHint = () => {
    const context = useContext(KeyboardShortcutHintContext);
    const ownedRef = useRef(false);
    const contextRef = useRef(context);
    contextRef.current = context;

    useEffect(() => {
        return () => {
            if (ownedRef.current && contextRef.current) {
                contextRef.current.setHint(null);
            }
        };
    }, []);

    if (!context) {
        return { setHint: () => {} };
    }

    const setHint = (keys: string[] | null) => {
        ownedRef.current = keys !== null;
        context.setHint(keys);
    };

    return { setHint };
};

const KeyChip = ({ label }: { label: string }) => (
    <View className="bg-white/15 border border-white/25 rounded-md px-2 py-0.5 items-center justify-center min-w-6">
        <Text className="text-white text-xs font-medium uppercase tracking-wide">{label}</Text>
    </View>
);

export const KeyboardShortcutHintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [hintKeys, setHintKeys] = useState<string[] | null>(null);

    const setHint = (keys: string[] | null) => {
        setHintKeys(keys);
    };

    // App-wide: pressing Escape while focused in a text field leaves the
    // field instead of doing anything else. A second Escape then triggers
    // the normal Escape behavior (e.g. closing the dialog).
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
            return;
        }
        // Capture phase: react-native-web's TextInput calls stopPropagation()
        // on every keydown, so Escape inside a text field never reaches a
        // bubble-phase window listener.
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'textarea' || tag === 'input' || target?.isContentEditable) {
                target?.blur();
            }
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, []);

    const hintChips = hintKeys && hintKeys.length > 0 && (
        <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            className="flex-row gap-1.5 items-center pointer-events-none"
            pointerEvents="none"
        >
            {hintKeys.map((key, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <Text className="text-white/40 text-xs">+</Text>}
                    <KeyChip label={key} />
                </React.Fragment>
            ))}
        </Animated.View>
    );

    return (
        <KeyboardShortcutHintContext.Provider value={{ setHint }}>
            {children}
            {Platform.OS === 'web' && typeof document !== 'undefined' ? (
                // Portal to document.body so the hint renders above dialog
                // portals, which mount later in the DOM and would cover it.
                hintChips &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 16,
                            right: 16,
                            zIndex: 10000,
                            pointerEvents: 'none',
                        }}>
                        {hintChips}
                    </div>,
                    document.body
                )
            ) : (
                hintChips && (
                    <View
                        className="absolute bottom-4 right-4 z-100 pointer-events-none"
                        pointerEvents="none">
                        {hintChips}
                    </View>
                )
            )}
        </KeyboardShortcutHintContext.Provider>
    );
};
