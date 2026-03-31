import { useEffect, useState } from 'react';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import { useUserListGet } from 'hooks/useUserListGet';
import ConvexDialog from '../dialog/ConvexDialog';
import { Dialog } from 'heroui-native/dialog';

interface JoinHandlerProps {
    gameCode: string;
    onClose: () => void; // Add close handler prop
    onJoin?: (gameId: string) => void;
}

const JoinHandler = ({
    gameCode,
    onClose,
    onJoin,
}: JoinHandlerProps) => {

    const validGameId = useUserListGet({
        key: "games",
        filterFor: gameCode,
    });

    let doesGameExist = false;


    if (validGameId) {
        doesGameExist = validGameId.length > 0;
    }


    const [innerText, setInnerText] = useState('Join');

    // useeffect to set delay before showing invalid
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (innerText === 'Invalid') {
            timer = setTimeout(() => {
                setInnerText('Join');
            }, 1000);
        }

        return () => clearTimeout(timer);
    }, [innerText]);

    const setInvalid = () => {
        setInnerText('Invalid');
    };

    const joinGame = () => {
        onJoin?.(gameCode);
        onClose();
    }

    return (
        <>
            {doesGameExist ?
                <AppButton variant="black" className="h-10 w-20" onPress={joinGame}>
                    <PoppinsText weight='medium' color='white'>{'Join'}</PoppinsText>
                </AppButton>
                
                // <AppButton variant="black" className="h-10 w-20" onPress={() => onJoin(gameCode)}>
                //     <PoppinsText weight='medium' color='white'>{'Join'}</PoppinsText>
                // </AppButton>
                :
                <AppButton variant="grey" className="h-10 w-20" onPress={setInvalid} >
                    <PoppinsText weight='medium' color='white'>{innerText}</PoppinsText>
                </AppButton>
            }
        </>
    );
};

export default JoinHandler;
