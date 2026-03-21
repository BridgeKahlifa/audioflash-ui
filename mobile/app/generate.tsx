import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import {
  fetchLanguages,
  generateLesson,
  startLesson,
  type ApiLanguage,
} from "../lib/api";
import { setCurrentCards } from "../lib/storage";
import type { Flashcard } from "../lib/types";

const TOPIC_SUGGESTIONS = [
  "Ordering coffee",
  "At the airport",
  "Making friends",
  "At the doctor",
  "Shopping for clothes",
  "Asking for directions",
  "Business meeting",
  "At a restaurant",
];

export default function Generate() {
  const { session, profile } = useAuth();
  const [topic, setTopic] = useState("");
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchLanguages()
      .then((langs) => {
        const available = langs.filter(
          (l) => !l.language.toLowerCase().includes("coming soon"),
        );
        setLanguages(available);
        // Pre-select user's first target language if available
        const targetId = profile?.target_language_ids?.[0];
        if (targetId) {
          const match = available.find((l) => l.id === targetId);
          if (match) setSelectedLanguageId(match.id);
        }
        if (!selectedLanguageId && available.length > 0) {
          setSelectedLanguageId(available[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const canGenerate = topic.trim().length >= 2 && selectedLanguageId !== null && status !== "generating";

  async function handleGenerate() {
    if (!canGenerate || !session?.access_token) return;

    const profileId = profile?.id ?? session.user?.id;
    if (!profileId) return;

    setStatus("generating");
    setErrorMessage("");

    try {
      const result = await generateLesson(session.access_token, {
        language_id: selectedLanguageId!,
        topic: topic.trim(),
        card_count: profile?.cards_per_session ?? 5,
      });

      // Store cards locally
      const topicKey = `generated-${result.category.id}`;
      const mappedCards: Flashcard[] = result.flashcards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        chinese: card.source_text,
        pinyin: card.romanization ?? "",
        english: card.translation,
      }));
      await setCurrentCards(topicKey, mappedCards);

      // Start lesson session
      const lessonSession = await startLesson(session.access_token, {
        profile_id: profileId,
        category_id: String(result.category.id),
        started_at: new Date().toISOString(),
      });

      const selectedLang = languages.find((l) => l.id === selectedLanguageId);

      router.replace({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: result.category.name,
          language: selectedLang?.language.toLowerCase().replace(/\s+/g, "-") ?? "unknown",
          languageLabel: selectedLang?.language ?? "",
          apiLanguageId: selectedLanguageId ?? "",
          apiCategoryId: String(result.category.id),
          apiLoaded: "true",
          lessonSessionId: lessonSession.session_id,
        },
      });
    } catch (error: any) {
      setStatus("error");
      const msg = error?.message ?? "";
      if (msg.includes("429") || msg.includes("limit")) {
        setErrorMessage("You've hit the generation limit. Try again in an hour.");
      } else if (msg.includes("422") || msg.includes("inappropriate")) {
        setErrorMessage("That topic couldn't be used. Please try a different one.");
      } else {
        setErrorMessage("Generation failed. Please check your connection and try again.");
      }
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
            <View>
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                Generate a Lesson
              </Text>
              <Text className="text-muted text-sm">AI builds cards from any topic</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Language picker */}
            <Text className="text-sm font-semibold text-foreground mb-2">Language</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-5"
              contentContainerStyle={{ gap: 8 }}
            >
              {languages.map((lang) => {
                const selected = selectedLanguageId === lang.id;
                return (
                  <Pressable
                    key={lang.id}
                    onPress={() => setSelectedLanguageId(lang.id)}
                    className={`rounded-xl px-4 py-2 border ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text className={`font-medium text-sm ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                      {lang.language}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Topic input */}
            <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Ordering coffee, At the airport…"
              placeholderTextColor="#A0A0A0"
              maxLength={150}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              style={{ fontFamily: undefined }}
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
              editable={status !== "generating"}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{topic.length}/150</Text>

            {/* Suggestions */}
            <Text className="text-sm font-semibold text-foreground mb-2">Suggestions</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {TOPIC_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => setTopic(suggestion)}
                  className="rounded-full px-3 py-1.5 bg-secondary border border-border"
                >
                  <Text className="text-sm text-foreground">{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{errorMessage}</Text>
              </View>
            ) : null}

            {status === "generating" && (
              <View className="items-center py-6 gap-3">
                <ActivityIndicator size="large" color="#FF6B4A" />
                <Text className="text-muted text-sm">Building your lesson…</Text>
              </View>
            )}
          </ScrollView>

          {/* Generate button */}
          <View className="px-6 pb-6 pt-3">
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              className={`py-4 rounded-2xl items-center ${canGenerate ? "bg-primary" : "bg-secondary"}`}
              style={
                canGenerate
                  ? {
                      shadowColor: "#FF6B4A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }
                  : undefined
              }
            >
              {status === "generating" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className={`text-base font-semibold ${canGenerate ? "text-primary-foreground" : "text-muted"}`}>
                  Generate Lesson
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
