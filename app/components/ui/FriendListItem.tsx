import React from 'react';
import PoppinsText from './PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import ContainerCol from '../layout/ContainerCol';

interface FriendListItemProps {
    friend: string;
}

const FriendListItem = ({ friend }: FriendListItemProps) => {
    const friendData = useUserVariableGet({
        key: "userData",
        userIds: [friend],
    });
    return (
        <ContainerCol gap={1}>
            <PoppinsText>{friendData?.[0]?.value.email}</PoppinsText>
            <PoppinsText>{friendData?.[0]?.value.userId}</PoppinsText>
            <PoppinsText>{friend}</PoppinsText>
        </ContainerCol>
    );
};

export default FriendListItem;
