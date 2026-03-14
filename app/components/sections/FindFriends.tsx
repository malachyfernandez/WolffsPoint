import React, { useState } from 'react';
import ContainerRow from '../layout/ContainerRow';
import AppButton from '../ui/AppButton';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import SearchResults from '../SearchResults';

interface FindFriendsProps {
    currentUserId: string;
    addFriend: (friend: any) => void;
}

const FindFriends = ({ currentUserId, addFriend }: FindFriendsProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <>
            <PoppinsText>Find Friends</PoppinsText>

            <ContainerRow>
                
                {/* input */}
                <PoppinsTextInput
                    className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder='Search for friends'
                />
                <AppButton variant="grey" className="w-20" onPress={() => {}}>
                    <PoppinsText>Search</PoppinsText>
                </AppButton>
                
            </ContainerRow>

            <SearchResults query={searchQuery} currentUserId={currentUserId} addFriend={addFriend} />
        </>
    );
};

export default FindFriends;
