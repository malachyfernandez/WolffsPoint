import React, { useState } from 'react';
import Column from '../layout/Column';
import { ScrollView, Platform } from 'react-native';
import { useUserListGet } from 'hooks/useUserListGet';
import GameUserIcon from '../ui/icons/UserIcon';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import NightlyPageOPERATOR from './NightlyPageOPERATOR';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import RemoveGameButton from './RemoveGameButton';
import { Newspaper } from 'lucide-react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import GameNavigation from './GameNavigation';
import GameNavigationHighlight from './GameNavigationHighlight';
import { View } from 'react-native';

interface GamePageProps {
    gameId: string;
    currentUserId: string;
}

const GamePage = ({ gameId, currentUserId }: GamePageProps) => {
    // CHECK IF WE ARE OPORATOR
    const gameDatas = useUserListGet({
        key: "games",
        filterFor: gameId,
    })

    if (gameDatas) {
        if (gameDatas?.length !== 1) {
            console.log("PROBLEM GamePage.tsx");
        }
    }

    // CHECK IF WE ARE REPORTER
    // TO DO (after configurable in dashboard)

    // CHECK IF WE ARE PLAYER
    // TODO: (after userArray is made)


    type navBarType = "players" | "config" | "nightly" | "newspaper";

    const [navBar, setNavBar] = useState<navBarType>("players");

    return (

        <Column className='w-full h-full'>
            <ScrollShadow LinearGradientComponent={LinearGradient}>
                <ScrollView className='p-6 max-h-[calc(100vh-6rem)] h-full w-full flex-1'>
                    <View className="w-full max-w-[1000px] mx-auto">
                        {/* <PoppinsText>{`Game ${gameId}`}</PoppinsText> */}

                        <GameNavigation onTabPress={setNavBar} />
                        <GameNavigationHighlight activeTab={navBar} />

                        <Column
                            className='w-[80%] h-[1rem] mb-[-1rem] bg-inner-background z-50'
                            // transform
                            style={{ transform: "translateX(-50%) translateY(2px)", left: Platform.OS === "web" ? "50%" : "25%" }}
                        />
                        <Column>
                            <Column
                                className='w-full bg-inner-background border-border border-2 rounded-xl p-4 mb-8'
                                style={{ boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                            >

                                {/* if players */}
                                {navBar === "players" && (
                                    <PlayerPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                                )}

                                {/* if config */}
                                {navBar === "config" && (
                                    <ConfigPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                                )}

                                {/* if nightly */}
                                {navBar === "nightly" && (
                                    <NightlyPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                                )}

                                {navBar === "newspaper" && (
                                    <NewspaperPageOPERATOR currentUserId={currentUserId} gameId={gameId} />
                                )}

                            </Column>

                            <RemoveGameButton gameId={gameId} />
                        </Column>
                    </View>


                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default GamePage;
