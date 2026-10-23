import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import FontText from '../../ui/text/FontText';
import AppButton from '../../ui/buttons/AppButton';
import AppDropdown from '../../ui/forms/AppDropdown';
import ShadowScrollView from '../../ui/ShadowScrollView';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../../ui/markdown/MarkdownRenderer';
import type { ScriptSourceData } from '../../../script/runtime/sources';

interface FilePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The flattened mega-script markdown (already resolved). */
  markdown: string;
  /** Flatten issues (missing files, cycles), surfaced in the preview. */
  issues?: { message: string }[];
  sources?: ScriptSourceData;
  title?: string;
}

/**
 * Preview for a file or file-mode cell, renders the flattened mega-script
 * through the real markdown pipeline with a player-spoof dropdown.
 */
const FilePreviewDialog = ({
  isOpen,
  onOpenChange,
  markdown,
  issues = [],
  sources,
  title = 'Preview',
}: FilePreviewDialogProps) => {
  const [previewState, setPreviewState] = useState<Record<string, string | undefined>>({});
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState<string | undefined>(undefined);

  const players = useMemo(() => sources?.players ?? [], [sources]);
  const roles = useMemo(() => sources?.roles ?? [], [sources]);

  const playerDropdownOptions = useMemo(
    () =>
      players.map((user) => ({
        value: user.email,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
      })),
    [players]
  );

  const selectedPlayer = useMemo(
    () =>
      players.find(
        (user) =>
          user.email.trim().toLowerCase() === (selectedPlayerEmail ?? '').trim().toLowerCase()
      ),
    [players, selectedPlayerEmail]
  );

  const previewSources = useMemo<ScriptSourceData | undefined>(() => {
    if (!sources || !selectedPlayer) return sources;
    return {
      ...sources,
      capability: 'player',
      currentUserId: selectedPlayer.userId,
      currentEmail: selectedPlayer.email,
    };
  }, [sources, selectedPlayer]);

  const previewPlayerOptions = useMemo(
    () =>
      players.map((user) => ({
        value: user.realName,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
        meta: { livingState: user.playerData.livingState },
      })),
    [players]
  );

  const previewRoleOptions = useMemo(
    () =>
      roles
        .filter((role) => role.role.trim().length > 0 && role.isVisible !== false)
        .map((role) => ({ value: role.role, label: role.role })),
    [roles]
  );

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[80vh] max-w-3xl">
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader text={title} subtext="Runs the flattened script as a player would see it" />
          <Column className="min-h-0 flex-1 gap-3">
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
                isInDialog
              />
            </Row>
            {issues.length > 0 && (
              <Column className="gap-1 rounded-lg border border-red-400/30 bg-red-400/5 p-2">
                {issues.slice(0, 5).map((issue, i) => (
                  <FontText key={i} className="text-xs" style={{ color: '#a03030' }}>
                    • {issue.message}
                  </FontText>
                ))}
              </Column>
            )}
            <View className="border-subtle-border bg-text/5 min-h-0 flex-1 rounded-xl border">
              <ShadowScrollView
                className="min-h-0 flex-1"
                scrollViewClassName="min-h-0 flex-1 px-4 py-4">
                <MarkdownRendererInputDataProvider
                  playerOptions={previewPlayerOptions}
                  roleOptions={previewRoleOptions}
                  scriptSources={previewSources}>
                  <MarkdownRenderer
                    markdown={markdown}
                    isInDialog
                    state={previewState}
                    setState={setPreviewState}
                  />
                </MarkdownRendererInputDataProvider>
              </ShadowScrollView>
            </View>
            <Row className="justify-end">
              <AppButton variant="outline" className="w-24" onPress={() => onOpenChange(false)}>
                <FontText weight="medium">Close</FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default FilePreviewDialog;
