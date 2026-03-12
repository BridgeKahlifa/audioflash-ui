import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setCurrentCards, getSettings } from "../../lib/storage";
import { Flashcard } from "../../lib/types";
import { fetchLessonsByCategory } from "../../lib/api";

export default function LessonReady() {
  const { topic, topicTitle, language, languageLabel, apiLanguageId, apiCategoryId, apiLoaded } =
    useLocalSearchParams<{
      topic: string;
      topicTitle: string;
      language?: string;
      languageLabel?: string;
      apiLanguageId?: string;
      apiCategoryId?: string;
      apiLoaded?: string;
    }>();

  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [cardCount, setCardCount] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadLesson() {
      setStatus("loading");
      setErrorMessage("");

      try {
        if (!apiCategoryId) {
          setCards([]);
          setCardCount(0);
          setStatus("error");
          setErrorMessage("Lesson details are missing. Please choose a category again.");
          return;
        }

        const settings = await getSettings();
        const lessonCards = await fetchLessonsByCategory({
          categoryId: apiCategoryId,
          limit: settings.cardsPerSession,
        });

        if (lessonCards.length === 0) {
          setCards([]);
          setCardCount(0);
          setStatus("empty");
          return;
        }

        const mappedCards = lessonCards.map((card, index) => ({
          id: index + 1,
          dbId: String(card.id),
          chinese: card.source_text,
          pinyin: card.romanization ?? "",
          english: card.translation,
        }));

        setCards(mappedCards);
        await setCurrentCards(topic, mappedCards);
        setCardCount(mappedCards.length);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load lessons by category", error);
        setCards([]);
        setCardCount(0);
        setStatus("error");
        setErrorMessage("We couldn't load lessons right now. Please try again.");
      }
    }

    loadLesson();
  }, [apiCategoryId, topic]);

  const handleStart = () => {
    if (cards.length === 0) return;

    router.push({
      pathname: "/practice/[topic]",
      params: {
        topic,
        topicTitle: topicTitle ?? topic,
        language,
        languageLabel,
        apiLanguageId: apiLanguageId ?? "",
        apiLoaded: apiLoaded ?? "",
        apiCategoryId: apiCategoryId ?? "",
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
                language,
                languageLabel,
                apiLanguageId: apiLanguageId ?? "",
                apiLoaded: apiLoaded ?? "",
              },
            })
          }
          className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center p-6">
        <View
          className="w-full max-w-md bg-card rounded-3xl p-8 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <View className="w-24 h-24 bg-accent rounded-full items-center justify-center mb-6">
            {status === "loading" ? (
              <ActivityIndicator size="large" color="#FF6B4A" />
            ) : status === "empty" ? (
              <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
            ) : status === "error" ? (
              <Ionicons name="alert-circle" size={48} color="#FF6B4A" />
            ) : (
              <Ionicons name="headset" size={48} color="#FF6B4A" />
            )}
          </View>

          <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
            {status === "loading"
              ? "Loading your lesson..."
              : status === "empty"
                ? "No lessons found for this category"
                : status === "error"
                  ? "Unable to load lesson"
                  : "Your lesson is ready"}
          </Text>

          <View className="mb-8 items-center gap-1">
            <Text className="text-muted">
              Language: <Text className="text-foreground font-medium">{languageLabel}</Text>
            </Text>
            <Text className="text-muted">
              Topic: <Text className="text-foreground font-medium">{topicTitle ?? topic}</Text>
            </Text>
            {status === "ready" ? (
              <Text className="text-muted">{cardCount} phrases loaded</Text>
            ) : null}
            {status === "empty" ? (
              <Text className="text-muted text-center">
                No lessons were returned for this category.
              </Text>
            ) : null}
            {status === "error" && errorMessage ? (
              <Text className="text-muted text-center">{errorMessage}</Text>
            ) : null}
          </View>

          <Pressable
            onPress={handleStart}
            disabled={status !== "ready"}
            className={`w-full py-4 rounded-2xl items-center ${
              status === "ready" ? "bg-primary" : "bg-secondary"
            }`}
            style={
              status === "ready"
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
                status === "ready" ? "text-primary-foreground" : "text-muted"
              }`}
            >
              {status === "loading" ? "Loading..." : "Start Practice"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
