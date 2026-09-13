import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../lib/theme-context";
import { LanguageFlag } from "../components/LanguageFlag";

type FirstLessonParams = {
  topic: string;
  topicTitle: string;
  language?: string;
  languageLabel?: string;
  apiLanguageId?: string;
  apiCategoryId?: string;
  apiLoaded?: string;
  supportedDifficulties?: string;
  selectedDifficulty?: string;
  availableCardCount?: string;
  cardsByDifficulty?: string;
};

export default function FirstLessonScreen() {
  const params = useLocalSearchParams<FirstLessonParams>();
  const { matrixMode, fontFamily } = useAppTheme();

  const palette = matrixMode
    ? {
        hero: "#0A0A0A",
        heroBorder: "#5C261A",
        iconBackground: "#29110B",
        icon: "#FF8C42",
        badgeBackground: "#1A1A1A",
        stepBackground: "#151515",
        stepBorder: "#3B241D",
        shadow: "#FF6B4A",
      }
    : {
        hero: "#FFFDFC",
        heroBorder: "#F2CBBE",
        iconBackground: "#FFE1D5",
        icon: "#E85F3F",
        badgeBackground: "#FBE7DE",
        stepBackground: "#FFFDFC",
        stepBorder: "#F2D7CD",
        shadow: "#E86A4A",
      };

  function startLesson() {
    router.replace({
      pathname: "/lesson-ready/[topic]",
      params: {
        ...params,
        selectedDifficulty: "1",
        autoStart: "true",
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 w-full max-w-md mx-auto px-6 pt-5 pb-6">
        <View className="items-center">
          <Text className="text-xs font-semibold uppercase tracking-widest text-primary" style={{ fontFamily }}>
            Getting Started
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 28 }}
        >
          <View
            style={{
              backgroundColor: palette.hero,
              borderColor: palette.heroBorder,
              borderWidth: 1,
              borderRadius: 28,
              paddingHorizontal: 24,
              paddingVertical: 30,
              shadowColor: palette.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: matrixMode ? 0.16 : 0.12,
              shadowRadius: 22,
              elevation: 7,
            }}
          >
            <View className="items-center">
              <View
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.iconBackground,
                }}
              >
                <Ionicons name="volume-high" size={48} color={palette.icon} />
              </View>

              <View
                className="flex-row items-center rounded-full px-3 py-2 mt-6"
                style={{ backgroundColor: palette.badgeBackground }}
              >
                {params.languageLabel ? <LanguageFlag name={params.languageLabel} size="sm" /> : null}
                <Text className="text-xs font-semibold text-foreground ml-2" style={{ fontFamily }}>
                  {params.languageLabel ?? "Your language"} · Level 1
                </Text>
              </View>

              <Text className="text-3xl font-bold text-foreground text-center tracking-tight mt-5" style={{ fontFamily }}>
                Ready for your first lesson?
              </Text>
              <Text className="text-base text-muted text-center mt-3" style={{ fontFamily, lineHeight: 24 }}>
                Start with {params.topicTitle || "Essentials & Greetings"} and learn useful words by listening first.
              </Text>
            </View>

            <View className="gap-3 mt-7">
              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: palette.stepBackground, borderColor: palette.stepBorder }}
              >
                <Ionicons name="headset-outline" size={21} color={palette.icon} />
                <Text className="text-sm text-foreground ml-3 flex-1" style={{ fontFamily }}>
                  Listen carefully to each phrase
                </Text>
              </View>
              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: palette.stepBackground, borderColor: palette.stepBorder }}
              >
                <Ionicons name="repeat-outline" size={21} color={palette.icon} />
                <Text className="text-sm text-foreground ml-3 flex-1" style={{ fontFamily }}>
                  Replay the audio whenever you need
                </Text>
              </View>
              <View
                className="flex-row items-center px-4 py-3 rounded-2xl border"
                style={{ backgroundColor: palette.stepBackground, borderColor: palette.stepBorder }}
              >
                <Ionicons name="bulb-outline" size={21} color={palette.icon} />
                <Text className="text-sm text-foreground ml-3 flex-1" style={{ fontFamily }}>
                  Try and guess the meaning before checking the answer
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <Pressable
          onPress={startLesson}
          accessibilityRole="button"
          accessibilityLabel="Start your first lesson"
          className="bg-primary rounded-2xl min-h-14 items-center justify-center px-6"
          style={{
            shadowColor: palette.shadow,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.28,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-primary-foreground text-base font-bold" style={{ fontFamily }}>
              Start Lesson
            </Text>
            <Ionicons name="arrow-forward" size={19} color={matrixMode ? "#000000" : "#FFFFFF"} style={{ marginLeft: 8 }} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
