import React, { useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { ChevronUp, ChevronDown, Eye } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import FontTextInput from '../ui/forms/FontTextInput';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import AppButton from '../ui/buttons/AppButton';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import { useList, useValue } from '../../../hooks/useData';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import CloseButton from '../ui/dialog/CloseButton';

interface RuleBookRoleDescriptionsProps {
  gameId: string;
  headingIdPrefix?: string;
}

const RuleBookRoleDescriptions = ({ gameId, headingIdPrefix }: RuleBookRoleDescriptionsProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [hidingRoleIndex, setHidingRoleIndex] = useState<number | null>(null);

  const [ruleBookData, setRuleBookData] = useValue<RuleBookData>(
    getGameScopedKey('ruleBook', gameId),
    {
      defaultValue: { content: '', roleOrder: [] },
      privacy: 'PUBLIC',
    }
  );

  const [roleTable, setRoleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
  });

  const roles = roleTable?.value ?? [];
  const roleDescriptionsTitle = ruleBookData?.value?.roleDescriptionsTitle || '';
  const visibleRolesWithContent = roles.filter(
    (role) =>
      role.isVisible !== false &&
      role.hiddenFromRulebook !== true &&
      role.aboutRole &&
      role.aboutRole.trim().length > 0
  );

  // Get ordered roles based on stored order, fallback to original order
  const getOrderedRoles = () => {
    const orderedRoleIndexes = ruleBookData?.value?.roleOrder || [];
    const roleMap = new Map(
      visibleRolesWithContent.map((role, index) => [roles.indexOf(role), role])
    );

    const orderedRoles: RoleTableItem[] = [];
    orderedRoleIndexes.forEach((originalIndex) => {
      const role = roleMap.get(originalIndex);
      if (role) orderedRoles.push(role);
    });

    // Add any roles not in the order list
    visibleRolesWithContent.forEach((role, index) => {
      const originalIndex = roles.indexOf(role);
      if (!orderedRoleIndexes.includes(originalIndex)) {
        orderedRoles.push(role);
      }
    });

    return orderedRoles;
  };

  const orderedRoles = getOrderedRoles();

  const UNDOABLEsetAboutRole = (roleIndex: number, newAboutRole: string) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      aboutRole: newAboutRole,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set About Role',
    });
  };

  const UNDOABLEsetHiddenFromRulebook = (roleIndex: number, value: boolean) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    if (roleIndex < 0 || roleIndex >= previousRoleTable.length) return;

    const nextRoleTable = createUndoSnapshot(previousRoleTable);
    nextRoleTable[roleIndex] = {
      ...nextRoleTable[roleIndex],
      hiddenFromRulebook: value,
    };

    executeCommand({
      action: () => setRoleTable(createUndoSnapshot(nextRoleTable)),
      undoAction: () => setRoleTable(createUndoSnapshot(previousRoleTable)),
      description: 'Set Role Rulebook Visibility',
    });
  };

  // Ensure roleOrder contains all visible roles, initialized in current display order
  const getFullCurrentOrder = (): number[] => {
    const storedOrder = ruleBookData?.value?.roleOrder || [];
    const visibleOriginalIndexes = visibleRolesWithContent.map((role) => roles.indexOf(role));

    // If stored order already covers all visible roles, use it as-is
    const storedVisibleCount = visibleOriginalIndexes.filter((idx) =>
      storedOrder.includes(idx)
    ).length;
    if (storedVisibleCount === visibleRolesWithContent.length) {
      return storedOrder;
    }

    // Otherwise, build a full order: stored entries first (that are still visible),
    // then any visible roles not yet in the stored order, preserving display order
    const fullOrder: number[] = storedOrder.filter((idx) => visibleOriginalIndexes.includes(idx));
    visibleOriginalIndexes.forEach((idx) => {
      if (!fullOrder.includes(idx)) fullOrder.push(idx);
    });
    return fullOrder;
  };

  const moveRoleUp = (currentIndex: number) => {
    if (currentIndex <= 0) return;

    const currentOrder = getFullCurrentOrder();
    const roleToMove = orderedRoles[currentIndex];
    const originalIndex = roles.indexOf(roleToMove);
    const roleAbove = orderedRoles[currentIndex - 1];
    const originalIndexAbove = roles.indexOf(roleAbove);

    const currentIndexInOrder = currentOrder.indexOf(originalIndex);
    const aboveIndexInOrder = currentOrder.indexOf(originalIndexAbove);

    [currentOrder[currentIndexInOrder], currentOrder[aboveIndexInOrder]] = [
      currentOrder[aboveIndexInOrder],
      currentOrder[currentIndexInOrder],
    ];

    setRuleBookData({
      ...(ruleBookData?.value || { content: '', roleOrder: [] }),
      roleOrder: currentOrder,
    });
  };

  const moveRoleDown = (currentIndex: number) => {
    if (currentIndex >= orderedRoles.length - 1) return;

    const currentOrder = getFullCurrentOrder();
    const roleToMove = orderedRoles[currentIndex];
    const originalIndex = roles.indexOf(roleToMove);
    const roleBelow = orderedRoles[currentIndex + 1];
    const originalIndexBelow = roles.indexOf(roleBelow);

    const currentIndexInOrder = currentOrder.indexOf(originalIndex);
    const belowIndexInOrder = currentOrder.indexOf(originalIndexBelow);

    [currentOrder[currentIndexInOrder], currentOrder[belowIndexInOrder]] = [
      currentOrder[belowIndexInOrder],
      currentOrder[currentIndexInOrder],
    ];

    setRuleBookData({
      ...(ruleBookData?.value || { content: '', roleOrder: [] }),
      roleOrder: currentOrder,
    });
  };

  if (orderedRoles.length === 0) {
    return null;
  }

  return (
    <>
      <Column className="gap-2">
        <View nativeID={headingIdPrefix ? `${headingIdPrefix}-roles-top` : undefined}>
          <FontTextInput
            value={roleDescriptionsTitle}
            placeholder="Role Descriptions"
            onChangeText={(text) =>
              setRuleBookData({
                ...(ruleBookData?.value || { content: '', roleOrder: [] }),
                roleDescriptionsTitle: text,
              })
            }
            variant="styled"
            weight="bold"
            className="w-full text-3xl leading-9"
          />
        </View>
        <Column className="gap-4">
          {orderedRoles.map((role, index) => (
            <Row key={roles.indexOf(role)} className="relative items-stretch gap-4">
              <Column className="flex-1 gap-4">
                <View nativeID={headingIdPrefix ? `${headingIdPrefix}-role-${index}` : undefined}>
                  <Pressable
                    onPress={() => setEditingRoleIndex(roles.indexOf(role))}
                    className="bg-text/10 hover:bg-text/5 min-h-[160px] w-full justify-center rounded-xl p-4">
                    <MarkdownRenderer
                      markdown={role.aboutRole}
                      textAlign="center"
                      viewHeightImages={30}
                    />
                  </Pressable>
                </View>
              </Column>
              <Column className="justify-center gap-0">
                <AppButton
                  variant="none"
                  className="h-12 w-12"
                  onPress={() => moveRoleUp(index)}
                  disabled={index === 0}>
                  <ChevronUp size={20} color="rgb(46, 41, 37)" />
                </AppButton>
                <AppButton
                  variant="none"
                  className="h-12 w-12"
                  onPress={() => moveRoleDown(index)}
                  disabled={index === orderedRoles.length - 1}>
                  <ChevronDown size={20} color="rgb(46, 41, 37)" />
                </AppButton>
              </Column>
              <AppButton
                variant="none"
                className="absolute right-0 top-0 h-10 w-10"
                onPress={() => setHidingRoleIndex(roles.indexOf(role))}>
                <Eye size={20} color="rgb(46, 41, 37)" />
              </AppButton>
            </Row>
          ))}
        </Column>
        {/* </ScrollView> */}
      </Column>

      <MarkdownEditorDialog
        isOpen={editingRoleIndex !== null}
        onOpenChange={(open) => !open && setEditingRoleIndex(null)}
        title={`About ${editingRoleIndex !== null ? roles[editingRoleIndex]?.role || 'Role' : 'Role'}`}
        initialMarkdown={editingRoleIndex !== null ? roles[editingRoleIndex]?.aboutRole || '' : ''}
        gameId={gameId}
        showScript
        onSubmit={({ markdown }) => {
          if (editingRoleIndex !== null) {
            UNDOABLEsetAboutRole(editingRoleIndex, markdown);
          }
        }}
        historyKey={`aboutRole:${gameId}:${editingRoleIndex ?? ''}`}
      />

      <ConvexDialog.Root
        isOpen={hidingRoleIndex !== null}
        onOpenChange={(open: boolean) => !open && setHidingRoleIndex(null)}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="w-md">
            <CloseButton onPress={() => setHidingRoleIndex(null)} />
            <Column className="gap-4">
              <DialogHeader text="Hide from rulebook" />
              <Column className="gap-4 pt-5 px-5 pb-5">
                <FontText className="text-center">
                  Hide{' '}
                  {hidingRoleIndex !== null
                    ? roles[hidingRoleIndex]?.role || 'this role'
                    : 'this role'}{' '}
                  from the rulebook?
                </FontText>
                <FontText variant="subtext" className="text-center">
                  You can show it again from the Roles tab.
                </FontText>
                <View className="flex-row gap-3 mt-4">
                  <AppButton
                    variant="outline"
                    className="flex-1 h-12"
                    onPress={() => setHidingRoleIndex(null)}>
                    <FontText weight="medium">Cancel</FontText>
                  </AppButton>
                  <AppButton
                    variant="filled"
                    className="flex-1 h-12"
                    onPress={() => {
                      if (hidingRoleIndex !== null) {
                        UNDOABLEsetHiddenFromRulebook(hidingRoleIndex, true);
                      }
                      setHidingRoleIndex(null);
                    }}>
                    <FontText weight="medium" color="white">
                      Hide
                    </FontText>
                  </AppButton>
                </View>
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

export default RuleBookRoleDescriptions;
