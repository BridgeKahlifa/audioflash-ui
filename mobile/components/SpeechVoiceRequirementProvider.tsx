import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import {
  MissingSpeechVoice,
  setMissingSpeechVoiceHandler,
} from "../lib/audio";
import { launchTtsDataInstallerAsync } from "../lib/tts-data-installer";

export function SpeechVoiceRequirementProvider({ children }: PropsWithChildren) {
  const [requirement, setRequirement] = useState<MissingSpeechVoice | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    setMissingSpeechVoiceHandler((nextRequirement) => {
      setShowManualInstructions(false);
      setRequirement(nextRequirement);
    });
    return () => setMissingSpeechVoiceHandler(null);
  }, []);

  async function handleInstall() {
    setInstalling(true);
    setShowManualInstructions(false);
    try {
      await launchTtsDataInstallerAsync();
      setRequirement(null);
    } catch (installError) {
      console.warn("Failed to open Android voice installation:", installError);
      setShowManualInstructions(true);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <>
      {children}
      <Modal
        visible={requirement !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRequirement(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-3xl bg-background p-6">
            <Text className="text-xl font-semibold text-foreground mb-2">
              {requirement?.language} voice required
            </Text>
            <Text className="text-muted leading-6 mb-5">
              Your phone needs a {requirement?.language} speech voice to play this lesson.
            </Text>
            {showManualInstructions ? (
              <View className="bg-secondary rounded-2xl p-4 mb-4">
                <Text className="text-foreground font-semibold mb-2">
                  Install the voices manually
                </Text>
                <Text className="text-muted text-sm leading-5">
                  1. Open Settings{"\n"}
                  2. Tap General management{"\n"}
                  3. Tap Language and input{"\n"}
                  4. Tap Text-to-speech{"\n"}
                  5. Check which Preferred engine is selected (Google or Samsung){"\n"}
                  6. Tap the gear/settings icon next to the selected engine{"\n"}
                  7. Tap Install voice data{"\n"}
                  8. Find Chinese and Japanese and download/install both voices
                </Text>
                <Text className="text-muted text-sm leading-5 mt-3">
                  Once they're installed, completely close AudioFlash and reopen it, then try the audio again.
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => void handleInstall()}
              disabled={installing}
              className="bg-primary rounded-2xl py-4 items-center"
            >
              {installing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-primary-foreground font-semibold">
                  Install {requirement?.language} Voice
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setRequirement(null)} className="py-3 items-center mt-1">
              <Text className="text-muted font-medium">Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
