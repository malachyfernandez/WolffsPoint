import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import FontText from '../ui/text/FontText';
import { useValue, useList } from '../../../hooks/useData';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import ActionDeadlineConfigItem from './config/ActionDeadlineConfigItem';
import VoteDeadlineConfigItem from './config/VoteDeadlineConfigItem';
import WakeUpTimeConfigItem from './config/WakeUpTimeConfigItem';
import DaysPerGameDayConfigItem from './config/DaysPerGameDayConfigItem';
import NewserConfigItem from './config/NewserConfigItem';
import GameNameConfigItem from './config/GameNameConfigItem';
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
    const [ruleBookData] = useValue<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });
    const [roleTable] = useList<RoleTableItem[]>("roleTable", gameId, { privacy: "PUBLIC" });

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
            <Row className='gap-4 items-start'>
                
                <Column className='gap-1 flex-1'>
                    <FontText weight='medium'>Rule book</FontText>
                    <FontText variant='subtext'>{previewText}</FontText>
                    <FontText variant='subtext'>
                        {visibleRoleDescriptionCount} role description{visibleRoleDescriptionCount === 1 ? '' : 's'}
                    </FontText>
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
    const [userTable] = useList<any[]>("userTable", gameId, { privacy: "PUBLIC" });

    const playerCount = (userTable?.value ?? []).filter((user: any) => user.userId !== currentUserId).length;

    return (
        <Pressable onPress={onPress} className='w-full rounded-3xl bg-text/5 px-4 py-4'>
            <Row className='gap-4 items-start'>
                
                <Column className='gap-1 flex-1'>
                    <FontText weight='medium'>Phone book</FontText>
                    <FontText variant='subtext'>
                        {playerCount} player{playerCount === 1 ? '' : 's'} in the game
                    </FontText>
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
        <Column className='gap-0 flex-1 min-h-[760px] py-3 sm:px-4'>
            <LayoutStateAnimatedView.Container stateVar={activeScreen} className='flex-1'>
                <LayoutStateAnimatedView.Option page={1} stateValue='config'>
                    <Column className='gap-6 pb-6'>
                        <RuleBookPreviewCard gameId={gameId} onPress={() => setActiveScreen('ruleBook')} />
                        <PhoneBookPreviewCard gameId={gameId} currentUserId={currentUserId} onPress={() => setActiveScreen('phoneBook')} />

                        <Column className='gap-0 border-y border-border/15'>
                            <ActionDeadlineConfigItem gameId={gameId} />
                            <VoteDeadlineConfigItem gameId={gameId} />
                            <WakeUpTimeConfigItem gameId={gameId} />
                            <DaysPerGameDayConfigItem gameId={gameId} />
                            <NewserConfigItem gameId={gameId} />
                            <GameNameConfigItem gameId={gameId} />
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
