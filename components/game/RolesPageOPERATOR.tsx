import React, { useState, useEffect } from 'react';
import ShadowScrollView from '../ui/ShadowScrollView';
import Column from '../layout/Column';
import Row from '../layout/Row';
import RoleTable from './RoleTable';
import RoleAddDialog from './RoleAddDialog';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { useList } from 'hooks/useData';
import { useUndoRedo, useCreateUndoSnapshot } from 'hooks/useUndoRedo';
import { RoleTableItem } from 'types/roleTable';
import { Plus } from 'lucide-react-native';
import { MultiSelectProvider } from './multiSelect/MultiSelectContext';
import MultiSelectToolbar from './multiSelect/MultiSelectToolbar';
import TableFreezeControls, { CONTROLS_STACKED_BREAKPOINT } from './TableFreezeControls';
import TableRowPreview from './TableRowPreview';
import { useRolesFreeze } from 'hooks/useTableFreeze';

interface RolesPageOPERATORProps {
  currentUserId: string;
  gameId: string;
}

const RolesPageOPERATOR = ({ currentUserId, gameId }: RolesPageOPERATORProps) => {
  return (
    <MultiSelectProvider>
      <RolesPageContent currentUserId={currentUserId} gameId={gameId} />
    </MultiSelectProvider>
  );
};

const RolesPageContent = ({ currentUserId, gameId }: RolesPageOPERATORProps) => {
  const { executeCommand } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();

  const [roleTable, setRoleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
  });

  const freezeController = useRolesFreeze(gameId);
  const roles = roleTable.scheduledUpdate?.value ?? roleTable.value ?? [];
  const visibleRoles = roles.filter((role) => role.isVisible !== false);
  const isSyncing = roleTable?.state?.isSyncing ?? false;
  const lastOpStatus = roleTable?.state?.lastOpStatus ?? 'idle';

  const [doSync, setDoSync] = useState(false);
  const [isRoleTableBeingEdited, setIsRoleTableBeingEdited] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [controlsRowWidth, setControlsRowWidth] = useState(0);

  // Below CONTROLS_STACKED_BREAKPOINT the button and controls can't share a
  // line comfortably, so both stack full-width. Change the value in
  // TableFreezeControls.tsx.
  const isControlsStacked = controlsRowWidth > 0 && controlsRowWidth < CONTROLS_STACKED_BREAKPOINT;

  useEffect(() => {
    if (!isSyncing && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isSyncing, hasInitiallyLoaded]);

  const addRole = (newRole: RoleTableItem) => {
    const previousRoleTable = createUndoSnapshot(roles);
    executeCommand({
      action: () => {
        setRoleTable([...roles, newRole]);
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
    <LoadingContainer
      dependencies={[roleTable, hasInitiallyLoaded]}
      loadingText="Loading roles"
      className="min-h-190">
      <Column className="gap-4 py-3 sm:px-4">
        {visibleRoles.length > 0 ? (
          <Column className="gap-4">
            <MultiSelectToolbar />
            <TableRowPreview gameId={gameId}>
              <ShadowScrollView
                direction="horizontal"
                className="mr-1"
                scrollViewClassName="px-1 py-5"
                horizontal>
                <Row className="gap-0 pr-4">
                  <Column className="gap-1">
                    <Row className="h-6 gap-0">{/* spacer to align with table */}</Row>
                    <Row className={`gap-0 ${isRoleTableBeingEdited ? 'z-50' : ''}`.trim()}>
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
            </TableRowPreview>
            <Row
              className="-mt-2 w-full flex-wrap items-start justify-between gap-4 px-4 sm:-mt-6"
              onLayout={(event: any) => setControlsRowWidth(event.nativeEvent.layout.width)}>
              <AppButton
                variant="accent"
                className={isControlsStacked ? 'w-full' : 'w-36'}
                onPress={() => setIsAddDialogOpen(true)}>
                <Row className="items-center gap-2">
                  <Plus size={20} color="white" />
                  <FontText weight="medium" color="white">
                    Add Role
                  </FontText>
                </Row>
              </AppButton>
              {/* Stacked = full-width line of its own below the button. */}
              <Column className={isControlsStacked ? 'w-full items-end' : 'flex-1 items-end'}>
                <TableFreezeControls controller={freezeController} fullWidth={isControlsStacked} />
              </Column>
            </Row>
          </Column>
        ) : (
          <Row className="w-full flex-wrap items-start justify-between gap-4 px-4">
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
    </LoadingContainer>
  );
};

export default RolesPageOPERATOR;
