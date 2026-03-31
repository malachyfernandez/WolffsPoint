import React from 'react';
import { Dialog } from 'heroui-native/dialog';
import { ConvexReactClient } from 'convex/react';
import { ConvexProvider } from 'convex/react';

// Debug toggle to test nested provider behavior
const DEBUG_DISABLE_NESTED_CONVEX_PROVIDER = false;

// Create a singleton Convex client for all dialogs
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Wrapper component that provides Convex context to Dialog content
const ConvexDialogContent = ({ children }: { children: React.ReactNode }) => {
    return (
        <ConvexProvider client={convex}>
            {children}
        </ConvexProvider>
    );
};

// Enhanced Dialog components with Convex context
const ConvexDialog = {
    Root: Dialog,
    Trigger: Dialog.Trigger,
    Portal: Dialog.Portal,
    Overlay: ({ className, ...props }: any) => (
        <Dialog.Overlay className="bg-black/20" {...props} />
    ),
    Content: ({ children, className, ...props }: any) => {
        if (DEBUG_DISABLE_NESTED_CONVEX_PROVIDER) {
            return (
                <Dialog.Content className="bg-background rounded border-2 border-border max-w-2xl w-full mx-auto" {...props}>
                    {children}
                </Dialog.Content>
            );
        } else {
            return (
                <ConvexDialogContent>
                    <Dialog.Content className="bg-background rounded border-2 border-border max-w-2xl w-full mx-auto" {...props}>
                        {children}
                    </Dialog.Content>
                </ConvexDialogContent>
            );
        }
    },
    Close: Dialog.Close,
    Title: Dialog.Title,
    Description: Dialog.Description,
};

export default ConvexDialog;
