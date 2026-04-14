import React from 'react';
import { Image, View } from 'react-native';
import { AtSign, MessageSquare, Phone } from 'lucide-react-native';
import { PlayerProfile } from '../../../types/multiplayer';
import Column from '../layout/Column';
import Row from '../layout/Row';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PoppinsText from '../ui/text/PoppinsText';

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

    const rows: (ContactRow | null)[] = [
        profile.phoneNumber?.trim().length > 0
            ? {
                key: 'phoneNumber',
                value: profile.phoneNumber,
                icon: <Phone size={16} className={iconClassName} />,
            }
            : null,
        profile.instagram?.trim().length > 0
            ? {
                key: 'instagram',
                value: profile.instagram,
                icon: <AtSign size={16} className={iconClassName} />,
            }
            : null,
        profile.discord?.trim().length > 0
            ? {
                key: 'discord',
                value: profile.discord,
                icon: <MessageSquare size={16} className={iconClassName} />,
            }
            : null,
        profile.otherContact?.trim().length > 0
            ? {
                key: 'otherContact',
                value: profile.otherContact,
                icon: null,
            }
            : null,
    ];

    return rows.filter((item): item is ContactRow => item !== null);
};

export const PlayerProfileAvatar = ({ imageUrl, initials }: { imageUrl?: string; initials: string }) => {
    if (imageUrl) {
        return (
            <Image
                source={{ uri: imageUrl }}
                className='h-24 w-24 rounded-2xl border border-subtle-border bg-white'
                resizeMode='cover'
            />
        );
    }

    return (
        <View className='h-24 w-24 items-center justify-center rounded-2xl border border-subtle-border bg-white'>
            <PoppinsText weight='bold' className='text-2xl'>{initials}</PoppinsText>
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
        return emptyText ? <PoppinsText varient='subtext'>{emptyText}</PoppinsText> : null;
    }

    return (
        <Column className={`gap-2 ${className}`.trim()}>
            {visibleRows.map((row) => (
                <Row key={row.key} className='items-center gap-2'>
                    {row.icon}
                    <PoppinsText varient='subtext' className='flex-1'>{row.value}</PoppinsText>
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
    className = '',
    emptyBioLabel = 'Write whatever you want people to know about you.',
}: PlayerProfilePreviewCardProps) => {
    const trimmedBioMarkdown = bioMarkdown.trim();

    return (
        <Column className={`flex-1 rounded-3xl bg-text/5 p-6 gap-4 ${className}`.trim()}>
            <Column className='items-center gap-3'>
                <PlayerProfileAvatar imageUrl={imageUrl} initials={initials} />
                <Column className='w-full items-center gap-2'>
                    <PoppinsText weight='medium' className='text-lg text-center'>
                        {displayName}
                    </PoppinsText>
                    {trimmedBioMarkdown.length > 0 ? (
                        <MarkdownRenderer
                            markdown={trimmedBioMarkdown}
                            textAlign='center'
                            className='w-full'
                        />
                    ) : (
                        <PoppinsText varient='subtext' className='text-center'>
                            {emptyBioLabel}
                        </PoppinsText>
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
