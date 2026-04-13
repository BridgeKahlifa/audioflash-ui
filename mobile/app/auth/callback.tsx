import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";

export default function AuthCallbackScreen() {
  const { completeOAuthRedirect } = useAuth();
  const url = ExpoLinking.useURL();
  const [error, setError] = useState<string | null>(null);
  const attemptedUrl = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const candidateUrl = url ?? await ExpoLinking.getInitialURL();
      if (!candidateUrl || attemptedUrl.current === candidateUrl) return;
      attemptedUrl.current = candidateUrl;

      const result = await completeOAuthRedirect(candidateUrl);
      if (!isActive) return;

      if (!result.handled) {
        setError("This sign-in link could not be recognized.");
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      router.replace("/");
    })();

    return () => {
      isActive = false;
    };
  }, [completeOAuthRedirect, url]);

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        {error ? (
          <>
            <Text className="text-2xl font-semibold text-foreground mb-3">Sign-in failed</Text>
            <Text className="text-muted text-center mb-6">{error}</Text>
            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              className="py-4 px-6 rounded-2xl items-center bg-primary"
            >
              <Text className="text-primary-foreground font-semibold text-base">Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#FF6B4A" />
            <Text className="text-foreground text-lg font-semibold mt-6 mb-2">Finishing sign-in</Text>
            <Text className="text-muted text-center">We&apos;re connecting your Google account now.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
