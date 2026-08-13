import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import AppButton from '../ui/buttons/AppButton';
import { useList, useValue } from '../../../hooks/useData';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RuleBookData } from '../../../types/ruleBook';
import { RoleTableItem } from '../../../types/roleTable';
import MarkdownEditorDialog from './MarkdownEditorDialog';

interface RuleBookRoleDescriptionsProps {
  gameId: string;
}

const RuleBookRoleDescriptions = ({ gameId }: RuleBookRoleDescriptionsProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);

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
        <FontText weight="bold" className="text-xl">
          Role Descriptions
        </FontText>
        {/* <ScrollView> */}
        <Column className="gap-4">
          {orderedRoles.map((role, index) => (
            <Row key={roles.indexOf(role)} className="items-stretch gap-4">
              <Column className="flex-1 gap-4">
                {/* <FontText weight='bold' className='text-lg'>
                                        {role.role}
                                    </FontText> */}
                <Pressable
                  onPress={() => setEditingRoleIndex(roles.indexOf(role))}
                  className="bg-text/10 hover:bg-text/5 min-h-[160px] w-full justify-center rounded-xl p-4">
                  <MarkdownRenderer
                    markdown={role.aboutRole}
                    textAlign="center"
                    viewHeightImages={30}
                  />
                </Pressable>
              </Column>
              <Column className="justify-center gap-0">
                <AppButton
                  variant="none"
                  className="h-12 w-12"
                  onPress={() => moveRoleUp(index)}
                  disabled={index === 0}>
                  <ChevronUp size={20} color="white" />
                </AppButton>
                <AppButton
                  variant="none"
                  className="h-12 w-12"
                  onPress={() => moveRoleDown(index)}
                  disabled={index === orderedRoles.length - 1}>
                  <ChevronDown size={20} color="white" />
                </AppButton>
              </Column>
            </Row>
          ))}
        </Column>
        {/* </ScrollView> */}
      </Column>

      <MarkdownEditorDialog
        isOpen={editingRoleIndex !== null}
        onOpenChange={(open) => !open && setEditingRoleIndex(null)}
        title={`About ${editingRoleIndex !== null ? roles[editingRoleIndex]?.role || 'Role' : 'Role'}`}
        submitLabel="Save About"
        initialMarkdown={editingRoleIndex !== null ? roles[editingRoleIndex]?.aboutRole || '' : ''}
        showScript
        onSubmit={({ markdown }) => {
          if (editingRoleIndex !== null) {
            UNDOABLEsetAboutRole(editingRoleIndex, markdown);
          }
        }}
      />
    </>
  );
};

export default RuleBookRoleDescriptions;
