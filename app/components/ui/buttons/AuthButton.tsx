import React from 'react';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';



/**
two inpots:
isAuthLoading: Boolean,
    authFlow: any,
 */
interface OAuthResult {
    createdSessionId?: string;
    setActive?: (params: { session: string }) => void;
}

interface AuthButtonProps {
    // isAuthLoading: boolean;

    // setIsAuthLoading: (loading: boolean) => void;

    authFlow: () => Promise<OAuthResult>;
    buttonText: string;
}

const AuthButton = ({
    // isAuthLoading,
    // setIsAuthLoading,
    authFlow,
    buttonText,
}: AuthButtonProps) => {


    const [isAuthLoading, setIsAuthLoading] = useState(false);



    const handleLogin = async (startOAuth: any) => {
        if (isAuthLoading) return;

        setIsAuthLoading(true);
        try {
            const { createdSessionId, setActive } = await startOAuth();
            if (createdSessionId) {
                setActive!({ session: createdSessionId });
            }
        } catch (err) {
            console.error("OAuth error", err);
        } finally {
            setIsAuthLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={() => handleLogin(authFlow)}
            className="bg-white w-64 py-4 rounded-full active:opacity-80 flex-row justify-center items-center"
            // disable when auth is loading
            disabled={isAuthLoading}
        >
            <Text
                className="text-slate-900 font-bold text-lg"
            >
                {isAuthLoading ? "Loading..." : buttonText}
            </Text>
        </TouchableOpacity>
    );
};

export default AuthButton;