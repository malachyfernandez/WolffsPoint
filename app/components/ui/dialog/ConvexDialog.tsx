import React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Dialog } from 'heroui-native/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const ConvexDialogContent = ({ children }: { children: React.ReactNode }) => {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};

const baseContentClassName = 'w-full mx-auto max-w-2xl max-h-[90vh] bg-transparent border-0 p-0 overflow-visible shadow-none';

const ConvexDialog = {
    Root: Dialog,
    Trigger: Dialog.Trigger,
    Portal: Dialog.Portal,
    Overlay: ({ className, ...props }: any) => <Dialog.Overlay className={`bg-black/20 ${className || ''}`.trim()} {...props} />,
    Content: ({ children, className, ...props }: any) => {
        return (
            <ConvexDialogContent>
                <Dialog.Content className={`${className || ''} ${baseContentClassName}`.trim()} {...props}>
                    <SafeAreaView className='flex w-full flex-col'>
                        {children}
                    </SafeAreaView>
                </Dialog.Content>
            </ConvexDialogContent>
        );
    },
    Close: Dialog.Close,
    Title: Dialog.Title,
    Description: Dialog.Description,
};

export default ConvexDialog;
