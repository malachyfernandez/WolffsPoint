import { useEffect, useState } from 'react';
import AppButton from '../buttons/AppButton';
import PoppinsText from '../text/PoppinsText';
import { useUserListGet } from 'hooks/useUserListGet';

interface JoinHandlerProps {
    onJoin: (gameCode: string) => void;
    gameCode: string;
}

const JoinHandler = ({
    onJoin,
    gameCode,
}: JoinHandlerProps) => {
    const gameIdChecker = useUserListGet({
        key: "games",
        filterFor: gameCode,
    });

    let doesGameExist = false;


    if (gameIdChecker) {
        doesGameExist = gameIdChecker.length > 0;
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

    return (
        <>
            {doesGameExist ?
                <AppButton variant="black" className="h-10 w-20" onPress={() => onJoin(gameCode)}>
                    <PoppinsText weight='medium' color='white'>{'Join'}</PoppinsText>
                </AppButton>
                : 
                <AppButton variant="black" className="h-10 w-20 opacity-50" onPress={setInvalid} >
                    <PoppinsText weight='medium' color='white'>{innerText}</PoppinsText>
                </AppButton>
                }
        </>
    );
};

export default JoinHandler;
