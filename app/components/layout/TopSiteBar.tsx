import React from 'react';
import { useClerk } from '@clerk/clerk-expo';
import Column from './Column';
import Row from './Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { UserIcon } from '../ui/icons/UserIcon';
import { TouchableOpacity } from 'react-native';
import UserProfileDialog from '../dialog/UserProfileDialog';

interface TopSiteBarProps {
    className?: string;
    isInAGame?: boolean;
    setActiveGameId: (gameId: string) => void;
}

const TopSiteBar = ({ className = '', isInAGame, setActiveGameId }: TopSiteBarProps) => {
    const { signOut } = useClerk();

    return (
        <Column className={className}>
            <Row className='justify-between items-center h-24 px-4'>
                <TouchableOpacity onPress={() => { setActiveGameId(""); }}>
                    <PoppinsText weight='bold' className='text-lg'>{isInAGame ? "< WolffsPoint" : "WolffsPoint"}</PoppinsText>
                </TouchableOpacity>
                <UserProfileDialog>
                    <AppButton variant="outline" className="h-14 w-14">
                        <UserIcon size={24} />
                    </AppButton>
                </UserProfileDialog>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
