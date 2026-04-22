import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Dialog } from 'heroui-native/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
const DEFAULT_DIALOG_MAX_WIDTH = 960;

const dialogMaxWidthByToken: Record<string, number> = {
    xs: 320,
    sm: 384,
    md: 448,
    lg: 512,
    xl: 576,
    '2xl': 672,
    '3xl': 768,
    '4xl': 896,
    '5xl': 1024,
    '6xl': 1152,
    '7xl': 1280,
};

const extractDialogMaxWidthFromClassName = (className?: string) => {
    if (!className) {
        return undefined;
    }

    const match = className.match(/(?:^|\s)max-w-([^\s]+)/);

    if (!match) {
        return undefined;
    }

    const token = match[1];

    if (token === 'full' || token === 'screen') {
        return Number.POSITIVE_INFINITY;
    }

    return dialogMaxWidthByToken[token];
};

const hasExplicitWidthClass = (className?: string) => {
    if (!className) {
        return false;
    }

    return /(?:^|\s)(?:w-full|w-screen|w-\[[^\]]+\]|w-\S+)/.test(className);
};

const hasExplicitHeightClass = (className?: string) => {
    if (!className) {
        return false;
    }

    return /(?:^|\s)(?:h-\S+|max-h-\S+)/.test(className);
};

const splitHeightClasses = (className?: string) => {
    if (!className) {
        return { outerClassName: '', innerHeightClassName: '' };
    }

    const classNames = className.split(/\s+/).filter(Boolean);
    const heightClasses = classNames.filter((token) => /^(?:h-|max-h-|min-h-)/.test(token));
    const outerClasses = classNames.filter((token) => !/^(?:h-|max-h-|min-h-)/.test(token));

    return {
        outerClassName: outerClasses.join(' '),
        innerHeightClassName: heightClasses.join(' '),
    };
};

const basePortalClassName = 'flex-1 w-full h-full px-4 py-6 items-center justify-center';
const baseContentClassName = 'w-full self-center bg-background rounded border-2 border-border';
const ConvexDialog = {
    Root: Dialog,
    Trigger: Dialog.Trigger,
    Portal: ({ className, ...props }: any) => (
        <Dialog.Portal className={`${basePortalClassName} ${className || ''}`.trim()} {...props} />
    ),
    Overlay: ({ className, ...props }: any) => (
        <Dialog.Overlay className={`bg-black/20 ${className || ''}`.trim()} {...props} />
    ),
    Content: ({ children, className, style, ...props }: any) => {
        const { height, width } = useWindowDimensions();
        const { outerClassName, innerHeightClassName } = splitHeightClasses(className);
        const targetMaxWidth = extractDialogMaxWidthFromClassName(outerClassName) ?? DEFAULT_DIALOG_MAX_WIDTH;
        const computedWidth = Math.min(Math.max(width - 32, 0), targetMaxWidth);
        const sharedContentStyle = [
            !hasExplicitWidthClass(outerClassName)
                ? {
                    width: computedWidth,
                    maxWidth: computedWidth,
                }
                : null,
            !hasExplicitHeightClass(innerHeightClassName)
                ? { maxHeight: height * 0.8 }
                : null,
            style,
        ];

        return (
            <Dialog.Content className={`${baseContentClassName} ${outerClassName}`.trim()} style={sharedContentStyle} {...props}>
                <View className={`flex w-full min-h-0 max-h-full flex-col ${innerHeightClassName}`.trim()}>
                    {children}
                </View>
            </Dialog.Content>
        );
    },
    Close: Dialog.Close,
    Title: Dialog.Title,
    Description: Dialog.Description,
};

export default ConvexDialog;
