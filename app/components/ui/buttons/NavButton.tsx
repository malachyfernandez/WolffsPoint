import React from 'react';

import AppButton from './AppButton';
import PoppinsText from '../text/PoppinsText';

type PageState = "Profile" | "Following" | "Feed";

interface NavButtonProps {
    buttonID: PageState;
    pageState: PageState;
    setPageState: (value: PageState) => void;
}

const NavButton = ({ buttonID, pageState, setPageState }: NavButtonProps) => (
    <AppButton variant="grey" className="w-20%" onPress={() => setPageState(buttonID)}>
        <PoppinsText weight={pageState === buttonID ? 'bold' : 'regular'}>
            {buttonID}
        </PoppinsText>
    </AppButton>
);

export default NavButton;
