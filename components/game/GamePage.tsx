import React, { useCallback, useEffect, useRef, useState } from 'react';
import Column from '../layout/Column';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useFindListItems, useFindValues } from 'hooks/useData';
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
  const { width: screenWidth } = useWindowDimensions();

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollAmount.value = event.contentOffset.y;
    },
  });

  // Calculate blur amount based on scroll (0px blur at top, 8px blur when scrolled 100px)
  const logoBlurStyle = useAnimatedStyle(
    () =>
      ({
        filter:
          Platform.OS === 'web'
            ? `blur(${Math.min(Math.max((scrollAmount.value / 100) * 8, 0), 8)}px)`
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

  const validNewser = resolveValidNewserAssignment({
    assignment: newserAssignmentRecords?.[0]?.value,
    userDatas: (userDataRecords ?? []).map((record) => record.value),
  });

  const isNewser = !isOperator && validNewser?.userId === currentUserId;

  const logoWidth = Math.min(screenWidth * 0.97, 760);
  const logoHeight = (logoWidth / 522) * 183;
  const baseHeight = 183;
  // const translateY = (logoHeight - baseHeight) / 2;
  const translateY = -(logoWidth / 9) + 100;

  return (
    <Column className="h-screen w-full gap-4">
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
              scrollViewClassName="p-6 px-2 sm:px-6 h-screen w-full"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              scrollViewComponent={Animated.ScrollView}>
              <View className="mx-auto w-full max-w-[1000px] pt-60">
                {isRoleDataLoading ? (
                  <View className="min-h-100" />
                ) : isOperator ? (
                  <OperatorGamePage currentUserId={currentUserId} gameId={gameId} />
                ) : isNewser ? (
                  <NewserGamePage currentUserId={currentUserId} gameId={gameId} />
                ) : (
                  <PlayerGamePage currentUserId={currentUserId} gameId={gameId} />
                )}
              </View>
            </ShadowScrollView>
          </BodyReadinessProvider>
        </LoadingContainer>
    </Column>
  );
};

export default GamePage;
