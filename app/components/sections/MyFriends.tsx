import React from 'react';
import PoppinsText from '../ui/PoppinsText';
import FriendListItem from '../ui/FriendListItem';

interface MyFriendsProps {
    friendsList: string[];
}

const MyFriends = ({ friendsList }: MyFriendsProps) => {
    
    return (
        <>
            <PoppinsText>My Friends</PoppinsText>
            {friendsList?.map((friend, index) => (
                
                <FriendListItem key={index} friend={friend} />
            ))}
        </>
    );
};

export default MyFriends;
