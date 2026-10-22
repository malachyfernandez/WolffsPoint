import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, Trash2, Users, UserPlus } from 'lucide-react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import FontTextInput from '../../ui/forms/FontTextInput';
import AppDropdown from '../../ui/forms/AppDropdown';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import ShadowScrollView from '../../ui/ShadowScrollView';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import UnsavedChangesDialog from '../../ui/dialog/UnsavedChangesDialog';
import ConfirmDialog from '../../ui/dialog/ConfirmDialog';
import { useSimSetup } from 'hooks/useSimSetup';
import { useList } from 'hooks/useData';
import { buildFauxPlayer } from 'utils/simUtils';
import type { UserTableItem } from 'types/playerTable';
import type { RoleTableItem } from 'types/roleTable';

interface ManageFauxPlayersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
}

interface DraftRow {
  key: string;
  email?: string;
  realName: string;
  role: string;
  livingState: 'alive' | 'dead';
}

/**
 * Edits the sim roster - the sim userTable rows that drive the persona menu,
 * the console table, and the player-facing views. Changes apply on save.
 */
const ManageFauxPlayersDialog = ({
  isOpen,
  onOpenChange,
  gameId,
}: ManageFauxPlayersDialogProps) => {
  const { simRoster, simUserTableTitle, updateSimPlayers, liveUserTable } = useSimSetup(gameId);

  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [initialJson, setInitialJson] = useState('[]');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const rowsScrollRef = useRef<any>(null);

  // The row strip hides its scrollbar, so mouse wheels can't reach it
  // natively - redirect vertical wheel deltas to scrollLeft. At the edges the
  // event passes through so the dialog/page still scrolls vertically.
  useEffect(() => {
    const node = rowsScrollRef.current as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      const next = Math.min(max, Math.max(0, node.scrollLeft + e.deltaY));
      if (next === node.scrollLeft) return;
      e.preventDefault();
      node.scrollLeft = next;
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  // Live role list - this dialog mounts outside SimProvider so 'roleTable' is
  // the real game's roles; they're the dropdown options for every draft row.
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, { privacy: 'PUBLIC' });
  const liveRoles = useMemo(
    () =>
      (roleTable.scheduledUpdate?.value ?? roleTable.value ?? [])
        .filter((item) => item.role.trim().length > 0 && item.isVisible !== false)
        .map((item) => item.role),
    [roleTable]
  );
  const roleOptions = useMemo(() => {
    const roles = liveRoles;
    // Keep every current draft role selectable even if it's not a live role.
    const extras = draft
      .map((row) => row.role)
      .filter((role) => role.trim() && !roles.includes(role));
    return [...new Set(['UNSET', ...roles, ...extras])].map((role) => ({
      value: role,
      label: role,
    }));
  }, [liveRoles, draft]);

  const toDraft = (rows: UserTableItem[]): DraftRow[] =>
    rows.map((row, index) => ({
      key: `${row.email}-${index}`,
      email: row.email,
      realName: row.realName,
      role: row.role ?? 'UNSET',
      livingState: row.playerData?.livingState ?? 'alive',
    }));

  useEffect(() => {
    if (!isOpen) return;
    const rows = toDraft(simRoster ?? []);
    setDraft(rows);
    setInitialJson(JSON.stringify(rows));
    setIsLeaveConfirmOpen(false);
  }, [isOpen, simRoster]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== initialJson,
    [draft, initialJson]
  );

  const updateRow = (key: string, patch: Partial<DraftRow>) =>
    setDraft((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removeRow = (key: string) => setDraft((rows) => rows.filter((row) => row.key !== key));

  const handleAdd = () => {
    const dayCount = simRoster?.[0]?.days?.length ?? 0;
    const faux = buildFauxPlayer(`Faux ${draft.length + 1}`, 'UNSET', simUserTableTitle, dayCount);
    setDraft((rows) => [
      ...rows,
      {
        key: `${faux.email}-${Date.now()}`,
        realName: faux.realName,
        role: faux.role,
        livingState: 'alive',
      },
    ]);
  };

  // One draft row per live role - names seed from the role so the roster is
  // readable at a glance; still renameable like any other row.
  const handleAddOneOfEach = () => {
    setDraft((rows) => [
      ...rows,
      ...liveRoles.map((role) => ({
        key: `role-${role}-${Date.now()}`,
        realName: role,
        role,
        livingState: 'alive' as const,
      })),
    ]);
  };

  // Adds the live game's cast to the draft. Purely additive - rows already in
  // the roster are skipped, and like every other edit it applies on Save
  // (updateSimPlayers seeds personas for the new emails).
  const handleAddRealCast = () => {
    setDraft((rows) => {
      const existing = new Set(rows.map((row) => row.email || row.realName));
      const additions = (liveUserTable ?? []).filter(
        (row) => !existing.has(row.email || row.realName)
      );
      return [...rows, ...toDraft(additions)];
    });
  };

  const handleSave = () => {
    const next: UserTableItem[] = draft.map((row) => {
      const existing = (simRoster ?? []).find(
        (r) => r.email === row.email || r.realName === row.realName
      );
      const base =
        existing ??
        buildFauxPlayer(
          row.realName,
          row.role,
          simUserTableTitle,
          simRoster?.[0]?.days?.length ?? 0
        );
      return {
        ...base,
        realName: row.realName.trim(),
        role: row.role.trim() || 'UNSET',
        playerData: {
          ...base.playerData,
          livingState: row.livingState,
        },
      };
    });
    updateSimPlayers(next);
    setInitialJson(JSON.stringify(draft));
    onOpenChange(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) setIsLeaveConfirmOpen(true);
    else onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) setIsLeaveConfirmOpen(true);
    else onOpenChange(open);
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[85vh] max-w-2xl p-1" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            <DialogHeader
              text="Manage players"
              textClassName="text-sm"
              subtext="Sim-only roster + personas - the live game is untouched."
            />
            <ShadowScrollView className="flex-1" scrollViewClassName="flex-1">
              {/* The row strip scrolls horizontally with edge fades so the
               *  controls never clip in a narrow dialog. flexGrow keeps the
               *  strip at least viewport-wide (the row spacer still pins the
               *  delete button right); shrink:0 keeps wide rows scrollable
               *  instead of crushed. */}
              <ShadowScrollView
                direction="horizontal"
                horizontal
                className="w-full"
                scrollViewClassName="[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                contentContainerStyle={{ flexGrow: 1 }}
                showsHorizontalScrollIndicator={false}
                ref={rowsScrollRef}>
                <Column className="gap-2 px-4 pt-2" style={{ flexGrow: 1, flexShrink: 0 }}>
                  {draft.map((row) => (
                    <Row key={row.key} className="items-center gap-2">
                      {/* h-11 + subtle-border/background matches the AppDropdown
                       *  trigger so every control in the row shares one shape. */}
                      <FontTextInput
                        value={row.realName}
                        onChangeText={(text: string) => updateRow(row.key, { realName: text })}
                        placeholder="Name"
                        className="border-subtle-border bg-background h-11 w-40 rounded border px-3 text-[13px] text-black"
                      />
                      <View className="w-36">
                        <AppDropdown
                          options={roleOptions}
                          value={row.role}
                          onValueChange={(role) => updateRow(row.key, { role })}
                          placeholder="Role"
                          isInDialog
                          allowUnselect={false}
                          triggerClassName="h-11 w-full"
                        />
                      </View>
                      <Pressable
                        onPress={() =>
                          updateRow(row.key, {
                            livingState: row.livingState === 'alive' ? 'dead' : 'alive',
                          })
                        }
                        className={`h-11 w-20 items-center justify-center rounded border ${
                          row.livingState === 'alive'
                            ? 'border-green-700/50 bg-green-600/15'
                            : 'border-red-700/50 bg-red-600/15'
                        }`}>
                        <FontText className="text-[13px] text-black/80">{row.livingState}</FontText>
                      </Pressable>
                      <View className="flex-1" />
                      <Pressable
                        onPress={() => setPendingDeleteKey(row.key)}
                        className="border-subtle-border bg-background h-11 w-11 items-center justify-center rounded border hover:bg-black/10">
                        <Trash2 size={14} color="rgba(0,0,0,0.5)" />
                      </Pressable>
                    </Row>
                  ))}
                  {draft.length === 0 && (
                    <FontText className="py-3 text-center text-[12px] text-black/40">
                      No simulated players - add one, or pull in a group below.
                    </FontText>
                  )}
                </Column>
              </ShadowScrollView>
              <Column className="gap-2 px-4 pb-4 pt-2">
                {/* Single add on its own row, group adds together, destructive
                 *  action pushed apart on the right. */}
                <Row className="gap-2 pt-2" style={{ flexWrap: 'wrap' }}>
                  {/* Same gold GuildedButton as the live table's Add Player. */}
                  <AppButton variant="accent" onPress={handleAdd}>
                    <Row className="items-center gap-2">
                      <Plus size={20} color="white" />
                      <FontText weight="medium" color="white">
                        Add Player
                      </FontText>
                    </Row>
                  </AppButton>
                </Row>
                <Row className="gap-2" style={{ flexWrap: 'wrap' }}>
                  <AppButton variant="outline" onPress={handleAddOneOfEach} className="h-11 px-3">
                    <Row className="items-center gap-1.5">
                      <Users size={13} />
                      <FontText className="text-[12px]">One of each role</FontText>
                    </Row>
                  </AppButton>
                  <AppButton variant="outline" onPress={handleAddRealCast} className="h-11 px-3">
                    <Row className="items-center gap-1.5">
                      <UserPlus size={13} />
                      <FontText className="text-[12px]">Add real cast</FontText>
                    </Row>
                  </AppButton>
                  <View className="flex-1" />
                  <AppButton
                    variant="red"
                    onPress={() => setIsClearConfirmOpen(true)}
                    className="h-11 px-3">
                    <Row className="items-center gap-1.5">
                      <Trash2 size={13} color="#b91c1c" />
                      <FontText className="text-[12px] text-red-700">Delete all</FontText>
                    </Row>
                  </AppButton>
                </Row>
              </Column>
            </ShadowScrollView>
            <Row className="justify-end gap-4 px-4 pb-4 pt-2" style={{ flexWrap: 'wrap' }}>
              <AppButton variant="outline" className="h-11 w-28" onPress={handleAttemptClose}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
              <AppButton variant="filled" className="h-11 w-28" onPress={handleSave}>
                <FontText weight="medium" color="white">
                  Save
                </FontText>
              </AppButton>
            </Row>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        onSave={handleSave}
        onDiscard={handleConfirmLeave}
      />
      <ConfirmDialog
        isOpen={pendingDeleteKey !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteKey(null);
        }}
        onConfirm={() => {
          if (pendingDeleteKey) removeRow(pendingDeleteKey);
        }}
        title="Remove player"
        message={`Remove ${draft.find((row) => row.key === pendingDeleteKey)?.realName || 'this player'} from the sim roster?`}
        confirmLabel="Remove"
        danger
      />
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        onConfirm={() => setDraft([])}
        title="Delete all players"
        message="Remove every simulated player from the roster? You can re-add them after."
        confirmLabel="Delete all"
        danger
      />
    </>
  );
};

export default ManageFauxPlayersDialog;
