import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useValue } from '../../../hooks/useData';
import { getGameScopedKey } from '../../../utils/multiplayer';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookPageOPERATORProps {
  gameId: string;
  onBack: () => void;
}

/**
 * Rule book editor page for operators.
 * Provides editing capabilities for the rule book content and role descriptions.
 */
const RuleBookPageOPERATOR = ({ gameId, onBack }: RuleBookPageOPERATORProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [ruleBookData, setRuleBookData] = useValue<RuleBookData>(
    getGameScopedKey('ruleBook', gameId),
    {
      defaultValue: { content: '', roleOrder: [] },
      privacy: 'PUBLIC',
    }
  );

  return (
    <Column className="gap-6 pb-6">
      <Pressable onPress={onBack} className="self-start py-1">
        <Row className="items-center gap-4">
          <ChevronLeft size={20} color="rgb(46, 41, 37)" />
          <FontText weight="medium">Config</FontText>
        </Row>
      </Pressable>

      <Column className="border-border/15 gap-5 border-y py-5">
        <Column className="gap-2">
          <FontText weight="bold" className="text-xl">
            Rule Book
          </FontText>
          <Pressable
            onPress={() => setIsEditDialogOpen(true)}
            className="bg-text/5 min-h-[220px] flex-1 rounded-3xl p-4">
            {ruleBookData?.value?.content?.trim()?.length > 0 ? (
              <InputOptionsProvider gameId={gameId} showInputs={false}>
                <MarkdownRenderer markdown={ruleBookData.value.content} />
              </InputOptionsProvider>
            ) : (
              <Column className="min-h-[180px] items-center justify-center gap-4">
                <FontText variant="subtext">No rule book written yet. Tap to edit.</FontText>
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
        gameId={gameId}
        showScript
        onSubmit={({ markdown }) =>
          setRuleBookData({
            ...(ruleBookData?.value || { content: '', roleOrder: [] }),
            content: markdown,
          })
        }
      />
    </Column>
  );
};

export default RuleBookPageOPERATOR;
