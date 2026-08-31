import React from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from './markdownEditor/InputOptionsProvider';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookRoleDescriptionsPLAYERProps {
  gameId: string;
}

const RuleBookRoleDescriptionsPLAYER = ({ gameId }: RuleBookRoleDescriptionsPLAYERProps) => {
  const gameRows = useFindListItems('games', {
    itemId: gameId,
    returnTop: 1,
  });

  const operatorUserId = gameRows?.[0]?.userToken;

  const roleTableRecords = useFindListItems<RoleTableItem[]>('roleTable', {
    itemId: gameId,
    userIds: operatorUserId ? [operatorUserId] : [],
  });

  const ruleBookRecords = useFindValues<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
    userIds: operatorUserId ? [operatorUserId] : [],
    returnTop: 1,
  });

  const roles: RoleTableItem[] = roleTableRecords?.[0]?.value ?? [];
  const ruleBookData: RuleBookData | undefined = ruleBookRecords?.[0]?.value;
  const visibleRolesWithContent = roles.filter(
    (role: RoleTableItem) =>
      role.isVisible !== false &&
      role.hiddenFromRulebook !== true &&
      role.aboutRole &&
      role.aboutRole.trim().length > 0
  );

  // Get ordered roles based on stored order, fallback to original order
  const getOrderedRoles = () => {
    const orderedRoleIndexes = ruleBookData?.roleOrder || [];
    const roleMap = new Map(
      visibleRolesWithContent.map((role: RoleTableItem) => [roles.indexOf(role), role])
    );

    const orderedRoles: RoleTableItem[] = [];
    orderedRoleIndexes.forEach((originalIndex: number) => {
      const role = roleMap.get(originalIndex);
      if (role) orderedRoles.push(role);
    });

    visibleRolesWithContent.forEach((role: RoleTableItem) => {
      const originalIndex = roles.indexOf(role);
      if (!orderedRoleIndexes.includes(originalIndex)) {
        orderedRoles.push(role);
      }
    });

    return orderedRoles;
  };

  const orderedRoles = getOrderedRoles();

  if (orderedRoles.length === 0) {
    return null;
  }

  return (
    <Column className="border-border/15 gap-2 border-t pt-4">
      <FontText weight="bold" className="text-xl">
        Role Descriptions
      </FontText>
      <Column className="gap-0">
        {orderedRoles.map((role, index) => (
          <Row
            key={roles.indexOf(role)}
            className={`items-start gap-4 py-4 ${index < orderedRoles.length - 1 ? 'border-border/15 border-b' : ''}`}>
            <Column className="flex-1 gap-4">
              <InputOptionsProvider gameId={gameId} showInputs={false}>
                <MarkdownRenderer
                  markdown={role.aboutRole}
                  textAlign="center"
                  viewHeightImages={30}
                />
              </InputOptionsProvider>
            </Column>
          </Row>
        ))}
      </Column>
    </Column>
  );
};

export default RuleBookRoleDescriptionsPLAYER;
