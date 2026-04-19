import React from 'react';
import FontText from './FontText';
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
        <FontText className='text-sm opacity-50'>{email}</FontText>
    );
}

export default NameFromUserID;
