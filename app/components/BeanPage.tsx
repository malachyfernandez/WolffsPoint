import React, { PropsWithChildren, useEffect } from 'react';

import BeanContainer from './BeanContainer';
import { useUserVariable } from 'hooks/useUserVariable';
import { useSyncUserData } from 'hooks/useSyncUserData';
import ContainerCol from './ContainerCol';
import { useClerk } from '@clerk/clerk-expo';
import { Text, TouchableOpacity, View } from 'react-native';
import PoppinsText from './PoppinsText';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import { useUserVariablePrivacy } from 'hooks/useUserVariablePrivacy';
import ContainerRow from './ContainerRow';

type FontWeight = 'regular' | 'medium' | 'bold';

interface BeanPageProps extends PropsWithChildren {
    className?: string;
}

const BeanPage = ({
    className = '',
}: BeanPageProps) => {


    interface UserData {
        email?: string;
        name?: string;
        userId?: string
    };

    const [userData, setUserData] = useUserVariable<UserData>({
        key: "userData",
        defaultValue: {},
        privacy: "PUBLIC",
        searchKeys: ["name"],
    });


    useSyncUserData(userData.value, setUserData);

    const { signOut } = useClerk();

    const [beanText, setBeanText] = useUserVariable<string>({
        key: "beanText",
        defaultValue: "",
    });

    // ------------------------------------------------------------------------
    // New Stufff
    // ------------------------------------------------------------------------

    const freinds = ["user_38GcBXAETIhkNg1rIBxN85O1u33"];

    const [listItems, setListItems] = useUserVariable<string[]>({
        key: "listItems",
        defaultValue: [],
        privacy: freinds,
    });

    const newItem = () => {
        if (!listItems.value) return;
        setListItems([...listItems.value, `New Item ${listItems.value.length + 1}`]);
    };

    const removeItem = (index: number) => {
        if (!listItems.value) return;
        setListItems(listItems.value.filter((_, i) => i !== index));
    };



    const freindsList = useUserVariableGet<string[][]>({
        key: "listItems",
        returnTop: 3,
    });

    const changeVariablePrivacy = useUserVariablePrivacy();


    return (
        // <ContainerCol className=' w-full h-full items-center justify-center'>
        //     <BeanContainer numberOfBeans={0} beanText={beanText.value} setBeanText={setBeanText} />

        //     <TouchableOpacity className='bg-slate-700 p-3 rounded absolute bottom-10' onPress={() => signOut()}>
        //         <PoppinsText>Sign Out</PoppinsText>
        //     </TouchableOpacity>
        // </ContainerCol>

        <View className='justify-between w-full h-full'>

            <ContainerCol>
                {/* remove freind button */}
                <TouchableOpacity className='border-slate-700 border p-3 rounded w-48 items-center hover:bg-slate-600' onPress={() =>
                    changeVariablePrivacy({
                        key: "listItems",
                        privacy: "PRIVATE",
                    })
                }>
                    <PoppinsText>Remove Freind</PoppinsText>
                </TouchableOpacity>
                {/* add friend button */}
                <TouchableOpacity className='border-slate-700 border p-3 rounded w-48 items-center hover:bg-slate-600' onPress={() =>
                    changeVariablePrivacy({
                        key: "listItems",
                        privacy: freinds,
                    })
                }>
                    <PoppinsText>Add Freind</PoppinsText>
                </TouchableOpacity>

                <PoppinsText weight="medium">{`we are user ${userData?.userToken}`}</PoppinsText>
                {listItems.value &&
                    <ContainerCol gap={1}>
                        {listItems.value.map((item, index) => (
                            <View key={index} className='p-2 bg-slate-700 rounded flex-row justify-between'>
                                <PoppinsText weight="medium">{item}</PoppinsText>
                                <TouchableOpacity className='bg-red-500 rounded-full w-6 h-6 items-center justify-center' onPress={() => removeItem(index)}>
                                    <PoppinsText weight='bold'>-</PoppinsText>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View className='w-full items-center'>
                            <TouchableOpacity className='bg-slate-700 p-3 w-32 items-center' onPress={() => newItem()}>
                                <PoppinsText>+</PoppinsText>
                            </TouchableOpacity>
                        </View>

                    </ContainerCol>
                }

                <ContainerCol gap={1}>
                    {freindsList?.map((freindList, index) => (
                        <ContainerCol key={index}>
                            <PoppinsText weight="medium">{freindList.userToken}</PoppinsText>
                            {freindList.value?.map((item, itemIndex) => (
                                <View key={itemIndex} className='p-2 bg-slate-700 rounded flex-row justify-between'>
                                    <PoppinsText weight="medium">{item}</PoppinsText>
                                </View>
                            ))}
                        </ContainerCol>
                    ))}


                </ContainerCol>


            </ContainerCol>

            <View className='w-full items-center'>
                <ContainerRow className='w-full justify-between'>
                    <TouchableOpacity className='bg-slate-700 p-3 w-40 items-center' onPress={() => signOut()}>
                        <PoppinsText>New Wolffs Point</PoppinsText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity className='bg-slate-700 p-3 w-40 items-center' onPress={() => signOut()}>
                        <PoppinsText>Sign Out</PoppinsText>
                    </TouchableOpacity>
                </ContainerRow>
            </View>
        </View>
    );
};

export default BeanPage;
