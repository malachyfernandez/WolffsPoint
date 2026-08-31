import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import ShadowScrollView from '../ui/ShadowScrollView';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppButton from '../ui/buttons/AppButton';
import ImageUploadDialog from '../ui/dialog/ImageUploadDialog';
import { PlayerProfile } from '../../../types/multiplayer';
import PlayerProfilePreviewCard, {
  PlayerProfileAvatar,
  PlayerProfileContactInfo,
} from './PlayerProfilePreviewCard';
import BioEditorDialog from './BioEditorDialog';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { TabSelector } from './markdownEditor';

interface PlayerProfileDialogNEWProps {
  initialValue: PlayerProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: PlayerProfile) => void;
  title: string;
  saveLabel?: string;
  operatorRealName?: string;
  onSaveCustomUserInfo?: (info: { name: string }) => void;
  frameVariant?: 'gold' | 'ghostly';
}

interface SocialsData {
  phoneNumber: string;
  instagram: string;
  discord: string;
  otherContact: string;
}

type ImageDialogMode = 'profile' | null;

const normalizeText = (value?: string) => value?.trim() || '';

const hasProfileDraftChanges = (draft: PlayerProfile, initialValue: PlayerProfile) =>
  normalizeText(draft.inGameName) !== normalizeText(initialValue.inGameName) ||
  normalizeText(draft.profileImageUrl) !== normalizeText(initialValue.profileImageUrl) ||
  normalizeText(draft.phoneNumber) !== normalizeText(initialValue.phoneNumber) ||
  normalizeText(draft.instagram) !== normalizeText(initialValue.instagram) ||
  normalizeText(draft.discord) !== normalizeText(initialValue.discord) ||
  normalizeText(draft.otherContact) !== normalizeText(initialValue.otherContact) ||
  normalizeText(draft.bioMarkdown) !== normalizeText(initialValue.bioMarkdown);

const hasSocialsDraftChanges = (draft: SocialsData, initialSocials: SocialsData) =>
  normalizeText(draft.phoneNumber) !== normalizeText(initialSocials.phoneNumber) ||
  normalizeText(draft.instagram) !== normalizeText(initialSocials.instagram) ||
  normalizeText(draft.discord) !== normalizeText(initialSocials.discord) ||
  normalizeText(draft.otherContact) !== normalizeText(initialSocials.otherContact);

const PlayerProfileDialogNEW = ({
  initialValue,
  isOpen,
  onOpenChange,
  onSave,
  title,
  saveLabel = 'Save profile',
  operatorRealName,
  onSaveCustomUserInfo,
  frameVariant = 'gold',
}: PlayerProfileDialogNEWProps) => {
  // Main profile state
  const [draft, setDraft] = useState<PlayerProfile>(initialValue);
  const [realName, setRealName] = useState(operatorRealName || '');
  const [isSocialsDialogOpen, setIsSocialsDialogOpen] = useState(false);
  const [isBioDialogOpen, setIsBioDialogOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('editing');
  const [imageDialogMode, setImageDialogMode] = useState<ImageDialogMode>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

  const [previousInitialValue, setPreviousInitialValue] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      const hasValueChanged =
        previousInitialValue === null ||
        JSON.stringify(initialValue) !== JSON.stringify(previousInitialValue);

      if (hasValueChanged) {
        setDraft(initialValue);
        setIsSocialsDialogOpen(false);
        setIsBioDialogOpen(false);
        setProfileTab('editing');
        setImageDialogMode(null);
        setIsLeaveConfirmDialogOpen(false);
        setPreviousInitialValue(initialValue);
      }
      if (operatorRealName !== undefined) {
        setRealName(operatorRealName);
      }
    }
  }, [initialValue, isOpen, previousInitialValue, operatorRealName]);

  // Validation
  const canSave = useMemo(() => draft.inGameName.trim().length > 0, [draft.inGameName]);
  const hasUnsavedChanges = useMemo(
    () => hasProfileDraftChanges(draft, initialValue),
    [draft, initialValue]
  );
  const previewName =
    draft.inGameName.trim().length > 0 ? draft.inGameName.trim() : 'Your in-game name';
  const previewInitials =
    previewName
      .split(' ')
      .map((namePart) => namePart[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const socialsData = useMemo(
    () => ({
      phoneNumber: draft.phoneNumber || '',
      instagram: draft.instagram || '',
      discord: draft.discord || '',
      otherContact: draft.otherContact || '',
    }),
    [draft.phoneNumber, draft.instagram, draft.discord, draft.otherContact]
  );

  const handleSocialsSave = (socials: SocialsData) => {
    setDraft((current) => ({
      ...current,
      ...socials,
    }));
    setIsSocialsDialogOpen(false);
  };

  const handleImageSelect = (imageUrl: string) => {
    if (imageDialogMode === 'profile') {
      setDraft((current) => ({ ...current, profileImageUrl: imageUrl }));
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

  const handleSave = () => {
    if (!canSave || !hasUnsavedChanges) {
      return;
    }
    onSave({
      ...draft,
      inGameName: draft.inGameName.trim(),
      claimedAt: draft.claimedAt || Date.now(),
    });
    if (onSaveCustomUserInfo) {
      onSaveCustomUserInfo({ name: realName.trim() });
    }
    onOpenChange(false);
  };

  return (
    <>
      <ConvexDialog.Root
        isOpen={isOpen}
        frameVariant={frameVariant}
        onOpenChange={(open: boolean) => {
          if (open) {
            onOpenChange(true);
            return;
          }

          handleAttemptClose();
        }}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content
            className="h-[80vh] max-w-6xl"
            frameVariant={frameVariant}
            isSwipeable={!hasUnsavedChanges}>
            <Pressable
              onPress={handleAttemptClose}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
              <FontText color="rgb(246, 238, 219)" weight="bold" className="text-xl">
                ×
              </FontText>
            </Pressable>
            <DialogHeader text={title} subtext="This is what everyone sees" />

            {/* Tab selector (narrow screens only) */}
            {!isDesktop && <TabSelector value={profileTab} onValueChange={setProfileTab} />}

            <Row className="-mx-5 min-h-0 flex-1 gap-0 sm:pt-5">
              {/* LEFT: Inputs (scrollable) — always on desktop, only on "editing" tab on mobile */}
              {(isDesktop || profileTab === 'editing') && (
                <ShadowScrollView className="flex-1" scrollViewClassName="flex-1">
                  <Column className="gap-6 px-2 pb-2 sm:px-5">
                    {operatorRealName !== undefined && (
                      <Column className="gap-1">
                        <FontText weight="medium">Real name</FontText>
                        <FontTextInput
                          className="border-subtle-border w-full rounded-xl border px-4 py-3"
                          placeholder="The name you go by"
                          value={realName}
                          onChangeText={setRealName}
                        />
                      </Column>
                    )}
                    <Column className="gap-1">
                      <FontText weight="medium">In-game name</FontText>
                      <FontTextInput
                        className="border-subtle-border w-full rounded-xl border px-4 py-3"
                        placeholder="The name everyone knows you by"
                        value={draft.inGameName}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, inGameName: value }))
                        }
                      />
                    </Column>
                    <Row className="items-start gap-4">
                      <Column className="w-[126px] shrink-0 gap-2">
                        <FontText weight="medium">Profile picture</FontText>
                        <Pressable
                          onPress={() => setImageDialogMode('profile')}
                          className="border-subtle-border bg-text/5 hover:bg-text/10 h-16 items-center overflow-hidden rounded-3xl border hover:brightness-90">
                          <PlayerProfileAvatar
                            imageUrl={draft.profileImageUrl || undefined}
                            initials={previewInitials}
                          />
                        </Pressable>
                      </Column>

                      <Column className="flex-1 gap-2">
                        <FontText weight="medium">Socials</FontText>
                        <Pressable
                          onPress={() => setIsSocialsDialogOpen(true)}
                          className="border-subtle-border bg-text/5 hover:bg-text/10 h-16 overflow-hidden rounded-3xl border brightness-95 hover:brightness-90">
                          <ShadowScrollView
                            className="flex-1"
                            scrollViewClassName="flex-1 p-4"
                            pointerEvents="none">
                            <PlayerProfileContactInfo
                              profile={draft}
                              emptyText="No socials yet. Tap to add."
                              maxItems={4}
                            />
                          </ShadowScrollView>
                        </Pressable>
                      </Column>
                    </Row>

                    {/* Bio preview box (clickable, opens bio editor modal) */}
                    <Column className="gap-2">
                      <FontText weight="medium">Bio</FontText>
                      <Pressable
                        onPress={() => setIsBioDialogOpen(true)}
                        className="border-subtle-border bg-text/5 hover:bg-text/10 min-h-35 max-h-20 overflow-hidden rounded-3xl border p-4 brightness-95 hover:brightness-90">
                        {draft.bioMarkdown?.trim() ? (
                          <MarkdownRenderer markdown={draft.bioMarkdown.trim()} />
                        ) : (
                          <FontText variant="subtext">
                            Write whatever you want people to know about you. Tap to edit.
                          </FontText>
                        )}
                      </Pressable>
                    </Column>
                  </Column>
                </ShadowScrollView>
              )}

              {/* RIGHT: Full-height profile preview — always on desktop, only on "preview" tab on mobile */}
              {(isDesktop || profileTab === 'preview') && (
                <Column className="flex-1 gap-2">
                  {isDesktop && <FontText weight="medium">Preview</FontText>}
                  <ShadowScrollView className="flex-1" scrollViewClassName="flex-1">
                    <PlayerProfilePreviewCard
                      displayName={previewName}
                      bioMarkdown={draft.bioMarkdown || ''}
                      imageUrl={draft.profileImageUrl || undefined}
                      initials={previewInitials}
                      profile={draft}
                    />
                  </ShadowScrollView>
                </Column>
              )}
            </Row>

            <Row className="justify-end gap-4 px-5">
              <AppButton variant="outline" className="w-20 sm:w-36" onPress={handleAttemptClose}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton
                variant="black"
                className="w-28 sm:w-40"
                onPress={handleSave}
                disabled={!canSave || !hasUnsavedChanges}>
                <FontText weight="medium" color="white">
                  {saveLabel}
                </FontText>
              </AppButton>
            </Row>
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

      {/* Bio Editor Dialog */}
      <BioEditorDialog
        isOpen={isBioDialogOpen}
        onOpenChange={setIsBioDialogOpen}
        title="Edit Bio"
        submitLabel="Save Bio"
        initialMarkdown={draft.bioMarkdown || ''}
        onSubmit={(markdown) => {
          setDraft((current) => ({ ...current, bioMarkdown: markdown }));
        }}
        gameId={undefined}
        profile={draft}
        displayName={previewName}
        initials={previewInitials}
        imageUrl={draft.profileImageUrl || undefined}
      />

      <ImageUploadDialog
        isOpen={imageDialogMode !== null}
        onOpenChange={(open) => setImageDialogMode(open ? imageDialogMode : null)}
        onImageSelect={handleImageSelect}
        title="Profile Photo"
        subtitle="Choose a profile picture"
        initialImageUrl={draft.profileImageUrl}
      />

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
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
  const previewProfile = useMemo<PlayerProfile>(
    () => ({
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
    }),
    [draft.discord, draft.instagram, draft.otherContact, draft.phoneNumber]
  );

  useEffect(() => {
    if (isOpen) {
      setDraft(initialSocials);
      setIsLeaveConfirmDialogOpen(false);
    }
  }, [initialSocials, isOpen]);

  const hasUnsavedChanges = useMemo(
    () => hasSocialsDraftChanges(draft, initialSocials),
    [draft, initialSocials]
  );

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

  const handleSave = () => {
    if (!hasUnsavedChanges) {
      return;
    }

    onSave(draft);
  };

  return (
    <ConvexDialog.Root
      isOpen={isOpen}
      onOpenChange={(open: boolean) => {
        if (open) {
          onOpenChange(true);
          return;
        }

        handleAttemptClose();
      }}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content
          className="max-h-[80vh] max-w-2xl p-1"
          isSwipeable={!hasUnsavedChanges}>
          <Pressable
            onPress={handleAttemptClose}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
            <FontText color="rgb(246, 238, 219)" weight="bold" className="text-xl">
              ×
            </FontText>
          </Pressable>
          <DialogHeader text="Socials" />

          <Column className="min-h-0 flex-1 gap-4 pt-5">
            <ShadowScrollView className="min-h-0 flex-1" scrollViewClassName="flex-1">
              <Column className="items-start gap-4 px-0 pb-2 sm:px-5">
                <Column className="min-w-0 flex-1 gap-4">
                  <Row className="gap-4">
                    <Column className="min-w-0 flex-1 gap-1">
                      <FontText weight="medium">Phone number</FontText>
                      <FontTextInput
                        className="border-subtle-border w-full rounded-xl border px-4 py-3"
                        value={draft.phoneNumber}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, phoneNumber: value }))
                        }
                        placeholder="Optional"
                      />
                    </Column>

                    <Column className="min-w-0 flex-1 gap-1">
                      <FontText weight="medium">Instagram</FontText>
                      <FontTextInput
                        className="border-subtle-border w-full rounded-xl border px-4 py-3"
                        value={draft.instagram}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, instagram: value }))
                        }
                        placeholder="Optional"
                      />
                    </Column>
                  </Row>

                  <Row className="gap-4">
                    <Column className="min-w-0 flex-1 gap-1">
                      <FontText weight="medium">Discord</FontText>
                      <FontTextInput
                        className="border-subtle-border w-full rounded-xl border px-4 py-3"
                        value={draft.discord}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, discord: value }))
                        }
                        placeholder="Optional"
                      />
                    </Column>

                    <Column className="min-w-0 flex-1 gap-1">
                      <FontText weight="medium">Anything else</FontText>
                      <FontTextInput
                        className="border-subtle-border w-full rounded-xl border px-4 py-3"
                        value={draft.otherContact}
                        onChangeText={(value) =>
                          setDraft((current) => ({ ...current, otherContact: value }))
                        }
                        placeholder="Optional"
                      />
                    </Column>
                  </Row>
                </Column>

                <Column className="w-full shrink-0 gap-1">
                  <FontText weight="medium">Preview</FontText>
                  <Column className="border-subtle-border bg-text/5 gap-4 rounded-3xl border p-4">
                    <PlayerProfileContactInfo
                      profile={previewProfile}
                      emptyText="No socials yet."
                    />
                  </Column>
                </Column>
              </Column>
            </ShadowScrollView>

            <Row className="flex-wrap justify-end gap-4 px-0 pb-5 sm:px-5">
              <AppButton variant="outline" className="w-24 sm:w-36" onPress={handleAttemptClose}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton
                variant="black"
                className="w-24 sm:w-40"
                onPress={handleSave}
                disabled={!hasUnsavedChanges}>
                <FontText weight="medium" color="white">
                  Save
                </FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
      />
    </ConvexDialog.Root>
  );
};

export default PlayerProfileDialogNEW;
