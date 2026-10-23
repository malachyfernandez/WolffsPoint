import React, { useState } from 'react';
import { useValue } from 'hooks/useData';
import { useCellModuleStatus } from 'utils/legacySystems';
import { useMigrateEverything } from 'hooks/useMigrateEverything';
import { useSim } from 'contexts/SimContext';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontText from '../../ui/text/FontText';
import AppButton from '../../ui/buttons/AppButton';
import ConfirmDialog from '../../ui/dialog/ConfirmDialog';

interface LegacySystemsConfigItemProps {
  gameId: string;
}

const LegacySystemsConfigItem = ({ gameId }: LegacySystemsConfigItemProps) => {
  const { migrated, loading } = useCellModuleStatus(gameId);
  if (migrated || loading) return null;
  return <WholeGameMigration gameId={gameId} />;
};

const WholeGameMigration = ({ gameId }: LegacySystemsConfigItemProps) => {
  const { migrate, state, ready, error } = useMigrateEverything(gameId);
  const [, setActiveGameId] = useValue<string>('activeGameId');
  const inSim = useSim().mode !== 'off';
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleMigrate = () => {
    void (async () => {
      const newGameId = await migrate();
      if (newGameId) {
        setConfirmOpen(false);
        setActiveGameId(newGameId);
      }
    })();
  };

  return (
    <>
      <ConfigSectionRow
        title="Upgrade to files"
        subtext={
          inSim
            ? 'Available in the live game - a copy made here would be invisible.'
            : state === 'error'
              ? `Migration stopped: ${error ?? 'Unable to finish the upgrade'}. The original is unchanged.`
              : 'Upgrade all tags and file-capable cells together in a safety copy. The original stays unchanged.'
        }>
        <AppButton
          variant="outline"
          className="w-48"
          onPress={() => setConfirmOpen(true)}
          disabled={state === 'working' || inSim || !ready}>
          <FontText weight="medium">
            {state === 'working' ? 'Migrating...' : 'Upgrade whole game'}
          </FontText>
        </AppButton>
      </ConfigSectionRow>
      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          if (state !== 'working') setConfirmOpen(open);
        }}
        title="Upgrade the whole game?"
        message="Move this game onto the file system - content becomes reusable files you can edit and organize in the new Files tab. A copy is made and opened; the original stays as a backup."
        confirmLabel={state === 'working' ? 'Migrating...' : 'Upgrade'}
        onConfirm={handleMigrate}>
        <FontText weight="medium" className="pb-1">
          Moves into files:
        </FontText>
        {[
          'Tags and their trigger scripts',
          'Role, vote, and morning messages',
          'About Role and the rulebook',
          'File-capable table cells',
        ].map((line) => (
          <FontText key={line}>{`•  ${line}`}</FontText>
        ))}
      </ConfirmDialog>
    </>
  );
};

export default LegacySystemsConfigItem;
