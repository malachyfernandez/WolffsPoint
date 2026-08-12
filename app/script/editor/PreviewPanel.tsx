import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../../components/ui/markdown/MarkdownRenderer';
import { printScript } from '../lang/printer';
import { interpretScript } from '../runtime/interpreter';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import type { Script } from '../lang/ast';

interface PreviewPanelProps {
  ast: Script;
  sources?: ScriptSourceData;
  isInDialog?: boolean;
}

const decodeInputState = (
  state: Record<string, string | undefined> = {}
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (value?.startsWith('[') || value?.startsWith('{')) {
        try {
          return [key, JSON.parse(value)];
        } catch {
          return [key, value];
        }
      }
      return [key, value];
    })
  );

const PreviewPanel = ({ ast, sources, isInDialog = true }: PreviewPanelProps) => {
  const [previewState] = useState<Record<string, string | undefined>>({});
  const scriptText = useMemo(() => printScript(ast), [ast]);

  const result = useMemo(() => {
    const inputState = decodeInputState(previewState);
    return interpretScript(ast, {
      globals: {
        ...createScriptGlobals(sources),
        Inputs: inputState,
      },
      inputState,
    });
  }, [ast, previewState, sources]);

  const instructionCount = result.output.length;
  const hasIssues = result.issues.length > 0;

  return (
    <Column className="gap-2">
      <Row className="items-center justify-between gap-2">
        <FontText variant="cardHeader">Live Preview</FontText>
        <FontText variant="subtext" className="text-xs">
          {instructionCount} {instructionCount === 1 ? 'input' : 'inputs'}
          {hasIssues ? ` • ${result.issues.length} issues` : ''}
        </FontText>
      </Row>
      <View className="border-subtle-border bg-text/5 rounded-xl border p-3">
        {instructionCount === 0 ? (
          <FontText variant="subtext" className="py-4 text-center">
            No inputs rendered. Add CreateSelectInput, CreateTextInput, etc.
          </FontText>
        ) : (
          <MarkdownRendererInputDataProvider
            playerOptions={[]}
            roleOptions={[]}
            scriptSources={sources}>
            <MarkdownRenderer markdown={''} isInDialog={isInDialog} />
          </MarkdownRendererInputDataProvider>
        )}
      </View>
      {hasIssues && (
        <Column className="gap-1 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2">
          {result.issues.slice(0, 5).map((issue, i) => (
            <FontText key={i} variant="subtext" className="text-xs">
              • {issue.message}
            </FontText>
          ))}
        </Column>
      )}
      <View className="border-subtle-border bg-text/5 rounded-lg border p-2">
        <FontText variant="subtext" className="font-mono text-xs">
          {scriptText.slice(0, 500)}
          {scriptText.length > 500 ? '...' : ''}
        </FontText>
      </View>
    </Column>
  );
};

export default PreviewPanel;
