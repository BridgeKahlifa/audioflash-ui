import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { generateFlashcards } from "../../lib/ai";
import { getSettings, setCurrentCards } from "../../lib/storage";

export default function LessonReady() {
  const { topic, topicTitle, language, languageLabel } = useLocalSearchParams<{
    topic: string;
    topicTitle: string;
    language?: string;
    languageLabel?: string;
  }>();

  const [status, setStatus] = useState<"generating" | "ready" | "error">("generating");
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    async function generate() {
      try {
        const settings = await getSettings();
        const cards = await generateFlashcards(
          topic,
          topicTitle ?? topic,
          settings.cardsPerSession
        );
        await setCurrentCards(topic, cards);
        setCardCount(cards.length);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }
    generate();
  }, [topic, topicTitle]);

  const handleStart = () => {
    router.push({
      pathname: "/practice/[topic]",
      params: {
        topic,
        topicTitle: topicTitle ?? topic,
        language: language ?? "mandarin",
        languageLabel: languageLabel ?? "Mandarin Chinese",
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-2 max-w-md w-full mx-auto">
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/categories",
              params: {
                language: language ?? "mandarin",
                languageLabel: languageLabel ?? "Mandarin Chinese",
              },
            })
          }
          className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md bg-card rounded-3xl p-8 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <View className="w-24 h-24 bg-accent rounded-full items-center justify-center mb-6">
            {status === "generating" ? (
              <ActivityIndicator size="large" color="#FF6B4A" />
            ) : status === "error" ? (
              <Ionicons name="alert-circle" size={48} color="#FF6B4A" />
            ) : (
              <Ionicons name="headset" size={48} color="#FF6B4A" />
            )}
          </View>

          <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
            {status === "generating"
              ? "Generating your lesson..."
              : status === "error"
              ? "Using sample phrases"
              : "Your lesson is ready"}
          </Text>

          <View className="mb-8 items-center gap-1">
            <Text className="text-muted">
              Language:{" "}
              <Text className="text-foreground font-medium">
                {languageLabel ?? "Mandarin Chinese"}
              </Text>
            </Text>
            <Text className="text-muted">
              Topic:{" "}
              <Text className="text-foreground font-medium">
                {topicTitle ?? topic}
              </Text>
            </Text>
            {status !== "generating" && (
              <Text className="text-muted">{cardCount} phrases generated</Text>
            )}
          </View>

          <Pressable
            onPress={handleStart}
            disabled={status === "generating"}
            className={`w-full py-4 rounded-2xl items-center ${
              status === "generating" ? "bg-secondary" : "bg-primary"
            }`}
            style={
              status !== "generating"
                ? {
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }
                : undefined
            }
          >
            <Text
              className={`text-base font-semibold ${
                status === "generating" ? "text-muted" : "text-primary-foreground"
              }`}
            >
              Start Practice
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
