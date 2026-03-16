import React from 'react';
import PoppinsText from '../text/PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import Column from '../../layout/Column';
import Row from '../../layout/Row';

interface FriendListItemProps {
    friend: string;
}

const FriendListItem = ({ friend }: FriendListItemProps) => {
    const friendData = useUserVariableGet({
        key: "userData",
        userIds: [friend],
    });

    const email = friendData?.[0]?.value.email;
    const userId = friendData?.[0]?.value.userId;
    const name = friendData?.[0]?.value.name;


    return (
        <Column gap={1}>
            {email && (
                <Row>
                    <PoppinsText weight='bold'>{email}</PoppinsText>
                </Row>
            )}
            {name && (
                <Row>
                    <PoppinsText>{name}</PoppinsText>
                </Row>
            )}
            {userId && (
                <Row>
                    <PoppinsText className='text-sm opacity-50'>{`User ID: ${userId}`}</PoppinsText>
                </Row>
            )}
            
        </Column>
    );
};

export default FriendListItem;
