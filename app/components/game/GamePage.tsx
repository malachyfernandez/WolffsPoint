import React, { useState } from 'react';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import { ScrollView, TouchableOpacity, View, Platform } from 'react-native';
import Row from '../layout/Row';
import { useUserListGet } from 'hooks/useUserListGet';
import prettyLog from '../../../utils/prettyLog';
import { useUserListSet } from 'hooks/useUserListSet';
import UserIcon from '../ui/icons/UserIcon';
import NavTab from '../layout/NavTab';
import { transform } from '@babel/core';
import OperatorsPlayerPage from './operators-player-page';
import AppButton from '../ui/buttons/AppButton';

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
        if (gameDatas?.length != 1) {
            console.log("PROBLEM GamePage.tsx");
        }
    }

    const gameData = gameDatas?.[0];

    const operatorId = gameData?.userToken || "";

    const isOperator = operatorId === currentUserId;

    // CHECK IF WE ARE REPORTER
    // TO DO (after configurable in dashboard)

    // CHECK IF WE ARE PLAYER
    // TODO: (after userArray is made)


    type navBarType = "players" | "config" | "stats" | "history" | "settings";

    const [navBar, setNavBar] = useState<navBarType>("config");

    return (

        <Column className='h-full'>
            <ScrollView className='p-6'>
                {/* <PoppinsText>{`Game ${gameId}`}</PoppinsText> */}

                <Row gap={0} className='mb-[-5rem]'>

                    <NavTab text='Players' onPress={() => setNavBar("players")}>
                        <UserIcon />
                    </NavTab>
                    <NavTab text='Config' onPress={() => setNavBar("config")}>

                        <UserIcon />

                    </NavTab>
                    <NavTab text='Config'>
                        <></>
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
                        <UserIcon />
                    </NavTab>

                    <NavTab text='Config' isInvisible={navBar !== "config"} isHighlighted={true}>
                        <UserIcon />
                    </NavTab>

                    <NavTab text='Players' isInvisible={true} isHighlighted={true}>
                        <></>
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
                <Column
                    className='w-full bg-inner-background border-border border-2 rounded-xl p-4'
                    style={{ boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                >

                    {/* if players */}
                    {navBar === "players" && (
                        <OperatorsPlayerPage currentUserId={currentUserId} gameId={gameId} />
                    )}
                </Column>
            </ScrollView>
        </Column>
    );
};

export default GamePage;
