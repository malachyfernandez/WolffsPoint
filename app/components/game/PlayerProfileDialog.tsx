import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppButton from '../ui/buttons/AppButton';
import DialogHeader from '../ui/dialog/DialogHeader';
import SimpleImageUpload from '../ui/imageUpload/SimpleImageUpload';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { PlayerProfile } from '../../../types/multiplayer';

interface PlayerProfileDialogProps {
    initialValue: PlayerProfile;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (profile: PlayerProfile) => void;
    title: string;
    saveLabel?: string;
}

const PlayerProfileDialog = ({
    initialValue,
    isOpen,
    onOpenChange,
    onSave,
    title,
    saveLabel = 'Save profile',
}: PlayerProfileDialogProps) => {
    const [draft, setDraft] = useState<PlayerProfile>(initialValue);
    const wasOpenRef = useRef(isOpen);

    useEffect(() => {
        const wasOpen = wasOpenRef.current;

        if (isOpen && !wasOpen) {
            setDraft(initialValue);
        }

        wasOpenRef.current = isOpen;
    }, [initialValue, isOpen]);

    const canSave = useMemo(() => draft.inGameName.trim().length > 0, [draft.inGameName]);

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 h-[90vh] max-w-5xl'>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />
                    <DialogHeader text={title} subtext='This is what everyone in the game will see.' />
                    <ScrollView className='w-full'>
                        <Row className='gap-4 w-full p-4 items-start'>
                            <Column className='gap-3 flex-1'>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>In-game name</FontText>
                                    <FontTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.inGameName}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, inGameName: value }))}
                                        placeholder='The name everyone knows you by'
                                    />
                                </Column>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>Phone number</FontText>
                                    <FontTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.phoneNumber}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, phoneNumber: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>Instagram</FontText>
                                    <FontTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.instagram}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, instagram: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>Discord</FontText>
                                    <FontTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.discord}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, discord: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>Anything else</FontText>
                                    <FontTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.otherContact}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, otherContact: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column className='gap-2'>
                                    <FontText weight='medium'>Profile picture</FontText>
                                    {draft.profileImageUrl ? (
                                        <Image source={{ uri: draft.profileImageUrl }} className='w-28 h-28 rounded-xl border border-subtle-border bg-white' />
                                    ) : (
                                        <View className='w-28 h-28 rounded-xl border border-dashed border-subtle-border items-center justify-center bg-white'>
                                            <FontText variant='subtext'>No image</FontText>
                                        </View>
                                    )}
                                    <SimpleImageUpload onUpload={(url) => setDraft((current) => ({ ...current, profileImageUrl: url }))} />
                                </Column>
                            </Column>
                            <Column className='gap-3 flex-1 h-full'>
                                <Column className='gap-1'>
                                    <FontText weight='medium'>Bio</FontText>
                                    <FontTextInput
                                        className='w-full min-h-[220px] border border-subtle-border p-3'
                                        value={draft.bioMarkdown}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, bioMarkdown: value }))}
                                        placeholder='Write whatever you want people to know about you.'
                                        multiline={true}
                                        autoGrow={true}
                                    />
                                </Column>
                                <Column className='gap-2 rounded-xl border border-subtle-border bg-white p-3 min-h-[220px]'>
                                    <FontText weight='medium'>Preview</FontText>
                                    {draft.bioMarkdown.trim().length > 0 ? (
                                        <MarkdownRenderer markdown={draft.bioMarkdown} />
                                    ) : (
                                        <FontText variant='subtext'>Your bio preview shows up here.</FontText>
                                    )}
                                </Column>
                            </Column>
                        </Row>
                        <Row className='gap-4 justify-end px-4 pb-4'>
                            <AppButton variant='outline' className='w-36' onPress={() => onOpenChange(false)}>
                                <FontText weight='medium'>Cancel</FontText>
                            </AppButton>
                            <AppButton
                                variant='black'
                                className='w-40'
                                onPress={() => {
                                    if (!canSave) {
                                        return;
                                    }
                                    onSave({
                                        ...draft,
                                        inGameName: draft.inGameName.trim(),
                                        claimedAt: draft.claimedAt || Date.now(),
                                    });
                                    onOpenChange(false);
                                }}
                                disabled={!canSave}
                            >
                                <FontText weight='medium' color='white'>{saveLabel}</FontText>
                            </AppButton>
                        </Row>
                    </ScrollView>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default PlayerProfileDialog;
