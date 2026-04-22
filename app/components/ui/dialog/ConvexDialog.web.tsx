import React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Dialog } from 'heroui-native/dialog';
import GuildedFrame from '../chrome/GuildedFrame';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const ConvexDialogContent = ({ children }: { children: React.ReactNode }) => {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};

const baseContentClassName = 'w-full mx-auto max-w-2xl max-h-[90vh] bg-transparent border-0 p-0 overflow-visible shadow-none';

const renderWrappedContent = (children: React.ReactNode, className?: string, props?: any) => (
    <Dialog.Content className={`${className || ''} ${baseContentClassName}`.trim()} {...props}>
        <GuildedFrame className='max-h-full flex flex-col' contentClassName='max-h-full min-h-0 overflow-hidden p-5 flex flex-col' backgroundToken='inner-background'>
            {children}
        </GuildedFrame>
    </Dialog.Content>
);

const ConvexDialog = {
    Root: Dialog,
    Trigger: Dialog.Trigger,
    Portal: Dialog.Portal,
    Overlay: ({ className, ...props }: any) => <Dialog.Overlay className={`bg-black/20 ${className || ''}`.trim()} {...props} />,
    Content: ({ children, className, ...props }: any) => {
        return <ConvexDialogContent>{renderWrappedContent(children, className, props)}</ConvexDialogContent>;
    },
    Close: Dialog.Close,
    Title: Dialog.Title,
    Description: Dialog.Description,
};

export default ConvexDialog;
