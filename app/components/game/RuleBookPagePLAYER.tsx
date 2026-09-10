import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { List } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import { getGameScopedKey } from '../../../utils/multiplayer';
import RuleBookRoleDescriptionsPLAYER from './RuleBookRoleDescriptionsPLAYER';
import TableOfContentsDialog from './ruleBook/TableOfContentsDialog';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';

interface RuleBookPagePLAYERProps {
    gameId: string;
}

const HEADING_1_CLASS = 'text-3xl leading-9';
const DEFAULT_RULE_BOOK_TITLE = 'Rule Book';
const DEFAULT_ROLE_DESCRIPTIONS_TITLE = 'Role Descriptions';

const RuleBookPagePLAYER = ({ gameId }: RuleBookPagePLAYERProps) => {
    const [isTocOpen, setIsTocOpen] = useState(false);

    const gameRows = useFindListItems('games', {
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;

    const ruleBookRecords = useFindValues<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const roleTableRecords = useFindListItems<RoleTableItem[]>('roleTable', {
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : [],
    });

    const isLoading = gameRows === undefined || ruleBookRecords === undefined || roleTableRecords === undefined;

    const headingIdPrefix = `rulebook-${gameId}`;

    const ruleBookData = ruleBookRecords?.[0]?.value;
    const ruleBookMarkdown = ruleBookData?.content ?? '';
    const ruleBookTitle = ruleBookData?.ruleBookTitle || DEFAULT_RULE_BOOK_TITLE;
    const roleDescriptionsTitle = ruleBookData?.roleDescriptionsTitle || DEFAULT_ROLE_DESCRIPTIONS_TITLE;
    const roles = roleTableRecords?.[0]?.value ?? [];

    if (isLoading) {
        return (
            <Column className='gap-4 flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading rule book' />
            </Column>
        );
    }

    return (
        <Animated.View entering={FadeIn.duration(300)} className='flex-1 min-h-[760px]'>
            <Column className='gap-4 flex-1 py-3 sm:px-4'>
                <Row className='items-center justify-between'>
                    <Column className='gap-2 flex-1'>
                        <View nativeID={`${headingIdPrefix}-top`}>
                            <FontText weight='bold' className={HEADING_1_CLASS}>
                                {ruleBookTitle}
                            </FontText>
                        </View>
                    </Column>
                    <Pressable
                        onPress={() => setIsTocOpen(true)}
                        className='bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full'
                    >
                        <List size={20} color='rgb(46, 41, 37)' />
                    </Pressable>
                </Row>
                <Column className='gap-2'>
                    {ruleBookMarkdown.trim().length > 0 ? (
                        <InputOptionsProvider gameId={gameId} showInputs={false}>
                            <MarkdownRenderer
                                markdown={ruleBookMarkdown}
                                headingIdPrefix={headingIdPrefix}
                            />
                        </InputOptionsProvider>
                    ) : (
                        <FontText variant='subtext'>The operator has not written the rule book yet.</FontText>
                    )}
                </Column>

                <RuleBookRoleDescriptionsPLAYER gameId={gameId} headingIdPrefix={headingIdPrefix} />
            </Column>

            <TableOfContentsDialog
                isOpen={isTocOpen}
                onOpenChange={setIsTocOpen}
                markdown={ruleBookMarkdown}
                headingIdPrefix={headingIdPrefix}
                roles={roles}
                ruleBookTitle={ruleBookTitle}
                roleDescriptionsTitle={roleDescriptionsTitle}
            />
        </Animated.View>
    );
};

export default RuleBookPagePLAYER;
