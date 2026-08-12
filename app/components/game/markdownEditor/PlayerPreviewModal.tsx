import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import AppDropdown from '../../ui/forms/AppDropdown';
import ShadowScrollView from '../../ui/ShadowScrollView';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../../ui/markdown/MarkdownRenderer';
import { useList } from '../../../../hooks/useData';
import { UserTableItem, UserTableTitle } from '../../../../types/playerTable';
import { RoleTableItem } from '../../../../types/roleTable';
import type { ScriptSourceData } from '../../../script/runtime/sources';

interface PlayerPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  roleName?: string;
  markdown: string;
}

/**
 * Modal that lets an operator preview a role message as a specific player.
 * Uses client-side state only — nothing is saved to Convex.
 */
const PlayerPreviewModal = ({
  isOpen,
  onOpenChange,
  gameId,
  roleName,
  markdown,
}: PlayerPreviewModalProps) => {
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState<string | undefined>(undefined);
  // Emulated action state — client-side only, never saved
  const [emulatedActionState, setEmulatedActionState] = useState<
    Record<string, string | undefined>
  >({});

  const [userTable] = useList<UserTableItem[]>('userTable', gameId, { privacy: 'PUBLIC' });
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, { privacy: 'PUBLIC' });
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId, { privacy: 'PUBLIC' });
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId, { privacy: 'PUBLIC' });

  const players = userTable?.value ?? [];
  const roles = roleTable?.value ?? [];

  // Filter players to only those with the matching role (or all players if no role specified)
  const rolePlayers = useMemo(
    () =>
      roleName
        ? players.filter((user) => user.role.trim().toLowerCase() === roleName.trim().toLowerCase())
        : players,
    [players, roleName]
  );

  const playerDropdownOptions = useMemo(
    () =>
      rolePlayers.map((user) => ({
        value: user.email,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
      })),
    [rolePlayers]
  );

  const selectedPlayer = useMemo(
    () =>
      rolePlayers.find(
        (user) =>
          user.email.trim().toLowerCase() === (selectedPlayerEmail ?? '').trim().toLowerCase()
      ),
    [rolePlayers, selectedPlayerEmail]
  );

  // Build player options for the MarkdownRendererInputDataProvider (all players, not just role)
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

  // Build role options (visible roles only, like the player view)
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

  // Build player-perspective script sources
  // currentDay is 0 (no day context in preview), voting/actions are never locked
  const previewSources = useMemo<ScriptSourceData | undefined>(() => {
    if (!selectedPlayer) return undefined;
    return {
      capability: 'player',
      players,
      roles,
      currentUserId: selectedPlayer.userId,
      currentEmail: selectedPlayer.email,
      currentDay: 0,
      dayDates: dayDatesArray?.value ?? [],
      schedule: {},
      userTableTitle: userTableTitle?.value,
    };
  }, [selectedPlayer, players, roles, dayDatesArray?.value, userTableTitle?.value]);

  const hasMarkdown = markdown.trim().length > 0;
  const hasRolePlayers = rolePlayers.length > 0;

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[80vh]">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />
          <DialogHeader
            text="Preview As Player"
            subtext={roleName ? `Role: ${roleName}` : 'Select any player to preview as'}
          />

          <Column className="gap-3 pt-3">
            {/* Player selector — filtered by role if roleName is provided */}
            {!hasRolePlayers ? (
              <View className="border-subtle-border bg-text/5 rounded-lg border p-4">
                <FontText variant="subtext" className="text-center">
                  {roleName
                    ? `No players are assigned to the role "${roleName}".`
                    : 'No players found.'}
                </FontText>
                <FontText variant="subtext" className="mt-1 text-center">
                  Assign a player to this role to preview their view.
                </FontText>
              </View>
            ) : (
              <>
                <Row className="items-center gap-2">
                  <FontText variant="subtext" className="whitespace-nowrap text-xs">
                    View as:
                  </FontText>
                  <AppDropdown
                    options={playerDropdownOptions}
                    value={selectedPlayerEmail}
                    onValueChange={setSelectedPlayerEmail}
                    placeholder="Select a player"
                    triggerClassName="rounded-lg border border-border/15 bg-none px-3 py-2 flex-1"
                    contentClassName="border border-border/15"
                    isInDialog
                  />
                </Row>

                {selectedPlayer && (
                  <FontText variant="subtext" className="text-xs">
                    {selectedPlayer.realName} • {selectedPlayer.role}
                    {selectedPlayer.playerData.livingState === 'dead' ? ' • Dead' : ' • Alive'}
                  </FontText>
                )}

                {/* Preview area */}
                {selectedPlayer && previewSources && hasMarkdown ? (
                  <ShadowScrollView
                    className="flex-1"
                    scrollViewClassName="flex-1 border border-subtle-border rounded-xl p-4">
                    <MarkdownRendererInputDataProvider
                      playerOptions={previewPlayerOptions}
                      roleOptions={previewRoleOptions}
                      scriptSources={previewSources}>
                      <MarkdownRenderer
                        markdown={markdown}
                        isInDialog
                        state={emulatedActionState}
                        setState={setEmulatedActionState}
                      />
                    </MarkdownRendererInputDataProvider>
                  </ShadowScrollView>
                ) : selectedPlayer && !hasMarkdown ? (
                  <View className="border-subtle-border bg-text/5 rounded-lg border p-4">
                    <FontText variant="subtext" className="text-center">
                      This role has no action message to preview.
                    </FontText>
                  </View>
                ) : null}
              </>
            )}

            <Row className="justify-end gap-4 pt-2">
              <AppButton variant="outline" className="w-28" onPress={() => onOpenChange(false)}>
                <FontText weight="medium">Close</FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default PlayerPreviewModal;
