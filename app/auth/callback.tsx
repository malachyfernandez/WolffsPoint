import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { View } from "react-native";

export default function Page() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect to main app after OAuth completion
  if (isSignedIn) {
    router.replace("/");
  }

  return <View />;
}
