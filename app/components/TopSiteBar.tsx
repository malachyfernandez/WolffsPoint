import React from 'react';
import { useClerk } from '@clerk/clerk-expo';
import Column from './layout/Column';
import Row from './layout/Row';
import AppButton from './ui/AppButton';
import PoppinsText from './ui/PoppinsText';
import { UserIcon } from './icons/UserIcon';

interface TopSiteBarProps {
    className?: string;
}

const TopSiteBar = ({ className = '' }: TopSiteBarProps) => {
    const { signOut } = useClerk();

    return (
        <Column className={className}>
            <Row className='justify-between items-center p-6'>
                <PoppinsText weight='bold' className='text-lg'>WolffsPoint</PoppinsText>
                <AppButton variant="outline" className="h-14 w-14" onPress={() => signOut()}>
                    <UserIcon size={24} className='group-hover:text-white' />
                </AppButton>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
