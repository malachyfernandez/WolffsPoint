import { Platform, View } from "react-native";
import { SafeAreaListener, SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import { SignedIn, SignedOut, useOAuth } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Uniwind } from "uniwind";

import AuthButton from "./components/ui/buttons/AuthButton";
import Column from "./components/layout/Column";
import MainPage from "./components/MainPage";
import DialogHeader from "./components/ui/dialog/DialogHeader";

const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function HomeScreen() {
  useWarmUpBrowser();

  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const authFlow = () =>
    startGoogleFlow(
      Platform.OS === "web"
        ? {
            redirectUrl: AuthSession.makeRedirectUri({ path: "auth/callback" }),
          }
        : undefined,
    );

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <View className="flex-1 bg-outer-background">
        <SafeAreaView className="flex-1">
          <View className="w-full h-full items-center justify-center">
            <SignedIn>
              <MainPage />
            </SignedIn>

            <SignedOut>

              <Column className="w-[80vw] p-6 max-w-96 bg-text border-4 border-accent items-center" gap={6}>
                <DialogHeader
                  text="Welcome to Wolffspoint"
                  subtext="Sign in with Google to join."
                  className="w-[80vw] max-w-96"
                />
                <Column gap={8} className="items-center">
                  {/* <PoppinsText className="text-2xl font-bold text-center" color="white">Welcome to Example Project</PoppinsText> */}
                  {/* <AuthButton
            authFlow={startAppleFlow}
            buttonText="Continue with Apple"
          /> */}
                  <AuthButton
                    authFlow={authFlow}
                    buttonText="Sign in with Google"
                  />
                </Column>
              </Column>
            </SignedOut>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaListener>
  );
}

// // ============================================================================
// // DEV NUKE COMPONENT - Uncomment entire section to enable
// // ============================================================================
// import { SafeAreaView } from "react-native-safe-area-context";
// import React from "react";

// import MainPage from "./components/MainPage";
// import DatabaseNukeButton from "./components/dev/DatabaseNukeButton";
// import { useNukeDatabase, useTableCounts } from "../hooks/useNukeDatabase";

// export default function DevNukeScreen() {


//   return (
//     <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
//       <DatabaseNukeButton />


//     </SafeAreaView>
//   );
// }
