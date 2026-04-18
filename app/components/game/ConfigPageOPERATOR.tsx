import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserList } from '../../../hooks/useUserList';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import ActionDeadlineConfigItem from './config/ActionDeadlineConfigItem';
import VoteDeadlineConfigItem from './config/VoteDeadlineConfigItem';
import WakeUpTimeConfigItem from './config/WakeUpTimeConfigItem';
import DaysPerGameDayConfigItem from './config/DaysPerGameDayConfigItem';
import RuleBookPageOPERATOR from './RuleBookPageOPERATOR';
import PhoneBookPageOPERATOR from './PhoneBookPageOPERATOR';
import RemoveGameButton from './RemoveGameButton';

interface ConfigPageOPERATORProps {
    gameId: string;
    currentUserId: string;
}

type ConfigPageScreenState = 'config' | 'ruleBook' | 'phoneBook';

interface RuleBookPreviewCardProps {
    gameId: string;
    onPress: () => void;
}

const RuleBookPreviewCard = ({ gameId, onPress }: RuleBookPreviewCardProps) => {
    const [ruleBookData] = useUserVariable<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });
    const [roleTable] = useUserList<RoleTableItem[]>({
        key: 'roleTable',
        itemId: gameId,
        privacy: 'PUBLIC',
    });

    const previewText = React.useMemo(() => {
        const rawContent = ruleBookData?.value?.content ?? '';
        const flattenedContent = rawContent
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/[`*_>#-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!flattenedContent.length) {
            return 'No rule book written yet.';
        }

        return flattenedContent.length > 180 ? `${flattenedContent.slice(0, 180).trim()}...` : flattenedContent;
    }, [ruleBookData?.value?.content]);

    const visibleRoleDescriptionCount = React.useMemo(() => {
        return (roleTable?.value ?? []).filter((role) => role.isVisible !== false && role.aboutRole?.trim().length).length;
    }, [roleTable?.value]);

    return (
        <Pressable onPress={onPress} className='w-full rounded-3xl bg-text/5 px-4 py-4'>
            <Row className='items-start gap-3'>
                
                <Column className='flex-1' gap={1}>
                    <PoppinsText weight='medium'>Rule book</PoppinsText>
                    <PoppinsText varient='subtext'>{previewText}</PoppinsText>
                    <PoppinsText varient='subtext'>
                        {visibleRoleDescriptionCount} role description{visibleRoleDescriptionCount === 1 ? '' : 's'}
                    </PoppinsText>
                </Column>
                <ChevronRight size={20} color='rgb(46, 41, 37)' className='mt-1' />
            </Row>
        </Pressable>
    );
};

interface PhoneBookPreviewCardProps {
    gameId: string;
    currentUserId: string;
    onPress: () => void;
}

const PhoneBookPreviewCard = ({ gameId, currentUserId, onPress }: PhoneBookPreviewCardProps) => {
    const [userTable] = useUserList<any[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const playerCount = (userTable?.value ?? []).filter((user: any) => user.userId !== currentUserId).length;

    return (
        <Pressable onPress={onPress} className='w-full rounded-3xl bg-text/5 px-4 py-4'>
            <Row className='items-start gap-3'>
                
                <Column className='flex-1' gap={1}>
                    <PoppinsText weight='medium'>Phone book</PoppinsText>
                    <PoppinsText varient='subtext'>
                        {playerCount} player{playerCount === 1 ? '' : 's'} in the game
                    </PoppinsText>
                </Column>
                <ChevronRight size={20} color='rgb(46, 41, 37)' className='mt-1' />
            </Row>
        </Pressable>
    );
};

/**
 * Main configuration page for operators.
 * Contains game schedule settings and provides access to the rule book editor.
 */
const ConfigPageOPERATOR = ({ gameId, currentUserId }: ConfigPageOPERATORProps) => {
    const [activeScreen, setActiveScreen] = useState<ConfigPageScreenState>('config');

    return (
        <Column className='flex-1 min-h-[760px]' gap={0}>
            <LayoutStateAnimatedView.Container stateVar={activeScreen} className='flex-1'>
                <LayoutStateAnimatedView.Option page={1} stateValue='config'>
                    <Column className='pb-6' gap={6}>
                        <RuleBookPreviewCard gameId={gameId} onPress={() => setActiveScreen('ruleBook')} />
                        <PhoneBookPreviewCard gameId={gameId} currentUserId={currentUserId} onPress={() => setActiveScreen('phoneBook')} />

                        <Column className='border-y border-border/15' gap={0}>
                            <ActionDeadlineConfigItem gameId={gameId} />
                            <VoteDeadlineConfigItem gameId={gameId} />
                            <WakeUpTimeConfigItem gameId={gameId} />
                            <DaysPerGameDayConfigItem gameId={gameId} />
                        </Column>

                        <RemoveGameButton gameId={gameId} />
                    </Column>
                </LayoutStateAnimatedView.Option>

                <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
                    <LayoutStateAnimatedView.Option stateValue='ruleBook'>
                        <RuleBookPageOPERATOR gameId={gameId} onBack={() => setActiveScreen('config')} />
                    </LayoutStateAnimatedView.Option>
                    <LayoutStateAnimatedView.Option stateValue='phoneBook'>
                        <PhoneBookPageOPERATOR gameId={gameId} currentUserId={currentUserId} onBack={() => setActiveScreen('config')} />
                    </LayoutStateAnimatedView.Option>
                </LayoutStateAnimatedView.OptionContainer>
            </LayoutStateAnimatedView.Container>
        </Column>
    );
};

export default ConfigPageOPERATOR;
