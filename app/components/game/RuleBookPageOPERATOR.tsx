import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, List } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useValue, useList } from '../../../hooks/useData';
import { getGameScopedKey } from '../../../utils/multiplayer';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import TableOfContentsDialog from './ruleBook/TableOfContentsDialog';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';

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

  const roles = roleTable?.value ?? [];
  const ruleBookTitle = ruleBookData?.value?.ruleBookTitle || '';
  const roleDescriptionsTitle = ruleBookData?.value?.roleDescriptionsTitle || '';
  const headingIdPrefix = `rulebook-${gameId}`;

  return (
    <Column className="gap-6 pb-6">
      <Row className="items-center justify-between">
        <Pressable onPress={onBack} className="self-start py-1">
          <Row className="items-center gap-4">
            <ChevronLeft size={20} color="rgb(46, 41, 37)" />
            <FontText weight="medium">Config</FontText>
          </Row>
        </Pressable>
        <Pressable
          onPress={() => setIsTocOpen(true)}
          className="bg-text/5 hover:bg-text/10 h-10 w-10 items-center justify-center rounded-full"
        >
          <List size={20} color="rgb(46, 41, 37)" />
        </Pressable>
      </Row>

      <Column className="border-border/15 gap-5 border-y py-5">
        <Column className="gap-2">
          <View nativeID={`${headingIdPrefix}-top`}>
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
          <Pressable
            onPress={() => setIsEditDialogOpen(true)}
            className="bg-text/5 min-h-[220px] flex-1 rounded-3xl p-4">
            {ruleBookData?.value?.content?.trim()?.length > 0 ? (
              <InputOptionsProvider gameId={gameId} showInputs={false}>
                <MarkdownRenderer
                  markdown={ruleBookData.value.content}
                  headingIdPrefix={headingIdPrefix}
                />
              </InputOptionsProvider>
            ) : (
              <Column className="min-h-[180px] items-center justify-center gap-4">
                <FontText variant="subtext">No rule book written yet. Tap to edit.</FontText>
              </Column>
            )}
          </Pressable>
        </Column>

        <RuleBookRoleDescriptions gameId={gameId} headingIdPrefix={headingIdPrefix} />
      </Column>

      <MarkdownEditorDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title={ruleBookTitle || DEFAULT_RULE_BOOK_TITLE}
        submitLabel="Save Rule Book"
        initialMarkdown={ruleBookData?.value?.content || ''}
        gameId={gameId}
        showScript
        onSubmit={({ markdown }) =>
          setRuleBookData({
            ...(ruleBookData?.value || { content: '', roleOrder: [] }),
            content: markdown,
          })
        }
      />

      <TableOfContentsDialog
        isOpen={isTocOpen}
        onOpenChange={setIsTocOpen}
        markdown={ruleBookData?.value?.content || ''}
        headingIdPrefix={headingIdPrefix}
        roles={roles}
        ruleBookTitle={ruleBookTitle || DEFAULT_RULE_BOOK_TITLE}
        roleDescriptionsTitle={roleDescriptionsTitle || 'Role Descriptions'}
      />
    </Column>
  );
};

export default RuleBookPageOPERATOR;
