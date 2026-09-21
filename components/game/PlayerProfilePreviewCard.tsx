import React, { useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { PlayerProfile } from 'types/multiplayer';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import FontText from '../ui/text/FontText';
import PaperTextureOverlay from '../ui/PaperTextureOverlay';
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
    /** Slight tilt in degrees so cards look hand-placed. */
    rotation?: number;
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
            <View className='h-24 w-24 rounded-[3px] border border-border/40 bg-white/50' />
        );
    }

    if (imageUrl) {
        return (
            <View
                className='h-24 w-24 rounded-[3px] border border-border/40 bg-white p-1'
                style={{ transform: [{ rotate: '-1deg' }] }}
            >
                {!imageLoaded && (
                    <View className='absolute inset-0 rounded-[3px] bg-white/50' />
                )}
                <Animated.View entering={FadeIn.duration(300)} className='h-full w-full'>
                    <Image
                        source={{ uri: imageUrl }}
                        className='h-full w-full rounded-[2px]'
                        resizeMode='cover'
                        onLoad={() => setImageLoaded(true)}
                    />
                </Animated.View>
            </View>
        );
    }

    return (
        <View className='h-24 w-24 items-center justify-center rounded-[3px] border border-border/40 bg-white'>
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
    isDead = false,
    rotation = 0,
}: PlayerProfilePreviewCardProps & { email?: string; isLoading?: boolean; isDead?: boolean; rotation?: number }) => {
    const trimmedBioMarkdown = bioMarkdown.trim();

    return (
        <Column
            className={`gap-4 flex-1 rounded-[3px] border border-border/30 bg-[#b0a999] p-6 ${className}`.trim()}
            style={{
                transform: [{ rotate: `${rotation}deg` }],
                boxShadow: '0px 4px 10px rgba(20, 15, 8, 0.28)',
            }}
        >
            <PaperTextureOverlay opacity={0.4} borderRadius={3} />
            {isDead && (
                <View
                    pointerEvents='none'
                    className='absolute right-3 top-3 rounded-[2px] border-2 border-red-800/70 px-2 py-0.5'
                    style={{ transform: [{ rotate: '9deg' }] }}
                >
                    <FontText weight='bold' className='text-xs uppercase tracking-widest text-red-800/80'>
                        Dead
                    </FontText>
                </View>
            )}
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
                    <View className='h-px w-2/3 bg-border/30' />
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
