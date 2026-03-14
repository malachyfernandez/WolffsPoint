import React from 'react';
import PoppinsText from './PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import ContainerCol from '../layout/ContainerCol';
import ContainerRow from '../layout/ContainerRow';

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
            <ContainerRow>
                <PoppinsText weight='bold'>from hook:</PoppinsText>
                <PoppinsText>{friendData?.[0]?.value.email}</PoppinsText>
            </ContainerRow>
            <ContainerRow>
                <PoppinsText weight='bold'>from hook:</PoppinsText>
                <PoppinsText>{friendData?.[0]?.value.userId}</PoppinsText>
            </ContainerRow>
            <ContainerRow>
                <PoppinsText weight='bold'>from props:</PoppinsText>
                <PoppinsText>{friend}</PoppinsText>
            </ContainerRow>
        </ContainerCol>
    );
};

export default FriendListItem;
