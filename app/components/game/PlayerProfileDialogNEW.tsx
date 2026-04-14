import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollShadow } from 'heroui-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import AppButton from '../ui/buttons/AppButton';
import ImageUploadDialog from '../ui/dialog/ImageUploadDialog';
import { PlayerProfile } from '../../../types/multiplayer';
import PlayerProfilePreviewCard, { PlayerProfileAvatar, PlayerProfileContactInfo } from './PlayerProfilePreviewCard';

// Import the markdown editor components
import TownSquareComposerToolbar from './townSquare/TownSquareComposerToolbar';
import TownSquareComposerEditorPane from './townSquare/TownSquareComposerEditorPane';
import TownSquareLinkDialog from './townSquare/TownSquareLinkDialog';
import TownSquareMoreOptionsDialog from './townSquare/TownSquareMoreOptionsDialog';
import {
    SelectionRange,
    applyMoreComposerAction,
    emptySelection,
    insertMarkdownImage,
    insertMarkdownLink,
    wrapSelection,
} from './townSquare/townSquareUtils';

interface PlayerProfileDialogNEWProps {
    initialValue: PlayerProfile;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (profile: PlayerProfile) => void;
    title: string;
    saveLabel?: string;
}

interface SocialsData {
    phoneNumber: string;
    instagram: string;
    discord: string;
    otherContact: string;
}

type ImageDialogMode = 'profile' | 'markdown' | null;

const normalizeText = (value?: string) => value?.trim() || '';

const hasProfileDraftChanges = (draft: PlayerProfile, initialValue: PlayerProfile) => (
    normalizeText(draft.inGameName) !== normalizeText(initialValue.inGameName)
    || normalizeText(draft.profileImageUrl) !== normalizeText(initialValue.profileImageUrl)
    || normalizeText(draft.phoneNumber) !== normalizeText(initialValue.phoneNumber)
    || normalizeText(draft.instagram) !== normalizeText(initialValue.instagram)
    || normalizeText(draft.discord) !== normalizeText(initialValue.discord)
    || normalizeText(draft.otherContact) !== normalizeText(initialValue.otherContact)
    || normalizeText(draft.bioMarkdown) !== normalizeText(initialValue.bioMarkdown)
);

const hasSocialsDraftChanges = (draft: SocialsData, initialSocials: SocialsData) => (
    normalizeText(draft.phoneNumber) !== normalizeText(initialSocials.phoneNumber)
    || normalizeText(draft.instagram) !== normalizeText(initialSocials.instagram)
    || normalizeText(draft.discord) !== normalizeText(initialSocials.discord)
    || normalizeText(draft.otherContact) !== normalizeText(initialSocials.otherContact)
);

const PlayerProfileDialogNEW = ({
    initialValue,
    isOpen,
    onOpenChange,
    onSave,
    title,
    saveLabel = 'Save profile',
}: PlayerProfileDialogNEWProps) => {
    // Main profile state
    const [draft, setDraft] = useState<PlayerProfile>(initialValue);
    const [bioSelection, setBioSelection] = useState<SelectionRange>(emptySelection);
    const [isSocialsDialogOpen, setIsSocialsDialogOpen] = useState(false);
    const [isMoreDialogOpen, setIsMoreDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [imageDialogMode, setImageDialogMode] = useState<ImageDialogMode>(null);
    const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

    const [previousInitialValue, setPreviousInitialValue] = useState<PlayerProfile | null>(null);

    useEffect(() => {
        if (isOpen) {
            const hasValueChanged = previousInitialValue === null || 
                JSON.stringify(initialValue) !== JSON.stringify(previousInitialValue);
            
            if (hasValueChanged) {
                setDraft(initialValue);
                setBioSelection(emptySelection);
                setIsSocialsDialogOpen(false);
                setIsMoreDialogOpen(false);
                setIsLinkDialogOpen(false);
                setImageDialogMode(null);
                setIsLeaveConfirmDialogOpen(false);
                setPreviousInitialValue(initialValue);
            }
        }
    }, [initialValue, isOpen, previousInitialValue]);

    // Validation
    const canSave = useMemo(() => draft.inGameName.trim().length > 0, [draft.inGameName]);
    const hasUnsavedChanges = useMemo(() => hasProfileDraftChanges(draft, initialValue), [draft, initialValue]);
    const selectedText = useMemo(() => {
        return (draft.bioMarkdown || '').slice(bioSelection.start, bioSelection.end);
    }, [bioSelection.end, bioSelection.start, draft.bioMarkdown]);
    const previewName = draft.inGameName.trim().length > 0 ? draft.inGameName.trim() : 'Your in-game name';
    const previewInitials = previewName
        .split(' ')
        .map((namePart) => namePart[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    const runBioUpdate = (updater: (value: string, selection: SelectionRange) => { value: string; selection: SelectionRange }) => {
        const result = updater(draft.bioMarkdown || '', bioSelection);
        setDraft((current) => ({ ...current, bioMarkdown: result.value }));
        setBioSelection(result.selection);
    };

    const socialsData = useMemo(() => ({
        phoneNumber: draft.phoneNumber || '',
        instagram: draft.instagram || '',
        discord: draft.discord || '',
        otherContact: draft.otherContact || '',
    }), [draft.phoneNumber, draft.instagram, draft.discord, draft.otherContact]);

    const handleSocialsSave = (socials: SocialsData) => {
        setDraft((current) => ({
            ...current,
            ...socials
        }));
        setIsSocialsDialogOpen(false);
    };

    const handleImageSelect = (imageUrl: string) => {
        if (imageDialogMode === 'profile') {
            setDraft((current) => ({ ...current, profileImageUrl: imageUrl }));
        }

        if (imageDialogMode === 'markdown') {
            runBioUpdate((value, selection) => insertMarkdownImage(value, selection, '', imageUrl));
        }

        setImageDialogMode(null);
    };

    const handleAttemptClose = () => {
        if (hasUnsavedChanges) {
            setIsLeaveConfirmDialogOpen(true);
            return;
        }

        onOpenChange(false);
    };

    const handleConfirmLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
        onOpenChange(false);
    };

    const handleCancelLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
    };

    const handleSave = () => {
        if (!canSave || !hasUnsavedChanges) {
            return;
        }
        onSave({
            ...draft,
            inGameName: draft.inGameName.trim(),
            claimedAt: draft.claimedAt || Date.now(),
        });
        onOpenChange(false);
    };

    return (
        <>
            <ConvexDialog.Root
                isOpen={isOpen}
                onOpenChange={(open) => {
                    if (open) {
                        onOpenChange(true);
                        return;
                    }

                    handleAttemptClose();
                }}
            >
                <ConvexDialog.Trigger asChild>
                    <View />
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />
                    <ConvexDialog.Content className='max-w-6xl max-h-[92vh]'>
                        <Pressable onPress={handleAttemptClose} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover rounded-full items-center justify-center'>
                            <PoppinsText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>×</PoppinsText>
                        </Pressable>
                        <DialogHeader text={title} subtext='This is what everyone in the game will see.' />

                        <Column className='flex-1 min-h-0 pt-5 -mx-5' gap={4}>
                            <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1 min-h-0'>
                                <ScrollView className='flex-1'>
                                    <Column className='px-5 pb-2' gap={6}>
                                        <Column gap={1}>
                                            <PoppinsText weight='medium'>In-game name</PoppinsText>
                                            <PoppinsTextInput
                                                className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                                placeholder='The name everyone knows you by'
                                                value={draft.inGameName}
                                                onChangeText={(value) => setDraft((current) => ({ ...current, inGameName: value }))}
                                            />
                                        </Column>

                                        <Row className='items-start gap-4'>
                                            <Column className='w-[126px] shrink-0' gap={2}>
                                                <PoppinsText weight='medium'>Profile picture</PoppinsText>
                                                <Pressable
                                                    onPress={() => setImageDialogMode('profile')}
                                                    className='items-center rounded-3xl border border-subtle-border bg-text/5 h-20 hover:brightness-90 hover:bg-text/10 overflow-hidden'
                                                >
                                                    <PlayerProfileAvatar
                                                        imageUrl={draft.profileImageUrl || undefined}
                                                        initials={previewInitials}
                                                    />
                                                </Pressable>
                                            </Column>

                                            <Column className='flex-1' gap={2}>
                                                <PoppinsText weight='medium'>Socials</PoppinsText>
                                                <Pressable
                                                    onPress={() => setIsSocialsDialogOpen(true)}
                                                    className='rounded-3xl border border-subtle-border bg-text/5 h-20 overflow-hidden brightness-95 hover:brightness-90 hover:bg-text/10'
                                                >
                                                    <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                                                        <ScrollView className='flex-1 p-4' pointerEvents='none'>
                                                            <PlayerProfileContactInfo
                                                                profile={draft}
                                                                emptyText='No socials yet. Tap to add.'
                                                                maxItems={4}
                                                            />
                                                        </ScrollView>
                                                    </ScrollShadow>
                                                </Pressable>
                                            </Column>
                                        </Row>

                                        <Column gap={2} className='w-full'>


                                            <Row className='items-start gap-4 w-full '>

                                                {/* LEFT SIDE: EDITOR */}
                                                <Column className='flex-1 min-w-[220px]' gap={1}>
                                                    <PoppinsText weight='medium'>Bio</PoppinsText>
                                                    <TownSquareComposerToolbar
                                                        onBold={() => runBioUpdate((value, range) => wrapSelection(value, range, '**', '**', 'bold text'))}
                                                        onItalic={() => runBioUpdate((value, range) => wrapSelection(value, range, '*', '*', 'italic text'))}
                                                        onLink={() => setIsLinkDialogOpen(true)}
                                                        onImage={() => setImageDialogMode('markdown')}
                                                        onMore={() => setIsMoreDialogOpen(true)}
                                                    />
                                                    <ScrollShadow LinearGradientComponent={LinearGradient} className='min-h-[120px] max-h-[220px]'>
                                                        <ScrollView className='rounded-[24px] py-4'>
                                                            <TownSquareComposerEditorPane
                                                                onBodyChange={(value) => setDraft((current) => ({ ...current, bioMarkdown: value }))}
                                                                onSelectionChange={setBioSelection}
                                                                value={draft.bioMarkdown || ''}
                                                            />
                                                        </ScrollView>
                                                    </ScrollShadow>
                                                </Column>

                                                {/* RIGHT SIDE: FULL PREVIEW */}
                                                <Column className='flex-1 min-w-[220px] hidden sm:flex' gap={2}>
                                                    <PoppinsText weight='medium'>Preview</PoppinsText>
                                                    <ScrollShadow LinearGradientComponent={LinearGradient} className='min-h-[120px] max-h-[220px] rounded-3xl'>
                                                        <ScrollView className='flex-1'>
                                                            <PlayerProfilePreviewCard
                                                                displayName={previewName}
                                                                bioMarkdown={draft.bioMarkdown || ''}
                                                                imageUrl={draft.profileImageUrl || undefined}
                                                                initials={previewInitials}
                                                                profile={draft}
                                                            />
                                                        </ScrollView>
                                                    </ScrollShadow>
                                                </Column>
                                            </Row>
                                        </Column>
                                    </Column>
                                </ScrollView>
                            </ScrollShadow>

                            <Row className='justify-end gap-3 px-5 pb-5'>
                                <AppButton variant='outline' className='w-36' onPress={handleAttemptClose}>
                                    <PoppinsText weight='medium'>Cancel</PoppinsText>
                                </AppButton>
                                <AppButton
                                    variant='black'
                                    className='w-40'
                                    onPress={handleSave}
                                    disabled={!canSave || !hasUnsavedChanges}
                                >
                                    <PoppinsText weight='medium' color='white'>{saveLabel}</PoppinsText>
                                </AppButton>
                            </Row>
                        </Column>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>

            {/* Socials Dialog */}
            <SocialsDialog
                isOpen={isSocialsDialogOpen}
                onOpenChange={setIsSocialsDialogOpen}
                onSave={handleSocialsSave}
                initialSocials={socialsData}
            />

            <TownSquareMoreOptionsDialog
                isOpen={isMoreDialogOpen}
                onOpenChange={setIsMoreDialogOpen}
                onSelectAction={(action) => runBioUpdate((value, selection) => applyMoreComposerAction(value, selection, action))}
            />

            <TownSquareLinkDialog
                isOpen={isLinkDialogOpen}
                onInsert={(label, url) => runBioUpdate((value, selection) => insertMarkdownLink(value, selection, label, url))}
                onOpenChange={setIsLinkDialogOpen}
                selectedText={selectedText}
            />

            <ImageUploadDialog
                isOpen={imageDialogMode !== null}
                onOpenChange={(open) => setImageDialogMode(open ? imageDialogMode : null)}
                onImageSelect={handleImageSelect}
                title={imageDialogMode === 'profile' ? 'Profile Photo' : 'Select Image'}
                subtitle={imageDialogMode === 'profile' ? 'Choose a profile picture' : 'Choose an image from your device or enter a URL'}
                initialImageUrl={imageDialogMode === 'profile' ? draft.profileImageUrl : ''}
            />

            <UnsavedChangesDialog
                isOpen={isLeaveConfirmDialogOpen}
                onOpenChange={setIsLeaveConfirmDialogOpen}
                onStay={handleCancelLeave}
                onLeave={handleConfirmLeave}
            />
        </>
    );
};

// Socials Dialog Component
interface SocialsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (socials: SocialsData) => void;
    initialSocials: SocialsData;
}

const SocialsDialog = ({ isOpen, onOpenChange, onSave, initialSocials }: SocialsDialogProps) => {
    const [draft, setDraft] = useState(initialSocials);
    const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
    const previewProfile = useMemo<PlayerProfile>(() => ({
        gameId: '',
        email: '',
        userId: '',
        inGameName: '',
        profileImageUrl: '',
        phoneNumber: draft.phoneNumber,
        instagram: draft.instagram,
        discord: draft.discord,
        otherContact: draft.otherContact,
        bioMarkdown: '',
        claimedAt: 0,
    }), [draft.discord, draft.instagram, draft.otherContact, draft.phoneNumber]);

    useEffect(() => {
        if (isOpen) {
            setDraft(initialSocials);
            setIsLeaveConfirmDialogOpen(false);
        }
    }, [initialSocials, isOpen]);

    const hasUnsavedChanges = useMemo(() => hasSocialsDraftChanges(draft, initialSocials), [draft, initialSocials]);

    const handleAttemptClose = () => {
        if (hasUnsavedChanges) {
            setIsLeaveConfirmDialogOpen(true);
            return;
        }

        onOpenChange(false);
    };

    const handleConfirmLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
        onOpenChange(false);
    };

    const handleCancelLeave = () => {
        setIsLeaveConfirmDialogOpen(false);
    };

    const handleSave = () => {
        if (!hasUnsavedChanges) {
            return;
        }

        onSave(draft);
    };

    return (
        <ConvexDialog.Root
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (open) {
                    onOpenChange(true);
                    return;
                }

                handleAttemptClose();
            }}
        >
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='p-1 max-w-5xl max-h-[80vh]'>
                    <Pressable onPress={handleAttemptClose} className='absolute right-4 top-4 z-10 h-10 w-10 bg-accent-hover rounded-full items-center justify-center'>
                        <PoppinsText color='rgb(246, 238, 219)' weight='bold' className='text-xl'>×</PoppinsText>
                    </Pressable>
                    <DialogHeader text='Socials' />

                    <Column className='flex-1 min-h-0 pt-5' gap={4}>
                        <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1 min-h-0'>
                            <ScrollView className='flex-1'>
                                <Column className='items-start gap-4 px-5 pb-2'>
                                    <Column className='flex-1 min-w-0 gap-4'>
                                        <Row className='gap-4'>
                                            <Column className='flex-1 min-w-0 gap={1}'>
                                                <PoppinsText weight='medium'>Phone number</PoppinsText>
                                                <PoppinsTextInput
                                                    className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                                    value={draft.phoneNumber}
                                                    onChangeText={(value) => setDraft((current) => ({ ...current, phoneNumber: value }))}
                                                    placeholder='Optional'
                                                />
                                            </Column>

                                            <Column className='flex-1 min-w-0 gap={1}'>
                                                <PoppinsText weight='medium'>Instagram</PoppinsText>
                                                <PoppinsTextInput
                                                    className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                                    value={draft.instagram}
                                                    onChangeText={(value) => setDraft((current) => ({ ...current, instagram: value }))}
                                                    placeholder='Optional'
                                                />
                                            </Column>
                                        </Row>

                                        <Row className='gap-4'>
                                            <Column className='flex-1 min-w-0 gap={1}'>
                                                <PoppinsText weight='medium'>Discord</PoppinsText>
                                                <PoppinsTextInput
                                                    className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                                    value={draft.discord}
                                                    onChangeText={(value) => setDraft((current) => ({ ...current, discord: value }))}
                                                    placeholder='Optional'
                                                />
                                            </Column>

                                            <Column className='flex-1 min-w-0 gap={1}'>
                                                <PoppinsText weight='medium'>Anything else</PoppinsText>
                                                <PoppinsTextInput
                                                    className='w-full rounded-xl border border-subtle-border px-4 py-3'
                                                    value={draft.otherContact}
                                                    onChangeText={(value) => setDraft((current) => ({ ...current, otherContact: value }))}
                                                    placeholder='Optional'
                                                />
                                            </Column>
                                        </Row>
                                    </Column>

                                    <Column className='w-full shrink-0 gap={1}'>
                                        <PoppinsText weight='medium'>Preview</PoppinsText>
                                        <Column className='rounded-3xl border border-subtle-border bg-text/5 p-4'>
                                            <PlayerProfileContactInfo
                                                profile={previewProfile}
                                                emptyText='No socials yet.'
                                            />
                                        </Column>
                                    </Column>
                                </Column>
                            </ScrollView>
                        </ScrollShadow>

                        <Row className='justify-end gap-3 px-5 pb-5'>
                            <AppButton variant='outline' className='w-36' onPress={handleAttemptClose}>
                                <PoppinsText weight='medium'>Cancel</PoppinsText>
                            </AppButton>
                            <AppButton variant='black' className='w-40' onPress={handleSave} disabled={!hasUnsavedChanges}>
                                <PoppinsText weight='medium' color='white'>Save</PoppinsText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>

            <UnsavedChangesDialog
                isOpen={isLeaveConfirmDialogOpen}
                onOpenChange={setIsLeaveConfirmDialogOpen}
                onStay={handleCancelLeave}
                onLeave={handleConfirmLeave}
            />
        </ConvexDialog.Root>
    );
};

export default PlayerProfileDialogNEW;
