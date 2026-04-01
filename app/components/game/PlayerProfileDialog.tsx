import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
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

    useEffect(() => {
        if (isOpen) {
            setDraft(initialValue);
        }
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
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />
                    <DialogHeader text={title} subtext='This is what everyone in the game will see.' />
                    <ScrollView className='w-full'>
                        <Row className='w-full gap-4 p-4 items-start'>
                            <Column className='flex-1' gap={3}>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>In-game name</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.inGameName}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, inGameName: value }))}
                                        placeholder='The name everyone knows you by'
                                    />
                                </Column>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Phone number</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.phoneNumber}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, phoneNumber: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Instagram</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.instagram}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, instagram: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Discord</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.discord}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, discord: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Anything else</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full border border-subtle-border p-3'
                                        value={draft.otherContact}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, otherContact: value }))}
                                        placeholder='Optional'
                                    />
                                </Column>
                                <Column gap={2}>
                                    <PoppinsText weight='medium'>Profile picture</PoppinsText>
                                    {draft.profileImageUrl ? (
                                        <Image source={{ uri: draft.profileImageUrl }} className='w-28 h-28 rounded-xl border border-subtle-border bg-white' />
                                    ) : (
                                        <View className='w-28 h-28 rounded-xl border border-dashed border-subtle-border items-center justify-center bg-white'>
                                            <PoppinsText varient='subtext'>No image</PoppinsText>
                                        </View>
                                    )}
                                    <SimpleImageUpload onUpload={(url) => setDraft((current) => ({ ...current, profileImageUrl: url }))} />
                                </Column>
                            </Column>
                            <Column className='flex-1 h-full' gap={3}>
                                <Column gap={1}>
                                    <PoppinsText weight='medium'>Bio</PoppinsText>
                                    <PoppinsTextInput
                                        className='w-full min-h-[220px] border border-subtle-border p-3'
                                        value={draft.bioMarkdown}
                                        onChangeText={(value) => setDraft((current) => ({ ...current, bioMarkdown: value }))}
                                        placeholder='Write whatever you want people to know about you.'
                                        multiline={true}
                                        autoGrow={true}
                                    />
                                </Column>
                                <Column className='rounded-xl border border-subtle-border bg-white p-3 min-h-[220px]' gap={2}>
                                    <PoppinsText weight='medium'>Preview</PoppinsText>
                                    {draft.bioMarkdown.trim().length > 0 ? (
                                        <MarkdownRenderer markdown={draft.bioMarkdown} />
                                    ) : (
                                        <PoppinsText varient='subtext'>Your bio preview shows up here.</PoppinsText>
                                    )}
                                </Column>
                            </Column>
                        </Row>
                        <Row className='justify-end gap-3 px-4 pb-4'>
                            <AppButton variant='outline' className='w-36' onPress={() => onOpenChange(false)}>
                                <PoppinsText weight='medium'>Cancel</PoppinsText>
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
                                <PoppinsText weight='medium' color='white'>{saveLabel}</PoppinsText>
                            </AppButton>
                        </Row>
                    </ScrollView>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default PlayerProfileDialog;
