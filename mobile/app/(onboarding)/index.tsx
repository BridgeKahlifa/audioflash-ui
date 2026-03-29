import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAnalytics } from "../../lib/analytics";

const LOGO_IMAGE = require("../../assets/AudioFlashLogo3.png");

export default function OnboardingWelcome() {
  const posthog = useAnalytics();

  function handleStart() {
    posthog?.capture("onboarding_started");
    router.push("/(onboarding)/name");
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 px-6 max-w-md w-full mx-auto justify-between py-8">
        <View className="flex-1 justify-center items-center gap-6">
          <Image
            source={LOGO_IMAGE}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
          <View className="items-center gap-2">
            <Text className="text-4xl font-semibold text-foreground tracking-tight text-center">
              {"Welcome to\nAudioFlash"}
            </Text>
            <Text className="text-muted text-center text-base leading-relaxed mt-2">
              Learn any language through audio-first flashcards, personalized to you with AI.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          className="py-4 rounded-2xl items-center bg-primary"
          style={{
            shadowColor: "#E86A4A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-primary-foreground font-semibold text-base">Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
