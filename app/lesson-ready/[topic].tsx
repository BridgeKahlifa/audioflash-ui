import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSettings, setCurrentCards } from "../../lib/storage";
import { Flashcard } from "../../lib/types";
import { generateFlashcards } from "../../lib/ai";
import { fetchLessonCards, bulkCreateFlashcards } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function LessonReady() {
  const { topic, topicTitle, language, languageLabel, apiLanguageId, apiCategoryId, apiLoaded } = useLocalSearchParams<{
    topic: string;
    topicTitle: string;
    language?: string;
    languageLabel?: string;
    apiLanguageId?: string;
    apiCategoryId?: string;
    apiLoaded?: string;
  }>();

  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const { profile } = useAuth();
  const [status, setStatus] = useState<"generating" | "ready" | "error">("generating");
  const [cardCount, setCardCount] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadLesson() {
      setStatus("loading");
      setErrorMessage("");

      try {
        if (!apiLanguageId || !apiCategoryId) {
          setCards([]);
          setCardCount(0);
          setStatus("error");
          setErrorMessage("Lesson details are missing. Please choose a language and category again.");
          return;
    async function generate() {
      try {
        const cardsPerSession = profile?.cards_per_session ?? 20;
        let cards = await generateFlashcards(
          topic,
          topicTitle ?? topic,
          cardsPerSession
        );

        if (apiLanguageId && apiCategoryId) {
          const lessonCards = await fetchLessonCards({
            languageId: apiLanguageId,
            categoryId: apiCategoryId,
            limit: cardsPerSession,
          });
          if (lessonCards.length > 0) {
            // Use curated API cards — they already have DB IDs
            cards = lessonCards.map((card, index) => ({
              id: index + 1,
              dbId: String(card.id),
              chinese: card.source_text,
              pinyin: card.romanization ?? "",
              english: card.translation,
            }));
          } else if (cards.length > 0) {
            // No curated cards — persist AI-generated cards to the DB
            try {
              const saved = await bulkCreateFlashcards(
                cards.map((card) => ({
                  language_id: apiLanguageId,
                  category_id: apiCategoryId,
                  source_text: card.chinese,
                  romanization: card.pinyin,
                  translation: card.english,
                  difficulty: 1,
                }))
              );
              cards = cards.map((card, i) => ({
                ...card,
                dbId: saved[i] ? String(saved[i].id) : undefined,
              }));
            } catch {
              // Non-critical — cards still usable without DB IDs
            }
          }
        }

        const lessonCards = await fetchLessonCards({
          languageId: apiLanguageId,
          categoryId: apiCategoryId,
        });

        if (lessonCards.length === 0) {
          setCards([]);
          setCardCount(0);
          setStatus("empty");
          return;
        }

        const mappedCards = lessonCards.map((card) => ({
          id: card.id,
          chinese: card.source_text,
          pinyin: card.romanization ?? "",
          english: card.translation,
        }));

        setCards(mappedCards);
        await setCurrentCards(topic, mappedCards);
        setCardCount(mappedCards.length);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load lesson flashcards", error);
        setCards([]);
        setCardCount(0);
        setStatus("error");
        setErrorMessage("We couldn’t load flashcards right now. Please try again.");
      }
    }
    loadLesson();
  }, [topic, topicTitle, apiLanguageId, apiCategoryId]);

  const handleStart = () => {
    if (cards.length === 0) return;

    router.push({
      pathname: "/practice/[topic]",
      params: {
        topic,
        topicTitle: topicTitle ?? topic,
        language: language,
        languageLabel: languageLabel,
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
                language: language,
                languageLabel: languageLabel,
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
              ? "No flashcards found for this lesson"
              : status === "error"
              ? "Unable to load lesson"
              : "Your lesson is ready"}
          </Text>

          <View className="mb-8 items-center gap-1">
            <Text className="text-muted">
              Language:{" "}
              <Text className="text-foreground font-medium">
                {languageLabel}
              </Text>
            </Text>
            <Text className="text-muted">
              Topic:{" "}
              <Text className="text-foreground font-medium">
                {topicTitle ?? topic}
              </Text>
            </Text>
            {status === "ready" && (
              <Text className="text-muted">{cardCount} phrases loaded</Text>
            )}
            {status === "empty" && (
              <Text className="text-muted text-center">
                No flashcards found for this lesson.
              </Text>
            )}
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
