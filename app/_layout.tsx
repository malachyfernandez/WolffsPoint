

import "../polyfills";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Slot } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { tokenCache } from '../utils/tokenCache';
import { ToastProvider } from '../contexts/ToastContext';
import { GenerationProvider } from '../contexts/GenerationContext';
import { WebDropdownProvider } from '../contexts/WebDropdownProvider';
import "../global.css";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GenerationProvider>
        <ToastProvider>
          <HeroUINativeProvider
            config={{
              devInfo: {
                stylingPrinciples: false,
              },
            }}
          >
            <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
              <ClerkLoaded>
                <WebDropdownProvider>
                  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                    <Slot />
                    <PortalHost />
                  </ConvexProviderWithClerk>
                </WebDropdownProvider>
              </ClerkLoaded>
            </ClerkProvider>
          </HeroUINativeProvider>
        </ToastProvider>
      </GenerationProvider>
    </GestureHandlerRootView>
  );
}
