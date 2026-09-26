import React from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ShadowScrollView from '../../ui/ShadowScrollView';
import CloseButton from '../../ui/dialog/CloseButton';
import { closeDialogAndScroll, scrollToElement } from 'utils/parseHeadings';
import { useTownSquareAuthorIdentity } from '../townSquare/TownSquareAuthorIdentity';

interface PhoneBookTocDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gameId: string;
    /** Element id prefix for the per-player scroll anchors */
    anchorPrefix: string;
    /** Players in the same order their cards are rendered (index = anchor suffix) */
    players: { userId: string }[];
    /** Optional fixed-label entry shown above the player list (e.g. "Your Profile") */
    titleEntry?: { label: string; anchorId: string };
}

const PhoneBookTocDialog = ({
    isOpen,
    onOpenChange,
    gameId,
    anchorPrefix,
    players,
    titleEntry,
}: PhoneBookTocDialogProps) => {
    const hasContent = players.length > 0 || Boolean(titleEntry);

    const closeAndScroll = (scrollAction: () => void) =>
        closeDialogAndScroll(() => onOpenChange(false), scrollAction);

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='h-[70vh]'>
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <DialogHeader
                        text='Table of Contents'
                        subtext='Jump to a player'
                    />

                    <Column className='min-h-0 flex-1 pt-3'>
                        {!hasContent ? (
                            <View className='border-subtle-border bg-text/5 rounded-lg border p-8'>
                                <FontText variant='subtext' className='text-center'>
                                    No players listed yet.
                                </FontText>
                            </View>
                        ) : (
                            <ShadowScrollView
                                direction='vertical'
                                className='flex-1 min-h-0'
                                scrollViewClassName='w-full'
                            >
                                <Column className='gap-0 pb-4'>
                                    {titleEntry && (
                                        <>
                                            <Pressable
                                                onPress={() =>
                                                    closeAndScroll(() =>
                                                        scrollToElement(titleEntry.anchorId)
                                                    )
                                                }
                                                className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                            >
                                                <FontText numberOfLines={1} ellipsizeMode='tail'>
                                                    {titleEntry.label}
                                                </FontText>
                                            </Pressable>
                                            {players.length > 0 && (
                                                <View className='bg-border/30 my-2 h-px w-full' />
                                            )}
                                        </>
                                    )}
                                    {players.map((player, index) => (
                                        <TocPlayerRow
                                            key={player.userId}
                                            gameId={gameId}
                                            userId={player.userId}
                                            anchorId={`${anchorPrefix}-player-${index}`}
                                            onPress={(scrollAction) => closeAndScroll(scrollAction)}
                                        />
                                    ))}
                                </Column>
                            </ShadowScrollView>
                        )}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

// Row that resolves the player's display name the same way the card does.
const TocPlayerRow = ({
    gameId,
    userId,
    anchorId,
    onPress,
}: {
    gameId: string;
    userId: string;
    anchorId: string;
    onPress: (scrollAction: () => void) => void;
}) => {
    const { displayName, inGameName, isLoading } = useTownSquareAuthorIdentity({ gameId, userId });

    // Mirror the card's validity check so the TOC only lists players whose
    // card actually renders (skips NOT-JOINED rows and orphaned profiles
    // that resolve to no usable name).
    const isRenderable =
        (displayName && displayName !== 'Unknown' && displayName.trim().length > 0) ||
        (inGameName && inGameName.trim().length > 0);

    if (!isLoading && !isRenderable) {
        return null;
    }

    return (
        <Pressable
            onPress={() => onPress(() => scrollToElement(anchorId))}
            className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
        >
            <FontText numberOfLines={1} ellipsizeMode='tail'>
                {isLoading ? '...' : displayName}
            </FontText>
        </Pressable>
    );
};

export default PhoneBookTocDialog;
