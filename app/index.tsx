import { View, Text, TouchableOpacity, ScrollView, Platform, FlatList, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { SignedIn, SignedOut, useOAuth, useClerk, useUser } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";

import AuthButton from "./components/ui/AuthButton";

import ContainerCol from "./components/layout/ContainerCol";

import MainPage from "./components/MainPage";

// Warm up the browser (required for Android reliability)
export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  useWarmUpBrowser();
  

  // Setup OAuth Hooks for both providers
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: "oauth_apple" });

  const { user } = useUser();


  // IGNORE THE FOLLOWING CODE I AM TRYING OUT A NEW WAY TO HANDLE ARRAYS
  // interface Bean {
  //   beatText: string;
  //   photoURL?: string;
  // };

  // useUserArrayDefinition<Bean>({
  //   key: "beanArray",
  //   defaultValue: [],
  //   privacy: "private",
  // });

  // const [LastBean, setLastBean] = useUserArray({
  //   key: "beanArray",

  // });

  // const [beanLength] = useUserArrayLength({
  //   key: "beanArray",
  // });
  //END OF TESTING KEEP ALL THIS

  //   (alias) function useUserVariable<T>({ key, defaultValue, isPublic, userId, searchString, searchKey }: {
  //     key: string;
  //     defaultValue?: T;
  //     isPublic?: boolean;
  //     userId?: string;
  //     searchString?: string;
  //     searchKey?: keyof T extends never ? string : keyof T;
  //   }): [T | undefined, (newValue: T) => void]
  // import useUserVariable

  const [searchText, setSearchText] = useState("");


  // Keyboard listener
  // useEffect(() => {
  //   const handleKeyPress = (event: any) => {
  //     const key = event.key;

  //     if (key == '1') {
  //       if (globalScore !== null && globalScore !== undefined) {
  //         setGlobalScore(globalScore + 1);
  //       }
  //     }

  //     //Shift version (1 is !)
  //     if (key == '!') {
  //       if (globalScore !== null && globalScore !== undefined) {
  //         setGlobalScore(globalScore - 1);
  //       }
  //     }
  //   };

  //   // Add keyboard event listener
  //   if (Platform.OS === 'web') {
  //     window.addEventListener('keydown', handleKeyPress);
  //     return () => {
  //       window.removeEventListener('keydown', handleKeyPress);
  //     };
  //   }
  // }, [globalScore, setGlobalScore]);

  return (
    <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
      {/* <ContainerCol className="w-full items-center absolute top-20 z-10">
        <TextInput
          className="w-[90vw] h-12 bg-gray-800 rounded-full px-4 text-white text-xl"
          placeholder="Search users..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />

      </ContainerCol> */}



      <SignedIn>

        {/* <BeanContainer numberOfBeans={0} beanText={beanText.value} setBeanText={setBeanText} /> */}

        <MainPage />

      </SignedIn>

      <SignedOut>
        <ContainerCol>
          <AuthButton
            authFlow={startAppleFlow}
            buttonText="Continue with Apple"
          />
          <AuthButton
            authFlow={startGoogleFlow}
            buttonText="Continue with Google"
          />
        </ContainerCol>



      </SignedOut>
    </SafeAreaView >
  );
}