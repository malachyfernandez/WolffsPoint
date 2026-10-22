import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingContainer from '../ui/loading/LoadingContainer';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useFindListItems, useFindValues } from 'hooks/useData';
import { useScriptFilesReader } from 'hooks/useScriptFiles';
import { getGameScopedKey } from 'utils/multiplayer';
import { useSharedCellModuleStatus } from 'utils/legacySystems';
import RuleBookRoleDescriptionsPLAYER from './RuleBookRoleDescriptionsPLAYER';
import PrintRule from '../ui/PrintRule';
import TableOfContentsDialog from './ruleBook/TableOfContentsDialog';
import StickyTocButton from './ruleBook/StickyTocButton';
import { RuleBookData } from 'types/ruleBook';
import { RoleTableItem } from 'types/roleTable';
import { useContentWidth } from 'hooks/useContentWidth';
import { evaluateMarkdownDocument } from 'utils/markdownDocument';
import type { MarkdownDocumentNavigationRequest } from '../ui/markdown/MarkdownDocumentView';

interface RuleBookPagePLAYERProps {
    gameId: string;
}

const HEADING_1_CLASS = 'text-3xl leading-9';
const DEFAULT_RULE_BOOK_TITLE = 'Rule Book';
const DEFAULT_ROLE_DESCRIPTIONS_TITLE = 'Role Descriptions';

const RuleBookPagePLAYER = ({ gameId }: RuleBookPagePLAYERProps) => {
    const [isTocOpen, setIsTocOpen] = useState(false);
    const contentWidth = useContentWidth();

    const gameRows = useFindListItems('games', {
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;
    const operatorUserIds = operatorUserId ? [operatorUserId] : undefined;
    const filesApi = useScriptFilesReader(gameId, operatorUserIds);
    const { displayModules } = useSharedCellModuleStatus(gameId, operatorUserIds);

    const ruleBookRecords = useFindValues<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const roleTableRecords = useFindListItems<RoleTableItem[]>('roleTable', {
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : [],
    });

    const headingIdPrefix = `rulebook-${gameId}`;

    const ruleBookData = ruleBookRecords?.[0]?.value;
    const activeSource = displayModules
        ? (ruleBookData?.modularContent ?? '')
        : (ruleBookData?.content ?? '');
    const ruleBookMarkdown = displayModules ? filesApi.resolve(activeSource) : activeSource;
    const modularDocument = useMemo(
        () =>
            displayModules
                ? evaluateMarkdownDocument(ruleBookMarkdown, { filesIndex: filesApi.index })
                : undefined,
        [displayModules, ruleBookMarkdown, filesApi.index]
    );
    const [navigationRequest, setNavigationRequest] =
        useState<MarkdownDocumentNavigationRequest | null>(null);
    const ruleBookTitle = ruleBookData?.ruleBookTitle || DEFAULT_RULE_BOOK_TITLE;
    const roleDescriptionsTitle = ruleBookData?.roleDescriptionsTitle || DEFAULT_ROLE_DESCRIPTIONS_TITLE;
    const roles = roleTableRecords?.[0]?.value ?? [];

    return (
        <LoadingContainer
            dependencies={[gameRows, ruleBookRecords, roleTableRecords, !filesApi.isLoading]}
            loadingText='Loading rule book'
            className='flex-1 min-h-[760px]'
        >
            <Column className={`gap-4 flex-1 py-3 ${contentWidth >= 640 ? 'px-4' : ''}`}>
                <Row className='items-center justify-between'>
                    <Column className='gap-2 flex-1'>
                        <View nativeID={`${headingIdPrefix}-top`}>
                            <FontText weight='bold' className={`${HEADING_1_CLASS} uppercase tracking-wider`}>
                                {ruleBookTitle}
                            </FontText>
                        </View>
                    </Column>
                    <StickyTocButton onPress={() => setIsTocOpen(true)} isOpen={isTocOpen} />
                </Row>
                <PrintRule />
                <Column className='gap-2'>
                    {activeSource.trim().length > 0 ? (
                        <InputOptionsProvider gameId={gameId} showInputs={false}>
                            <MarkdownRenderer
                                markdown={ruleBookMarkdown}
                                headingIdPrefix={headingIdPrefix}
                                documentNodes={modularDocument?.nodes}
                                navigationRequest={navigationRequest ?? undefined}
                            />
                        </InputOptionsProvider>
                    ) : (
                        <FontText variant='subtext'>The operator has not written the rule book yet.</FontText>
                    )}
                </Column>

                {!displayModules && (
                    <RuleBookRoleDescriptionsPLAYER gameId={gameId} headingIdPrefix={headingIdPrefix} />
                )}
            </Column>

            <TableOfContentsDialog
                isOpen={isTocOpen}
                onOpenChange={setIsTocOpen}
                markdown={ruleBookMarkdown}
                headingIdPrefix={headingIdPrefix}
                roles={displayModules ? [] : roles}
                ruleBookTitle={ruleBookTitle}
                roleDescriptionsTitle={roleDescriptionsTitle}
                documentNodes={modularDocument?.nodes}
                onNavigate={(path, targetId) =>
                    setNavigationRequest({ path, targetId, nonce: Date.now() })
                }
            />
        </LoadingContainer>
    );
};

export default RuleBookPagePLAYER;
