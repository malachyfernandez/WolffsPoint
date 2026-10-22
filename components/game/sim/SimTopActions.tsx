import React, { useState } from 'react';
import { Play, Square } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Row from '../../layout/Row';
import { StripButton } from './SimStrip';
import { useValue } from 'hooks/useData';
import { useSimSetup } from 'hooks/useSimSetup';
import {
  defaultSimSession,
  simSessionKey,
  type SimSession,
} from 'utils/simUtils';

interface SimTopActionsProps {
  gameId: string;
  isOperator: boolean;
}

/**
 * Out-of-sim session actions, rendered inline in TopSiteBar next to the
 * join-code chip: START SIM when no sim exists, ENTER SIM + END SIM while a
 * sim is paused on the live operator view. Once a sim view is active the
 * SimSwitcher sidebar owns all session chrome and this renders nothing.
 * Strip-styled pills (StripButton) so they match the in-sim strip.
 */
const SimTopActions = ({ gameId, isOperator }: SimTopActionsProps) => {
  const [sessionRecord, setSession] = useValue<SimSession>(simSessionKey(gameId), {
    defaultValue: defaultSimSession,
    privacy: 'PUBLIC',
  });
  const session = sessionRecord?.value ?? defaultSimSession;
  const { snapshotConfig } = useSimSetup(gameId);
  const [starting, setStarting] = useState(false);

  const simExists = session.enabled;
  const simActive = session.enabled && session.view !== 'operator';

  const updateSession = (next: Partial<SimSession>) =>
    setSession({ ...session, ...next });

  const handleStart = () => {
    setStarting(true);
    void (async () => {
      try {
        await snapshotConfig();
        updateSession({ enabled: true, view: 'console' });
      } finally {
        setStarting(false);
      }
    })();
  };

  if (!isOperator || simActive) return null;

  return (
    /* Wraps so ENTER lands above END when the top bar runs out of room. */
    <Row className="gap-2" style={{ flexWrap: 'wrap' }}>
      {!simExists ? (
        <BlurView intensity={20} className="overflow-hidden rounded-md">
          <StripButton
            icon={<Play size={13} color="#fff" />}
            label={starting ? 'Starting…' : 'Start sim'}
            onPress={handleStart}
            className="h-12 w-24"
          />
        </BlurView>
      ) : (
        <>
          <BlurView intensity={20} className="overflow-hidden rounded-md">
            <StripButton
              icon={<Play size={13} color="#fff" />}
              label="Enter sim"
              onPress={() =>
                updateSession({ view: 'console', personaId: undefined, personaName: undefined })
              }
              className="h-12 w-24"
            />
          </BlurView>
          <BlurView intensity={20} className="overflow-hidden rounded-md">
            <StripButton
              icon={<Square size={13} color="#e08080" />}
              label="End sim"
              onPress={() =>
                updateSession({
                  enabled: false,
                  view: 'operator',
                  personaId: undefined,
                  personaName: undefined,
                })
              }
              className="h-12 w-24"
            />
          </BlurView>
        </>
      )}
    </Row>
  );
};

export default SimTopActions;
