import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface KeyboardShortcutHintContextType {
    setHint: (keys: string[] | null) => void;
}

const KeyboardShortcutHintContext = createContext<KeyboardShortcutHintContextType | undefined>(undefined);

export const useKeyboardShortcutHint = () => {
    const context = useContext(KeyboardShortcutHintContext);
    if (!context) {
        return { setHint: () => {} };
    }
    return context;
};

const KeyChip = ({ label }: { label: string }) => (
    <View className="bg-white/15 border border-white/25 rounded-md px-2 py-0.5 items-center justify-center min-w-[24px]">
        <Text className="text-white text-xs font-medium uppercase tracking-wide">{label}</Text>
    </View>
);

export const KeyboardShortcutHintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [hintKeys, setHintKeys] = useState<string[] | null>(null);

    const setHint = (keys: string[] | null) => {
        setHintKeys(keys);
    };

    return (
        <KeyboardShortcutHintContext.Provider value={{ setHint }}>
            {children}
            {hintKeys && hintKeys.length > 0 && (
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(150)}
                    className="absolute bottom-4 right-4 z-[100] flex-row gap-1.5 items-center pointer-events-none"
                    pointerEvents="none"
                >
                    {hintKeys.map((key, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <Text className="text-white/40 text-xs">+</Text>}
                            <KeyChip label={key} />
                        </React.Fragment>
                    ))}
                </Animated.View>
            )}
        </KeyboardShortcutHintContext.Provider>
    );
};
