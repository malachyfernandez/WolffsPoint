import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import FontText from '../../components/ui/text/FontText';
import AppDropdown from '../../components/ui/forms/AppDropdown';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../../components/ui/markdown/MarkdownRenderer';
import { printScript } from '../lang/printer';
import { interpretScript } from '../runtime/interpreter';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import type { Script } from '../lang/ast';
import type { RoleTableItem } from '../../../types/roleTable';

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
  const [previewState, setPreviewState] = useState<Record<string, string | undefined>>({});
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState<string | undefined>(undefined);
  const scriptText = useMemo(() => printScript(ast), [ast]);

  const players = sources?.players ?? [];
  const roles = sources?.roles ?? [];

  // Build player dropdown options from the sources
  const playerDropdownOptions = useMemo(
    () =>
      players.map((user) => ({
        value: user.email,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
      })),
    [players]
  );

  // Find the selected player
  const selectedPlayer = useMemo(
    () =>
      players.find(
        (user) =>
          user.email.trim().toLowerCase() === (selectedPlayerEmail ?? '').trim().toLowerCase()
      ),
    [players, selectedPlayerEmail]
  );

  // Find the selected player's role data
  const selectedRoleData = useMemo(
    () => roles.find((role) => role.role === selectedPlayer?.role) as RoleTableItem | undefined,
    [roles, selectedPlayer]
  );

  // Build player-perspective sources when a player is selected
  const previewSources = useMemo<ScriptSourceData | undefined>(() => {
    if (!sources || !selectedPlayer) return sources;
    return {
      ...sources,
      capability: 'player',
      currentUserId: selectedPlayer.userId,
      currentEmail: selectedPlayer.email,
    };
  }, [sources, selectedPlayer]);

  // Build player options for the MarkdownRendererInputDataProvider
  const previewPlayerOptions = useMemo(
    () =>
      players.map((user) => ({
        value: user.realName,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
        meta: {
          livingState: user.playerData.livingState,
        },
      })),
    [players]
  );

  // Build role options for the MarkdownRendererInputDataProvider
  const previewRoleOptions = useMemo(
    () =>
      roles
        .filter((role) => role.role.trim().length > 0 && role.isVisible !== false)
        .map((role) => ({
          value: role.role,
          label: role.role,
        })),
    [roles]
  );

  const result = useMemo(() => {
    const inputState = decodeInputState(previewState);
    return interpretScript(ast, {
      globals: {
        ...createScriptGlobals(previewSources),
        Inputs: inputState,
      },
      inputState,
    });
  }, [ast, previewState, previewSources]);

  const instructionCount = result.output.length;
  const hasIssues = result.issues.length > 0;

  // The role message markdown to render for the selected player
  const roleMessageMarkdown = selectedRoleData?.roleMessage ?? '';

  return (
    <Column className="gap-2">
      <Row className="items-center justify-between gap-2">
        <FontText variant="cardHeader">Live Preview</FontText>
        <FontText variant="subtext" className="text-xs">
          {instructionCount} {instructionCount === 1 ? 'input' : 'inputs'}
          {hasIssues ? ` • ${result.issues.length} issues` : ''}
        </FontText>
      </Row>

      {/* Player selector for spoofing */}
      <Row className="items-center gap-2">
        <FontText variant="subtext" className="whitespace-nowrap text-xs">
          Preview as:
        </FontText>
        <AppDropdown
          options={playerDropdownOptions}
          value={selectedPlayerEmail}
          onValueChange={setSelectedPlayerEmail}
          placeholder="Operator (no player)"
          triggerClassName="rounded-lg border border-border/15 bg-none px-3 py-1.5 flex-1"
          contentClassName="border border-border/15"
          isInDialog={isInDialog}
        />
      </Row>

      {selectedPlayer && (
        <FontText variant="subtext" className="text-xs">
          Role: {selectedPlayer.role || 'None'}
          {selectedRoleData?.roleMessage ? ' • Has action message' : ' • No action message'}
        </FontText>
      )}

      <View className="border-subtle-border bg-text/5 rounded-xl border p-3">
        {instructionCount === 0 ? (
          <FontText variant="subtext" className="py-4 text-center">
            No inputs rendered. Add CreateSelectInput, CreateTextInput, etc.
          </FontText>
        ) : (
          <MarkdownRendererInputDataProvider
            playerOptions={previewPlayerOptions}
            roleOptions={previewRoleOptions}
            scriptSources={previewSources}>
            <MarkdownRenderer
              markdown={''}
              isInDialog={isInDialog}
              state={previewState}
              setState={setPreviewState}
            />
          </MarkdownRendererInputDataProvider>
        )}
      </View>

      {/* Role message preview — shows what the selected player's action markdown looks like */}
      {selectedPlayer && roleMessageMarkdown.trim().length > 0 && (
        <Column className="gap-1">
          <FontText variant="subtext" className="text-xs">
            Action message for {selectedPlayer.realName}:
          </FontText>
          <View className="border-subtle-border bg-text/5 rounded-xl border p-3">
            <MarkdownRendererInputDataProvider
              playerOptions={previewPlayerOptions}
              roleOptions={previewRoleOptions}
              scriptSources={previewSources}>
              <MarkdownRenderer
                markdown={roleMessageMarkdown}
                isInDialog={isInDialog}
                state={previewState}
                setState={setPreviewState}
              />
            </MarkdownRendererInputDataProvider>
          </View>
        </Column>
      )}

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
