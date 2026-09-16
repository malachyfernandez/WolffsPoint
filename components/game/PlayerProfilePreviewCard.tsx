import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { PlayerProfile } from '../../../types/multiplayer';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import FontText from '../ui/text/FontText';
import { InstagramIcon } from '../icons/InstagramIcon';
import { DiscordIcon } from '../icons/DiscordIcon';

interface PlayerProfilePreviewCardProps {
    displayName: string;
    bioMarkdown?: string;
    imageUrl?: string;
    initials: string;
    profile?: PlayerProfile | null;
    className?: string;
    emptyBioLabel?: string;
}

interface PlayerProfileContactInfoProps {
    profile?: PlayerProfile | null;
    email?: string;
    className?: string;
    emptyText?: string;
    maxItems?: number;
}

type ContactRow = {
    key: string;
    value: string;
    icon: React.ReactNode | null;
};

const iconClassName = 'text-text/60';

const getContactRows = (profile?: PlayerProfile | null) => {
    if (!profile) {
        return [] as ContactRow[];
    }

    const phoneValue = profile?.phoneNumber?.trim();
    const instaValue = profile?.instagram?.trim();
    const discordValue = profile?.discord?.trim();
    const otherValue = profile?.otherContact?.trim();

    const rows: (ContactRow | null)[] = [
        phoneValue
            ? {
                key: 'phoneNumber',
                value: phoneValue,
                icon: <Phone size={16} className={iconClassName} />,
            }
            : null,
        instaValue
            ? {
                key: 'instagram',
                value: instaValue,
                icon: <InstagramIcon size={16} color="#666" />,
            }
            : null,
        discordValue
            ? {
                key: 'discord',
                value: discordValue,
                icon: <DiscordIcon size={16} color="#666" />,
            }
            : null,
        otherValue
            ? {
                key: 'otherContact',
                value: otherValue,
                icon: null,
            }
            : null,
    ];

    return rows.filter((item): item is ContactRow => item !== null);
};

export const PlayerProfileAvatar = ({ imageUrl, initials, isLoading }: { imageUrl?: string; initials: string; isLoading?: boolean }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    // Show placeholder space while loading or when no image
    if (isLoading || (!imageUrl && !initials)) {
        return (
            <View className='h-24 w-24 rounded-2xl border border-subtle-border bg-white/50' />
        );
    }

    if (imageUrl) {
        return (
            <View className='h-24 w-24 rounded-2xl border border-subtle-border bg-white'>
                {!imageLoaded && (
                    <View className='absolute inset-0 rounded-2xl bg-white/50' />
                )}
                <Animated.View entering={FadeIn.duration(300)} className='h-full w-full'>
                    <Image
                        source={{ uri: imageUrl }}
                        className='h-full w-full rounded-2xl'
                        resizeMode='cover'
                        onLoad={() => setImageLoaded(true)}
                    />
                </Animated.View>
            </View>
        );
    }

    return (
        <View className='h-24 w-24 items-center justify-center rounded-2xl border border-subtle-border bg-white'>
            <FontText weight='bold' className='text-2xl'>{initials}</FontText>
        </View>
    );
};

export const PlayerProfileContactInfo = ({
    profile,
    className = '',
    emptyText,
    maxItems,
}: PlayerProfileContactInfoProps) => {
    const rows = getContactRows(profile);
    const visibleRows = typeof maxItems === 'number' ? rows.slice(0, maxItems) : rows;

    if (visibleRows.length === 0) {
        return emptyText ? <FontText variant='subtext'>{emptyText}</FontText> : null;
    }

    return (
        <Column className={`gap-4 ${className}`.trim()}>
            {visibleRows.map((row) => (
                <Row key={row.key} className='gap-4 items-center'>
                    {row.icon}
                    <FontText variant='subtext' className='flex-1'>{row.value}</FontText>
                </Row>
            ))}
        </Column>
    );
};

const PlayerProfilePreviewCard = ({
    displayName,
    bioMarkdown = '',
    imageUrl,
    initials,
    profile,
    email,
    className = '',
    emptyBioLabel = 'Write whatever you want people to know about you.',
    isLoading = false,
}: PlayerProfilePreviewCardProps & { email?: string; isLoading?: boolean }) => {
    const trimmedBioMarkdown = bioMarkdown.trim();

    return (
        <Column className={`gap-4 flex-1 rounded-3xl bg-text/5 p-6 ${className}`.trim()}>
            <Column className='gap-4 items-center'>
                <PlayerProfileAvatar imageUrl={imageUrl} initials={initials} isLoading={isLoading} />
                <Column className='gap-4 w-full items-center'>
                    <Column className='gap-0 w-full items-center'>
                        <FontText weight='medium' className='text-lg text-center'>
                            {displayName}
                        </FontText>
                        {email?.trim() && (
                            <FontText variant='subtext' className='text-center'>
                                {email.trim()}
                            </FontText>
                        )}
                    </Column>
                    {trimmedBioMarkdown.length > 0 ? (
                        <MarkdownRenderer
                            markdown={trimmedBioMarkdown}
                            textAlign='center'
                            className='w-full'
                        />
                    ) : (
                        <FontText variant='subtext' className='text-center'>
                            {emptyBioLabel}
                        </FontText>
                    )}
                </Column>
            </Column>
            <PlayerProfileContactInfo
                profile={profile}
                emptyText='No Contact Info'
            />
        </Column>
    );
};

export default PlayerProfilePreviewCard;
