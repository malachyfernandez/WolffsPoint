import React, { PropsWithChildren, useState, useMemo, useEffect, useDeferredValue } from 'react';
import { Button } from 'heroui-native/button';
import { Dialog } from 'heroui-native/dialog';
import { ScrollView, View } from 'react-native';
import Column from './layout/Column';
import FontText from './ui/text/FontText';
import { useValue, useFindListItems, useListSet } from 'hooks/useData';
import { GameInfo } from 'types/games';
import TopSiteBar from './layout/TopSiteBar';
import AllGamesPage from './game/AllGamesPage';
import GamePage from './game/GamePage';
import LayoutStateAnimatedView, { fromBottom } from './ui/LayoutStateAnimatedView';
import FontTextInput from './ui/forms/FontTextInput';
import JoinHandler from './ui/forms/JoinHandler';
import FadeInAfterDelay from './ui/loading/FadeInAfterDelay';
import LoadingContainer from './ui/loading/LoadingContainer';
import { SimProfiler } from '../sim/perf/SimProfiler';
import SimSwitcher from './game/sim/SimSwitcher';
import SimTopActions from './game/sim/SimTopActions';
import { simSidebarExpandedKey } from '../utils/simUtils';



type FontWeight = 'regular' | 'medium' | 'bold';
type ScreenState = 'allGames' | 'game';

interface MainPageProps extends PropsWithChildren {
    className?: string;
}

const MainPage: React.FC<MainPageProps> = ({
    className = '',
}) => {
    const [isHeroDialogOpen, setIsHeroDialogOpen] = useState(false);
    const [isGameBodyReady, setIsGameBodyReady] = useState(false);

    interface UserData {
        email?: string;
        name?: string;
        userId?: string
    };

    const [userData, setUserData] = useValue<UserData>("userData");

    const userId = userData.value.userId || "";

    const userIds = useMemo(() => [userId], [userId]);
    const myGames = useFindListItems<GameInfo>("games", {
        userIds: userIds,
    });

    const [activeGameId, setActiveGameId] = useValue<string>("activeGameId");
    const generateGameId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const addNewGame = () => {
        const newGameId = generateGameId();

        setUserListItem({
            key: "games",
            itemId: newGameId,
            value: {
                id: newGameId,
                name: "Game 1",
                description: "Description 1",
            },
        });
    }

    const setUserListItem = useListSet();
    const isInAGame = activeGameId.value !== "";
    const isActiveGameMine = useMemo(
        () => (myGames ?? []).some((record) => record.value?.id === activeGameId.value),
        [myGames, activeGameId.value]
    );
    const currentScreen: ScreenState = isInAGame ? 'game' : 'allGames';

    // Sidebar rail state is persisted per game (like the sim session) so a
    // reload restores expanded/collapsed. Subscribed here so the screen gate
    // below can wait for it - the sidebar must never pop in after the game
    // content is already painted, or everything shifts sideways.
    const [sidebarExpandedRecord, setSidebarExpanded] = useValue<boolean>(
        simSidebarExpandedKey(activeGameId.value),
        { defaultValue: false, privacy: 'PUBLIC', enabled: isActiveGameMine }
    );
    const sidebarExpanded = sidebarExpandedRecord.value ?? false;
    // Latch "settled" per game: once the initial fetch lands the gate stays
    // open, so pref writes (collapse toggles re-entering isSyncing) don't
    // flash the whole screen back to loading.
    const [sidebarPrefLoadedFor, setSidebarPrefLoadedFor] = useState<string | null>(null);
    useEffect(() => {
        if (
            isActiveGameMine &&
            sidebarExpandedRecord.state?.isSyncing === false &&
            sidebarPrefLoadedFor !== activeGameId.value
        ) {
            setSidebarPrefLoadedFor(activeGameId.value);
        }
    }, [
        isActiveGameMine,
        sidebarExpandedRecord.state?.isSyncing,
        sidebarPrefLoadedFor,
        activeGameId.value,
    ]);
    const sidebarPrefLoaded = !isActiveGameMine || sidebarPrefLoadedFor === activeGameId.value;
    // Defer the screen swap so mounting GamePage is a non-urgent render:
    // React can yield between commits instead of delivering the whole mount
    // as one multi-second frame (measured 2.4s on iOS Safari).
    const deferredScreen: ScreenState = useDeferredValue(currentScreen);
    // While the deferred value lags the real one, the container would paint
    // the *old* screen (e.g. AllGamesPage's New/Join buttons flashing before
    // the game mounts). Render nothing during that pending window instead.
    const visibleScreen: ScreenState | 'pending' =
        deferredScreen === currentScreen ? deferredScreen : 'pending';

    // Reset body readiness when entering/leaving a game
    useEffect(() => {
        setIsGameBodyReady(false);
    }, [activeGameId.value]);


    return (
        <>
            <View className='w-screen h-screen p-safe flex-row'>

                {/* The sim sidebar is inside this gate (in layout flow) so it
                 *  mounts together with the game content at its real persisted
                 *  width - dependencies cover game id, game ownership (decides
                 *  whether a sidebar exists at all) and the expanded pref. */}
                <LoadingContainer
                    dependencies={[activeGameId, myGames, sidebarPrefLoaded]}
                    loadingText="Loading"
                    className='flex-1'
                    keepMounted={false}
                >
                    <View className='flex-1 flex-row'>
                    {visibleScreen === 'game' && isActiveGameMine && (
                        <SimSwitcher
                            gameId={activeGameId.value}
                            isOperator={true}
                            expanded={sidebarExpanded}
                            onExpandedChange={setSidebarExpanded}
                        />
                    )}

                    {/* Out-of-sim session actions: a self-contained float in
                     *  the top-left (level with the top-right code chip), its
                     *  own bounded item so it never spans the bar and eats bg
                     *  clicks. The width cap makes END wrap under ENTER as
                     *  the screen narrows. */}
                    {visibleScreen === 'game' && isActiveGameMine && isGameBodyReady && (
                        <View
                            className='absolute left-4 top-6 z-10'
                            style={{ maxWidth: '55%' }}>
                            <SimTopActions
                                gameId={activeGameId.value}
                                isOperator={true}
                            />
                        </View>
                    )}

                    <LayoutStateAnimatedView.Container stateVar={visibleScreen} className='flex-1'>
                        <LayoutStateAnimatedView.Option page={1} stateValue='allGames'>
                            <SimProfiler id="screen:allGames">
                            <AllGamesPage
                                activeGameId={activeGameId.value}
                                setActiveGameId={setActiveGameId}
                                myGames={myGames}
                                addNewGame={addNewGame}
                            />
                            </SimProfiler>
                        </LayoutStateAnimatedView.Option>

                        <LayoutStateAnimatedView.OptionContainer pushInAnimation={fromBottom} page={2}>
                            <LayoutStateAnimatedView.Option stateValue='game'>
                                <SimProfiler id="screen:game">
                                <GamePage
                                    gameId={activeGameId.value}
                                    currentUserId={userId}
                                    onReady={() => setIsGameBodyReady(true)}
                                />
                                </SimProfiler>
                            </LayoutStateAnimatedView.Option>
                        </LayoutStateAnimatedView.OptionContainer>
                    </LayoutStateAnimatedView.Container>
                    </View>
                </LoadingContainer>


            </View >
            <View className='absolute top-0 right-0'>
                <TopSiteBar isGameBodyReady={isGameBodyReady} />
            </View>
        </>
    );
};

export default MainPage;
