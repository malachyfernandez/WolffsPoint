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
    const currentScreen: ScreenState = isInAGame ? 'game' : 'allGames';
    // Defer the screen swap so mounting GamePage is a non-urgent render —
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
            <View className='w-screen h-screen p-safe'>


                <LoadingContainer
                    dependencies={[activeGameId]}
                    loadingText="Loading"
                    className='flex-1'
                    keepMounted={false}
                >
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
                </LoadingContainer>


            </View >
            <View className='absolute top-0 right-0'>
                <TopSiteBar isGameBodyReady={isGameBodyReady} />
            </View>
        </>
    );
};

export default MainPage;
