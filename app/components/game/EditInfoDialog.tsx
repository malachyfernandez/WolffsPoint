import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppButton from '../ui/buttons/AppButton';
import ProfilePhotoCircle from '../ui/profile/ProfilePhotoCircle';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';

interface CustomUserInfo {
    name?: string;
    photoUrl?: string;
}

interface EditInfoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customUserInfo: CustomUserInfo;
    setCustomUserInfo: (info: CustomUserInfo) => void;
    clerkData: {
        name?: string;
        email?: string;
    };
}

const EditInfoDialog = ({
    isOpen,
    onClose,
    customUserInfo,
    setCustomUserInfo,
    clerkData,
}: EditInfoDialogProps) => {
    // Auto-fill with Clerk data initially, but allow custom overrides
    const [name, setName] = useState(customUserInfo.name || clerkData.name || '');
    const [photoUrl, setPhotoUrl] = useState(customUserInfo.photoUrl || '');

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setName(customUserInfo.name || clerkData.name || '');
        setPhotoUrl(customUserInfo.photoUrl || '');
    }, [clerkData.name, customUserInfo.name, customUserInfo.photoUrl, isOpen]);

    const handleSave = () => {
        const updatedInfo: CustomUserInfo = {
            name: name.trim(),
            photoUrl: photoUrl.trim(),
        };
        setCustomUserInfo(updatedInfo);
        onClose();
    };

    const handleResetName = () => {
        setName(clerkData.name || '');
    };

    const handlePhotoChange = (newPhotoUrl: string) => {
        setPhotoUrl(newPhotoUrl);
    };

    const handleCancel = () => {
        // Reset to original values
        setName(customUserInfo.name || clerkData.name || '');
        setPhotoUrl(customUserInfo.photoUrl || '');
        onClose();
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onClose}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content>
                    <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />
                    <Column className='gap-4'>
                        <DialogHeader
                            text="Edit Your Info"
                            subtext="Update your profile information"
                        />
                        <Column className="gap-4 p-4">


                            {/* Profile Photo */}
                            <Column className="gap-2 w-full items-center">
                                <FontText weight="medium">Profile Photo</FontText>
                                <ProfilePhotoCircle
                                    imageUrl={photoUrl}
                                    onImageChange={handlePhotoChange}
                                    size={100}
                                />
                            </Column>

                            {/* Name Input with Reset */}
                            <Column className='gap-2'>
                                <FontText weight="medium">Name</FontText>
                                <Row className="gap-4 w-full">
                                    <FontTextInput
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        variant="styled"
                                        className="w-full"
                                    />

                                    <AppButton
                                        variant="outline"
                                        className="h-12 px-3"
                                        onPress={handleResetName}
                                    >
                                        <FontText color="black" weight="medium">
                                            Reset
                                        </FontText>
                                    </AppButton>
                                </Row>
                            </Column>



                            {/* Action Buttons */}
                            <Row className="gap-4 pt-4 justify-end">
                                <AppButton
                                    variant="outline"
                                    onPress={handleCancel}
                                    className="w-32"
                                >
                                    <FontText color="black" weight="medium">
                                        Cancel
                                    </FontText>
                                </AppButton>
                                <AppButton
                                    variant="filled"
                                    onPress={handleSave}
                                    className="w-32"
                                >
                                    <FontText color="white" weight="medium">
                                        Save
                                    </FontText>
                                </AppButton>
                            </Row>
                        </Column>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default EditInfoDialog;
