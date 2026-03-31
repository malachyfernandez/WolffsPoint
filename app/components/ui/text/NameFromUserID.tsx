import React from 'react';
import PoppinsText from './PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';

interface NameFromUserIDProps {
    userid: string;
}

const NameFromUserID = ({ userid }: NameFromUserIDProps) => {
    
    const userDatas = useUserVariableGet({
        key: "userData",
        userIds: [userid],
    });

    const email = userDatas?.[0]?.value?.email;
    
    return (
        <PoppinsText className='text-sm opacity-50'>{email}</PoppinsText>
    );
}

export default NameFromUserID;
