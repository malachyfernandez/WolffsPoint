import React, { useState } from 'react';
import Column from '../layout/Column';
import { ScrollView, Platform } from 'react-native';
import Row from '../layout/Row';
import { useUserListGet } from 'hooks/useUserListGet';
import GameUserIcon from '../ui/icons/UserIcon';
import NavTab from '../layout/NavTab';
import PlayerPageOPERATOR from './PlayerPageOPERATOR';
import ConfigPageOPERATOR from './ConfigPageOPERATOR';
import NightlyPageOPERATOR from './NightlyPageOPERATOR';
import NewspaperPageOPERATOR from './NewspaperPageOPERATOR';
import RemoveGameButton from './RemoveGameButton';
import { Newspaper } from 'lucide-react-native';

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


    type navBarType = "players" | "config" | "nightly" | "newspaper" | "history" | "settings";

    const [navBar, setNavBar] = useState<navBarType>("players");

    return (

        <Column className='h-full'>
            <ScrollView className='p-6'>
                {/* <PoppinsText>{`Game ${gameId}`}</PoppinsText> */}

                <Row gap={0} className='mb-[-5rem]'>

                    <NavTab text='Players' onPress={() => setNavBar("players")}>
                        <GameUserIcon />
                    </NavTab>
                    <NavTab text='Roles' onPress={() => setNavBar("config")}>

                        <GameUserIcon />

                    </NavTab>
                    <NavTab text='Nightly' onPress={() => setNavBar("nightly")}>
                        <GameUserIcon />
                    </NavTab>
                    <NavTab text='Newspaper' onPress={() => setNavBar("newspaper")}>
                        <Newspaper />
                    </NavTab>
                    <NavTab text='Config'>
                        <></>
                    </NavTab>
                    <NavTab text='Config' isLast={true}>
                        <></>
                    </NavTab>
                </Row>
                <Row gap={0} className='mb-[-10px] z-20' pointerEvents="none">
                    <NavTab text='Players' isInvisible={navBar !== "players"} isHighlighted={true}>
                        <GameUserIcon />
                    </NavTab>

                    <NavTab text='Roles' isInvisible={navBar !== "config"} isHighlighted={true}>
                        <GameUserIcon />
                    </NavTab>

                    <NavTab text='Nightly' isInvisible={navBar !== "nightly"} isHighlighted={true}>
                        <GameUserIcon />
                    </NavTab>

                    <NavTab text='Newspaper' isInvisible={navBar !== "newspaper"} isHighlighted={true}>
                        <Newspaper />
                    </NavTab>

                    <NavTab text='Players' isInvisible={true} isHighlighted={true}>
                        <></>
                    </NavTab>
                    <NavTab text='Players' isInvisible={true} isHighlighted={true} isLast={true}>
                        <></>
                    </NavTab>

                </Row>

                <Column
                    className='w-[80%] h-[1rem] mb-[-1rem] bg-inner-background z-50'
                    // transform
                    style={{ transform: "translateX(-50%) translateY(2px)", left: Platform.OS === "web" ? "50%" : "25%" }}
                />
                <Column>
                    <Column
                        className='w-full bg-inner-background border-border border-2 rounded-xl p-4'
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


            </ScrollView>
        </Column>
    );
};

export default GamePage;
