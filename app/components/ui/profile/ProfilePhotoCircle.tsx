import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import ImageUploadDialog from '../dialog/ImageUploadDialog';

interface ProfilePhotoCircleProps {
    imageUrl?: string;
    onImageChange: (imageUrl: string) => void;
    size?: number;
}

const ProfilePhotoCircle = ({
    imageUrl,
    onImageChange,
    size = 80,
}: ProfilePhotoCircleProps) => {
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

    const handleImageSelect = (newImageUrl: string) => {
        onImageChange(newImageUrl);
    };

    return (
        <>
            <Row className="items-center gap-3" gap={10}>
                {/* Profile Photo Circle */}
                <View
                    className="rounded-full overflow-hidden bg-border/20"
                    style={{
                        width: size,
                        height: size,
                    }}
                >
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-border/10">
                            <PoppinsText 
                                weight="medium" 
                                className="text-text/50"
                                style={{ fontSize: size / 3 }}
                            >
                                {imageUrl ? '' : '?'}
                            </PoppinsText>
                        </View>
                    )}
                </View>

                {/* Change Image Button */}
                <AppButton
                    variant="outline"
                    className="h-8 px-3"
                    onPress={() => setIsImageDialogOpen(true)}
                >
                    <PoppinsText color="black" weight="medium" className="text-sm">
                        Change
                    </PoppinsText>
                </AppButton>
            </Row>

            {/* Image Upload Dialog */}
            <ImageUploadDialog
                isOpen={isImageDialogOpen}
                onOpenChange={setIsImageDialogOpen}
                onImageSelect={handleImageSelect}
                title="Profile Photo"
                subtitle="Choose a profile picture"
                initialImageUrl={imageUrl}
            />
        </>
    );
};

export default ProfilePhotoCircle;
