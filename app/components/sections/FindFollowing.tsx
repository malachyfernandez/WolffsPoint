import React, { useState } from 'react';
import ContainerRow from '../layout/ContainerRow';
import AppButton from '../ui/AppButton';
import PoppinsText from '../ui/PoppinsText';
import PoppinsTextInput from '../ui/PoppinsTextInput';
import SearchResults from '../SearchResults';

interface FindFollowingProps {
    currentUserId: string;
    addFollowing: (friend: any) => void;
    followingList: string[];
}

const FindFollowing = ({ currentUserId, addFollowing, followingList }: FindFollowingProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <>
            <PoppinsText>Find Following</PoppinsText>

            <ContainerRow>
                
                {/* input */}
                <PoppinsTextInput
                    className='flex-shrink w-full h-10 border border-slate-700 rounded-lg p-2'
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder='Search for people to follow'
                />
                <AppButton variant="grey" className="w-20" onPress={() => {}}>
                    <PoppinsText>Search</PoppinsText>
                </AppButton>
                
            </ContainerRow>

            <SearchResults query={searchQuery} currentUserId={currentUserId} addFollowing={addFollowing} followingList={followingList} />
        </>
    );
};

export default FindFollowing;
