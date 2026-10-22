import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useValue, useList } from 'hooks/useData';
import { useScriptFiles } from 'hooks/useScriptFiles';
import { getGameScopedKey } from 'utils/multiplayer';
import { useCellModuleStatus } from 'utils/legacySystems';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import CellFilesEditorDialog from './scriptFiles/CellFilesEditorDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import TableOfContentsDialog from './ruleBook/TableOfContentsDialog';
import StickyTocButton from './ruleBook/StickyTocButton';
import { RuleBookData } from 'types/ruleBook';
import { RoleTableItem } from 'types/roleTable';
import { evaluateMarkdownDocument } from 'utils/markdownDocument';
import type { MarkdownDocumentNavigationRequest } from '../ui/markdown/MarkdownDocumentView';

interface RuleBookPageOPERATORProps {
  gameId: string;
  onBack: () => void;
}

const HEADING_1_CLASS = 'text-3xl leading-9';
const DEFAULT_RULE_BOOK_TITLE = 'Rule Book';

/**
 * Rule book editor page for operators.
 * Provides editing capabilities for the rule book content and role descriptions.
 */
const RuleBookPageOPERATOR = ({ gameId, onBack }: RuleBookPageOPERATORProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  const [ruleBookData, setRuleBookData] = useValue<RuleBookData>(
    getGameScopedKey('ruleBook', gameId),
    {
      defaultValue: { content: '', roleOrder: [] },
      privacy: 'PUBLIC',
    }
  );

  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
  });
  const filesApi = useScriptFiles(gameId);
  const { displayModules } = useCellModuleStatus(gameId);

  const roles = roleTable?.value ?? [];
  const ruleBookTitle = ruleBookData?.value?.ruleBookTitle || '';
  const roleDescriptionsTitle = ruleBookData?.value?.roleDescriptionsTitle || '';
  const activeSource = displayModules
    ? (ruleBookData?.value?.modularContent ?? '')
    : (ruleBookData?.value?.content ?? '');
  const renderedMarkdown = displayModules ? filesApi.resolve(activeSource) : activeSource;
  const modularDocument = useMemo(
    () =>
      displayModules
        ? evaluateMarkdownDocument(renderedMarkdown, { filesIndex: filesApi.index })
        : undefined,
    [displayModules, renderedMarkdown, filesApi.index]
  );
  const [navigationRequest, setNavigationRequest] =
    useState<MarkdownDocumentNavigationRequest | null>(null);
  const headingIdPrefix = `rulebook-${gameId}`;

  return (
    <Column className="gap-6 pb-6">
      <Row className="items-center justify-between">
        <Pressable testID="rulebook-back" onPress={onBack} className="self-start py-1">
          <Row className="items-center gap-4">
            <ChevronLeft size={20} color="rgb(46, 41, 37)" />
            <FontText weight="medium">Config</FontText>
          </Row>
        </Pressable>
        <StickyTocButton
          onPress={() => setIsTocOpen(true)}
          isOpen={isTocOpen || isEditDialogOpen}
        />
      </Row>

      <Column className="border-border/15 gap-5 border-y py-5">
        <Column className="gap-2">
          <Row className="flex-wrap items-center gap-3">
            <View nativeID={`${headingIdPrefix}-top`} className="min-w-48 flex-1">
              <FontTextInput
                value={ruleBookTitle}
                placeholder={DEFAULT_RULE_BOOK_TITLE}
                onChangeText={(text) =>
                  setRuleBookData({
                    ...(ruleBookData?.value || { content: '', roleOrder: [] }),
                    ruleBookTitle: text,
                  })
                }
                variant="styled"
                weight="bold"
                className={`w-full ${HEADING_1_CLASS}`}
              />
            </View>
            <AppButton
              variant="outline"
              className="h-10 w-40"
              onPress={() => setIsEditDialogOpen(true)}>
              <FontText weight="medium">Edit rule book</FontText>
            </AppButton>
          </Row>
          {displayModules ? (
            <Column className="bg-text/5 min-h-[220px] flex-1 gap-4 rounded-3xl p-4">
              {activeSource.trim().length > 0 ? (
                <InputOptionsProvider gameId={gameId} showInputs={false}>
                  <MarkdownRenderer
                    markdown={renderedMarkdown}
                    headingIdPrefix={headingIdPrefix}
                    documentNodes={modularDocument?.nodes}
                    navigationRequest={navigationRequest ?? undefined}
                  />
                </InputOptionsProvider>
              ) : (
                <Column className="min-h-[180px] items-center justify-center gap-4">
                  <FontText variant="subtext">No rule book written yet.</FontText>
                </Column>
              )}
            </Column>
          ) : (
            <Pressable
              onPress={() => setIsEditDialogOpen(true)}
              className="bg-text/5 min-h-[220px] flex-1 rounded-3xl p-4">
              {activeSource.trim().length > 0 ? (
                <InputOptionsProvider gameId={gameId} showInputs={false}>
                  <MarkdownRenderer markdown={renderedMarkdown} headingIdPrefix={headingIdPrefix} />
                </InputOptionsProvider>
              ) : (
                <Column className="min-h-[180px] items-center justify-center gap-4">
                  <FontText variant="subtext">No rule book written yet. Tap to edit.</FontText>
                </Column>
              )}
            </Pressable>
          )}
        </Column>

        {!displayModules && (
          <RuleBookRoleDescriptions gameId={gameId} headingIdPrefix={headingIdPrefix} />
        )}
      </Column>

      {displayModules ? (
        <CellFilesEditorDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title={ruleBookTitle || DEFAULT_RULE_BOOK_TITLE}
          dialogSubtext="Compose files, folders, markdown, dividers, and navigation sections."
          cellText={activeSource}
          onSubmitText={(text) =>
            setRuleBookData({
              ...(ruleBookData?.value || { content: '', roleOrder: [] }),
              modularContent: text,
            })
          }
          filesApi={filesApi}
          pinnedFolder="ruleBook"
          nameBase="Rule book"
          gameId={gameId}
          hideInputs={false}
          forceFiles
          historyKey={`ruleBook:${gameId}`}
        />
      ) : (
        <MarkdownEditorDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          title={ruleBookTitle || DEFAULT_RULE_BOOK_TITLE}
          initialMarkdown={activeSource}
          gameId={gameId}
          showScript
          onSubmit={({ markdown }) =>
            setRuleBookData({
              ...(ruleBookData?.value || { content: '', roleOrder: [] }),
              content: markdown,
            })
          }
          historyKey={`ruleBook:${gameId}`}
        />
      )}

      <TableOfContentsDialog
        isOpen={isTocOpen}
        onOpenChange={setIsTocOpen}
        markdown={renderedMarkdown}
        headingIdPrefix={headingIdPrefix}
        roles={displayModules ? [] : roles}
        ruleBookTitle={ruleBookTitle || DEFAULT_RULE_BOOK_TITLE}
        roleDescriptionsTitle={roleDescriptionsTitle || 'Role Descriptions'}
        documentNodes={modularDocument?.nodes}
        onNavigate={(path, targetId) => setNavigationRequest({ path, targetId, nonce: Date.now() })}
      />
    </Column>
  );
};

export default RuleBookPageOPERATOR;
