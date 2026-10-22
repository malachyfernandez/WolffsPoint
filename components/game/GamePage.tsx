import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import { Platform, View } from 'react-native';
import { useFindListItems, useFindValues, useValue } from 'hooks/useData';
import { useContentWidth } from 'hooks/useContentWidth';
import ShadowScrollView from '../ui/ShadowScrollView';
import OperatorGamePage from './OperatorGamePage';
import NewserGamePage from './NewserGamePage';
import PlayerGamePage from './PlayerGamePage';
import WolffspointIcon from '../icons/WolffspointIcon';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  NewserAssignment,
  PublicUserData,
  getNewserAssignmentKey,
  resolveValidNewserAssignment,
} from 'utils/newspaperControl';
import FadeInAfterDelay from '../ui/loading/FadeInAfterDelay';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { BodyReadinessProvider } from 'contexts/BodyReadinessContext';
import { SimProfiler } from '../../sim/perf/SimProfiler';
import { SimProvider, simGameIdFor, type SimState } from 'contexts/SimContext';
import { setSimNow } from 'utils/simNow';
import SimStrip from './sim/SimStrip';
import SimEditWarningProvider from './sim/SimEditWarningProvider';
import ManageFauxPlayersDialog from './sim/ManageFauxPlayersDialog';
import {
  defaultSimSession,
  personaUserIdFor,
  simSessionKey,
  type SimSession,
} from 'utils/simUtils';

interface GamePageProps {
  gameId: string;
  currentUserId: string;
  onReady?: () => void;
}

const GamePage = ({ gameId, currentUserId, onReady }: GamePageProps) => {
  const [allLoadsDone, setAllLoadsDone] = useState(false);
  const [mountSettled, setMountSettled] = useState(false);
  const readyFiredRef = useRef(false);

  // Reset when gameId changes; give mounted children a tick to register before
  // the provider is allowed to consider "everything" ready.
  useEffect(() => {
    setAllLoadsDone(false);
    setMountSettled(false);
    readyFiredRef.current = false;
    const t = setTimeout(() => setMountSettled(true), 50);
    return () => clearTimeout(t);
  }, [gameId]);

  const handleFadeComplete = useCallback(() => {
    if (!readyFiredRef.current) {
      readyFiredRef.current = true;
      onReady?.();
    }
  }, [onReady]);

  const scrollAmount = useSharedValue(0);
  const screenWidth = useContentWidth();

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollAmount.value = event.contentOffset.y;
    },
  });

  // Calculate blur amount based on scroll (0px blur at top, 8px blur when scrolled 100px).
  // Blur is quantized to whole px: an animated `filter:blur()` forces a full
  // Gaussian re-raster of this ~760px element on *every* scroll frame, which
  // tanks WebKit. Integer steps keep the identical look but let Reanimated's
  // style diffing skip DOM writes whenever the rounded value didn't change.
  const logoBlurStyle = useAnimatedStyle(
    () =>
      ({
        filter:
          Platform.OS === 'web'
            ? `blur(${Math.round(Math.min(Math.max((scrollAmount.value / 100) * 8, 0), 8))}px)`
            : undefined,
      }) as any
  );

  const ownedGameRows = useFindListItems('games', {
    itemId: gameId,
    userIds: [currentUserId],
  });

  const gameRows = useFindListItems('games', {
    itemId: gameId,
    returnTop: 1,
  });

  const operatorUserId = gameRows?.[0]?.userToken ?? '';

  const userDataRecords = useFindValues<PublicUserData>('userData', {
    returnTop: 500,
  });

  const newserAssignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
    userIds: operatorUserId ? [operatorUserId] : undefined,
    returnTop: 1,
  });

  const isRoleDataLoading =
    ownedGameRows === undefined ||
    gameRows === undefined ||
    userDataRecords === undefined ||
    newserAssignmentRecords === undefined;

  const isOperator = (ownedGameRows?.length ?? 0) > 0;

  // Simulation session: read here, outside the provider, so writes land on the
  // real session record (inside the provider they would be sim-scoped).
  const [simSessionRecord, setSimSession] = useValue<SimSession>(simSessionKey(gameId), {
    defaultValue: defaultSimSession,
    privacy: 'PUBLIC',
  });
  const simSession = simSessionRecord?.value ?? defaultSimSession;
  const simActive = simSession.enabled && simSession.view !== 'operator';
  const simGameId = simGameIdFor(gameId);
  const [simManageOpen, setSimManageOpen] = useState(false);

  const simState = useMemo<SimState>(
    () => ({
      mode: simSession.view === 'persona' ? 'persona' : 'console',
      realGameId: gameId,
      simGameId,
      personaId: simSession.personaId,
      personaUserId: simSession.personaId
        ? personaUserIdFor(simSession.personaId)
        : undefined,
      personaName: simSession.personaName,
      operatorUserId,
      simNowMs: simSession.simNowMs,
      openManagePlayers: () => setSimManageOpen(true),
    }),
    [
      simSession.view,
      simSession.personaId,
      simSession.personaName,
      simSession.simNowMs,
      gameId,
      simGameId,
      operatorUserId,
    ]
  );

  const updateSimSession = (patch: Partial<SimSession>) =>
    setSimSession({ ...simSession, ...patch });

  const validNewser = resolveValidNewserAssignment({
    assignment: newserAssignmentRecords?.[0]?.value,
    userDatas: (userDataRecords ?? []).map((record) => record.value),
  });

  const isNewser = !isOperator && validNewser?.userId === currentUserId;

  const logoWidth = Math.min(screenWidth * 0.97, 760);
  const logoHeight = (logoWidth / 522) * 183;
  const translateY = -(logoWidth / 9) + 100;

  return (
    <Column className="h-screen w-full gap-0 overflow-hidden">
        <View className="absolute top-20 w-full items-center">
          <Animated.View
            style={[
              Platform.OS === 'web'
                ? { width: logoWidth, height: logoHeight, transform: `translateY(${translateY}px)` }
                : undefined,
              logoBlurStyle,
            ]}>
            <FadeInAfterDelay delayMs={200}>
              <WolffspointIcon width={logoWidth} height={logoHeight} />
            </FadeInAfterDelay>
          </Animated.View>
        </View>
        {/* Children stay mounted (invisible) so they can fetch + report readiness;
            once every report is in, the whole thing fades in as one unit. The role
            page itself only mounts once we know which role this user is. */}
        <LoadingContainer
          dependencies={[!isRoleDataLoading, allLoadsDone]}
          loadingText="Loading game"
          className="flex-1"
          onReady={handleFadeComplete}>
          <BodyReadinessProvider key={gameId} outerReady={mountSettled && !isRoleDataLoading} onAllReady={() => setAllLoadsDone(true)}>
            <ShadowScrollView
              className="flex-1"
              scrollViewClassName={`p-6 h-screen w-full ${screenWidth >= 640 ? 'px-6' : 'px-2'}`}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              scrollViewComponent={Animated.ScrollView}>
              <View className="mx-auto w-full max-w-250 pt-60">
                <SimProfiler id="game-body">
                {isRoleDataLoading ? (
                  <View className="min-h-100" />
                ) : simActive ? (
                  <SimProvider value={simState}>
                    <SimEditWarningProvider>
                    <Column className="w-full gap-4">
                      <SimStrip
                        simState={simState}
                        onBackToOperator={() => updateSimSession({ view: 'operator' })}
                        onSetSimNow={(ms) => {
                          // Snap the clock immediately; the session write
                          // re-syncs the same target on its Convex echo.
                          setSimNow(ms ?? null);
                          updateSimSession({ simNowMs: ms });
                        }}
                        onEndSimulation={() =>
                          updateSimSession({
                            enabled: false,
                            view: 'operator',
                            personaId: undefined,
                            personaName: undefined,
                          })
                        }
                      />
                      {simSession.view === 'console' ? (
                        <OperatorGamePage currentUserId={currentUserId} gameId={simGameId} />
                      ) : (
                        <PlayerGamePage
                          key={simSession.personaId}
                          currentUserId={simState.personaUserId ?? currentUserId}
                          gameId={simGameId}
                        />
                      )}
                    </Column>
                    </SimEditWarningProvider>
                  </SimProvider>
                ) : isOperator ? (
                  <OperatorGamePage currentUserId={currentUserId} gameId={gameId} />
                ) : isNewser ? (
                  <NewserGamePage currentUserId={currentUserId} gameId={gameId} />
                ) : (
                  <PlayerGamePage currentUserId={currentUserId} gameId={gameId} />
                )}
                </SimProfiler>
              </View>
            </ShadowScrollView>
          </BodyReadinessProvider>
        </LoadingContainer>
        {/* Outside SimProvider on purpose: the manager reads the live roster
            for import and writes literal sim coordinates - inside the provider
            the useData redirect would double-prefix them. */}
        <ManageFauxPlayersDialog
          isOpen={simManageOpen}
          onOpenChange={setSimManageOpen}
          gameId={gameId}
        />
    </Column>
  );
};

export default GamePage;
