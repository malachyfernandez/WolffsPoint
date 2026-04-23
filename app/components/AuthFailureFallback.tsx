import React from 'react';
import { View } from 'react-native';
import { useClerk } from '@clerk/clerk-expo';
import Column from './layout/Column';
import FontText from './ui/text/FontText';
import AppButton from './ui/buttons/AppButton';
import GuildedFrame from './ui/chrome/GuildedFrame';
import FadeInAfterDelay from './ui/loading/FadeInAfterDelay';

export default function AuthFailureFallback() {
  const { signOut } = useClerk();

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View className="items-center justify-center">
      <FadeInAfterDelay>
        <GuildedFrame
          className="w-[80vw] max-w-96"
          contentClassName="p-6"
          backgroundToken="inner-background"
        >
          <Column className="gap-6 items-center">
            <FontText
              className="text-2xl font-bold text-center mt-4"
              color="text"
            >
              Welcome to Wolffspoint
            </FontText>

            <Column className="gap-1 items-center mb-4 w-full">
              <AppButton
                variant="accent"
                className="w-44"
                onPress={handleReload}
              >
                <FontText color="white" weight="bold">
                  Enter
                </FontText>
              </AppButton>
              <AppButton
                variant="secondary"
                className="h-12 w-44"
                onPress={handleSignOut}
              >
                <FontText weight="bold" color="text">
                  Sign Out
                </FontText>
              </AppButton>
            </Column>
          </Column>
        </GuildedFrame>
      </FadeInAfterDelay>
    </View>
  );
}
