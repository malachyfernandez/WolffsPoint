import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import PoppinsTimeInput from '../ui/forms/PoppinsTimeInput';
import { useUserList } from '../../../hooks/useUserList';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { GameSchedule } from '../../../types/multiplayer';
import { getGameScopedKey, normalizeGameSchedule, defaultGameSchedule, formatTimeLabel } from '../../../utils/multiplayer';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';

interface RuleBookPageOPERATORProps {
    gameId: string;
}

type ConfigPageScreenState = 'config' | 'ruleBook';

interface ConfigSectionRowProps {
    title: string;
    subtext: string;
    children: React.ReactNode;
    showDivider?: boolean;
}

const ConfigSectionRow = ({ title, subtext, children, showDivider = true }: ConfigSectionRowProps) => {
    return (
        <Row className={`items-center justify-between gap-4 py-4 ${showDivider ? 'border-b border-border/15' : ''}`} style={{ flexWrap: 'wrap' }}>
            <Column className='min-w-[220px] flex-1' gap={1}>
                <PoppinsText weight='medium'>{title}</PoppinsText>
                <PoppinsText varient='subtext'>{subtext}</PoppinsText>
            </Column>
            {children}
        </Row>
    );
};

const ActionDeadlineConfigItem = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Action deadline'
            subtext={`Players can submit actions until ${formatTimeLabel(schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00')}.`}
        >
            <PoppinsTimeInput
                value={schedule.actionDeadlineTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    actionDeadlineTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

const VoteDeadlineConfigItem = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Vote deadline'
            subtext={`Players can submit votes until ${formatTimeLabel(schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00')}.`}
        >
            <PoppinsTimeInput
                value={schedule.voteDeadlineTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    voteDeadlineTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

const WakeUpTimeConfigItem = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);

    return (
        <ConfigSectionRow
            title='Wake up time'
            subtext={`Morning messages and the newspaper unlock at ${formatTimeLabel(schedule.wakeUpTime)}.`}
        >
            <PoppinsTimeInput
                value={schedule.wakeUpTime}
                onChangeText={(value) => setGameSchedule({
                    ...schedule,
                    wakeUpTime: value,
                    nightlyResponseReleaseTime: value,
                    newspaperReleaseTime: value,
                })}
                className='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

const DaysPerGameDayConfigItem = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: 'numberOfRealDaysPerInGameDay',
        itemId: gameId,
        privacy: 'PUBLIC',
        defaultValue: 2,
    });

    return (
        <ConfigSectionRow
            title='Days per game day'
            subtext='Controls how many real-world days each in-game day spans by default.'
            showDivider={false}
        >
            <Row className='items-center gap-3'>
                <PoppinsNumberInput
                    value={numberOfRealDaysPerInGameDay.value}
                    onChangeText={(displayValue, isValid, numericValue) => {
                        if (isValid && numericValue !== null) {
                            setNumberOfRealDaysPerInGameDay(numericValue);
                        }
                    }}
                    minValue={1}
                    maxValue={30}
                    inline={true}
                    useDefaultStyling={true}
                    className='border-border/15 bg-text/5'
                />
                <PoppinsText varient='subtext'>days</PoppinsText>
            </Row>
        </ConfigSectionRow>
    );
};

interface RuleBookPreviewCardProps extends RuleBookPageOPERATORProps {
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

    const previewText = useMemo(() => {
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

        return flattenedContent.length > 180 ? `${flattenedContent.slice(0, 180).trim()}…` : flattenedContent;
    }, [ruleBookData?.value?.content]);

    const visibleRoleDescriptionCount = useMemo(() => {
        return (roleTable?.value ?? []).filter((role) => role.isVisible !== false && role.aboutRole?.trim().length).length;
    }, [roleTable?.value]);

    return (
        <Pressable onPress={onPress} className='w-full rounded-3xl bg-text/5 px-4 py-4'>
            <Row className='items-start gap-3'>
                <ChevronRight size={20} color='rgb(46, 41, 37)' className='mt-1' />
                <Column className='flex-1' gap={1}>
                    <PoppinsText weight='medium'>Rule book</PoppinsText>
                    <PoppinsText varient='subtext'>{previewText}</PoppinsText>
                    <PoppinsText varient='subtext'>
                        {visibleRoleDescriptionCount} role description{visibleRoleDescriptionCount === 1 ? '' : 's'}
                    </PoppinsText>
                </Column>
            </Row>
        </Pressable>
    );
};

interface RuleBookEditorViewProps extends RuleBookPageOPERATORProps {
    onBack: () => void;
}

const RuleBookEditorView = ({ gameId, onBack }: RuleBookEditorViewProps) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [ruleBookData, setRuleBookData] = useUserVariable<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });

    return (
        <Column className='pb-6' gap={6}>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='items-center gap-2'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <PoppinsText weight='medium'>Config</PoppinsText>
                </Row>
            </Pressable>

            <Column className='border-y border-border/15 py-5' gap={5}>
                <Column gap={2}>
                    <PoppinsText weight='bold' className='text-xl'>Rule Book</PoppinsText>
                    <Pressable 
                    onPress={() => setIsEditDialogOpen(true)}
                        className='flex-1 min-h-[220px] rounded-3xl bg-text/5 p-4'
                    >
                        {ruleBookData?.value?.content?.trim()?.length > 0 ? (
                            <MarkdownRenderer markdown={ruleBookData.value.content} />
                        ) : (
                            <Column className='min-h-[180px] items-center justify-center'>
                                <PoppinsText varient='subtext'>No rule book written yet. Tap to edit.</PoppinsText>
                            </Column>
                        )}
                    </Pressable>
                </Column>

                <RuleBookRoleDescriptions gameId={gameId} />
            </Column>

            <MarkdownEditorDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                title="Rule Book"
                submitLabel="Save Rule Book"
                initialMarkdown={ruleBookData?.value?.content || ''}
                onSubmit={({ markdown }) => setRuleBookData({
                    ...(ruleBookData?.value || { content: '', roleOrder: [] }),
                    content: markdown
                })}
            />
        </Column>
    );
};

const ConfigPageOPERATOR = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [activeScreen, setActiveScreen] = useState<ConfigPageScreenState>('config');

    return (
        <Column className='flex-1 min-h-[760px]' gap={0}>
            <LayoutStateAnimatedView.Container stateVar={activeScreen} className='flex-1'>
                <LayoutStateAnimatedView.Option page={1} stateValue='config'>
                    <Column className='pb-6' gap={6}>
                        <RuleBookPreviewCard gameId={gameId} onPress={() => setActiveScreen('ruleBook')} />

                        <Column className='border-y border-border/15' gap={0}>
                            <ActionDeadlineConfigItem gameId={gameId} />
                            <VoteDeadlineConfigItem gameId={gameId} />
                            <WakeUpTimeConfigItem gameId={gameId} />
                            <DaysPerGameDayConfigItem gameId={gameId} />
                        </Column>
                    </Column>
                </LayoutStateAnimatedView.Option>

                <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
                    <LayoutStateAnimatedView.Option stateValue='ruleBook'>
                        <RuleBookEditorView gameId={gameId} onBack={() => setActiveScreen('config')} />
                    </LayoutStateAnimatedView.Option>
                </LayoutStateAnimatedView.OptionContainer>
            </LayoutStateAnimatedView.Container>
        </Column>
    );
};

export default ConfigPageOPERATOR;
