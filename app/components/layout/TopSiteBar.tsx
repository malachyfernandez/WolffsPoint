import React from 'react';
import { useClerk } from '@clerk/clerk-expo';
import Column from './Column';
import Row from './Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { UserIcon } from '../ui/icons/UserIcon';
import { TouchableOpacity } from 'react-native';

interface TopSiteBarProps {
    className?: string;
    isInAGame?: boolean;
    setActiveGameId: (gameId: string) => void;
}

const TopSiteBar = ({ className = '', isInAGame, setActiveGameId }: TopSiteBarProps) => {
    const { signOut } = useClerk();

    return (
        <Column className={className}>
            <Row className='justify-between items-center p-6'>
                <TouchableOpacity onPress={() => { setActiveGameId(""); }}>
                    <PoppinsText weight='bold' className='text-lg'>{isInAGame ? "< WolffsPoint" : "WolffsPoint"}</PoppinsText>
                </TouchableOpacity>
                <AppButton variant="outline" className="h-14 w-14" onPress={() => signOut()}>
                    <UserIcon size={24} />
                </AppButton>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
