import React, { useState, useEffect } from 'react';
import ShadowScrollView from '../ui/ShadowScrollView';
import Column from '../layout/Column';
import Row from '../layout/Row';
import RoleTable from './RoleTable';
import RoleAddDialog from './RoleAddDialog';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import { useList } from '../../../hooks/useData';
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';
import { RoleTableItem } from '../../../types/roleTable';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';

interface RolesPageOPERATORProps {
  currentUserId: string;
  gameId: string;
}

const RolesPageOPERATOR = ({ currentUserId, gameId }: RolesPageOPERATORProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();

  const [roleTable, setRoleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
  });

  const roles = roleTable?.value ?? [];
  const visibleRoles = roles.filter((role) => role.isVisible !== false);
  const isSyncing = roleTable?.state?.isSyncing ?? false;
  const lastOpStatus = roleTable?.state?.lastOpStatus ?? 'idle';

  const [doSync, setDoSync] = useState(false);
  const [isRoleTableBeingEdited, setIsRoleTableBeingEdited] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSyncing && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isSyncing, hasInitiallyLoaded]);

  if (isSyncing || !hasInitiallyLoaded) {
    return (
      <Column className="min-h-190 items-center justify-center gap-4">
        <LoadingText text="Loading roles" />
      </Column>
    );
  }

  const addRole = (newRole: RoleTableItem) => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    executeCommand({
      action: () => {
        setRoleTable([...(roleTable?.value ?? []), newRole]);
        setDoSync(true);
      },
      undoAction: () => {
        setRoleTable(previousRoleTable);
        setDoSync(true);
      },
      description: 'Add Role',
    });
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} className="min-h-190">
      <Column className="gap-4 py-3 sm:px-4">
        {visibleRoles.length > 0 ? (
          <Column className="gap-4">
            <ShadowScrollView
              direction="horizontal"
              className="mr-1"
              scrollViewClassName="px-1 py-5"
              horizontal>
              <Row className="gap-4">
                <Column className="gap-1">
                  <Row className="h-6 gap-4">{/* spacer to align with table */}</Row>
                  <Row className={`gap-4 ${isRoleTableBeingEdited ? 'z-50' : ''}`.trim()}>
                    <RoleTable
                      gameId={gameId}
                      doSync={doSync}
                      setDoSync={setDoSync}
                      isBeingEdited={isRoleTableBeingEdited}
                      setIsBeingEdited={setIsRoleTableBeingEdited}
                      showInputs={true}
                    />
                  </Row>
                </Column>
              </Row>
            </ShadowScrollView>
            <Row className="-mt-2 gap-4 sm:-mt-6 sm:ml-4">
              <AppButton variant="accent" className="w-36" onPress={() => setIsAddDialogOpen(true)}>
                <Row className="items-center gap-2">
                  <Plus size={20} color="white" />
                  <FontText weight="medium" color="white">
                    Add Role
                  </FontText>
                </Row>
              </AppButton>
            </Row>
          </Column>
        ) : (
          <Row className="w-full items-center justify-center gap-4">
            <AppButton variant="accent" className="w-36" onPress={() => setIsAddDialogOpen(true)}>
              <Row className="items-center gap-2">
                <Plus size={20} color="white" />
                <FontText weight="medium" color="white">
                  Add Role
                </FontText>
              </Row>
            </AppButton>
          </Row>
        )}
      </Column>

      <RoleAddDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddRole={addRole}
      />
    </Animated.View>
  );
};

export default RolesPageOPERATOR;
