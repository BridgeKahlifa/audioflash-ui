import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setCurrentCards, getSettings } from "../../lib/storage";
import { Flashcard } from "../../lib/types";
import { createLessonSession, fetchLessonsByCategory } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { buildErrorProperties, useAnalytics } from "../../lib/analytics";
import { LanguageFlag } from "../../components/LanguageFlag";

const DEFAULT_CARD_COUNT = 5;
const MIN_CARD_COUNT = 5;
const MAX_CARD_COUNT = 50;
const CARD_COUNT_STEP = 5;

function clampCardCount(value: number) {
  return Math.min(MAX_CARD_COUNT, Math.max(MIN_CARD_COUNT, value));
}

export default function LessonReady() {
  const { profile, session } = useAuth();
  const posthog = useAnalytics();
  const { topic, topicTitle, language, languageLabel, apiLanguageId, apiCategoryId, apiLoaded, supportedDifficulties } =
    useLocalSearchParams<{
      topic: string;
      topicTitle: string;
      language?: string;
      languageLabel?: string;
      apiLanguageId?: string;
      apiCategoryId?: string;
      apiLoaded?: string;
      supportedDifficulties?: string;
    }>();

  const [status, setStatus] = useState<"ready" | "empty" | "error">("ready");
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [cardCount, setCardCount] = useState(profile?.cards_per_session ?? DEFAULT_CARD_COUNT);
  const startLockRef = useRef(false);
  const availableDifficulties = (supportedDifficulties ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value, index, values) => Number.isFinite(value) && !values.slice(0, index).includes(value))
    .sort((a, b) => a - b);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
    availableDifficulties[0] ?? null
  );
  const canStart = Boolean(apiCategoryId) && selectedDifficulty !== null && !starting;

  useEffect(() => {
    setSelectedDifficulty(availableDifficulties[0] ?? null);
  }, [supportedDifficulties]);

  useEffect(() => {
    let mounted = true;

    async function loadCardCount() {
      if (typeof profile?.cards_per_session === "number") {
        setCardCount(clampCardCount(profile.cards_per_session));
        return;
      }

      const settings = await getSettings();
      if (mounted) {
        setCardCount(clampCardCount(settings.cardsPerSession));
      }
    }

    void loadCardCount();

    return () => {
      mounted = false;
    };
  }, [profile?.cards_per_session]);

  useEffect(() => {
    if (!apiCategoryId) {
      setStatus("error");
      setErrorMessage("Lesson details are missing. Please choose a category again.");
      return;
    }
    if (availableDifficulties.length === 0) {
      setStatus("error");
      setErrorMessage("No difficulty options are available for this category yet.");
      return;
    }
    setStatus("ready");
    setErrorMessage("");
  }, [apiCategoryId, supportedDifficulties]);

  function updateCardCount(direction: 1 | -1) {
    setCardCount((current) => clampCardCount(current + direction * CARD_COUNT_STEP));
  }

  const handleStart = async () => {
    if (!apiCategoryId || selectedDifficulty === null || starting || startLockRef.current) {
      return;
    }

    const profileId = profile?.id ?? session?.user?.id;
    if (!profileId) {
      setErrorMessage("We couldn't find your learner profile. Please sign in again.");
      return;
    }

    startLockRef.current = true;
    setStarting(true);
    setErrorMessage("");

    try {
      const lessonCards = await fetchLessonsByCategory({
        categoryId: apiCategoryId,
        limit: cardCount,
        difficulty: selectedDifficulty,
        shuffle: shuffleEnabled,
      });

      if (lessonCards.length === 0) {
        setStatus("empty");
        setErrorMessage("No flashcards were returned for that difficulty. Try another level.");
        return;
      }

      const mappedCards: Flashcard[] = lessonCards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        sourceText: card.source_text,
        romanization: card.romanization ?? "",
        translation: card.translation,
      }));

      const lessonSession = await createLessonSession(session?.access_token, {
        profile_id: profileId,
        category_id: apiCategoryId,
        difficulty: selectedDifficulty,
        started_at: new Date().toISOString(),
        card_ids: lessonCards.map((card) => String(card.id)),
        current_index: 0,
        status: "in_progress",
        completed: false,
      });

      await setCurrentCards(topic, mappedCards);

      posthog?.capture("lesson_started", {
        language: languageLabel,
        topic: topicTitle ?? topic,
        difficulty: selectedDifficulty,
        card_count: mappedCards.length,
        requested_card_count: cardCount,
        shuffle: shuffleEnabled,
      });

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
          difficulty: String(selectedDifficulty),
          lessonSessionId: lessonSession.session_id,
          activityId: lessonSession.activity_id ?? lessonSession.session_id,
        },
      });
    } catch (error) {
      console.error("Failed to prepare lesson", error);
      posthog?.capture("lesson_ready_start_failed", buildErrorProperties(error, {
        category_id: apiCategoryId,
        difficulty: selectedDifficulty,
        requested_card_count: cardCount,
        topic,
      }));
      setStatus("error");
      setErrorMessage("We couldn't start the lesson right now. Please try again.");
    } finally {
      setStarting(false);
      startLockRef.current = false;
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-2 max-w-md w-full mx-auto flex-row items-center justify-between">
        <Pressable
          onPress={() =>
            router.replace({
              pathname: "/categories",
              params: {
                language,
                languageLabel,
                apiLanguageId: apiLanguageId ?? "",
                apiLoaded: apiLoaded ?? "",
                supportedDifficulties: supportedDifficulties ?? "",
              },
            })
          }
          className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </Pressable>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, padding: 14 }}
      >
        <View className="w-full max-w-md mx-auto flex-1 justify-center py-2">
          <View
            className="bg-card rounded-3xl px-6 pt-5 pb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 14,
              elevation: 2,
            }}
          >
            <View className="items-center">
              <View className="w-14 h-14 bg-accent rounded-full items-center justify-center mb-4">
                {starting ? (
                  <ActivityIndicator size="large" color="#E86A4A" />
                ) : (
                  <Ionicons name="headset" size={30} color="#E86A4A" />
                )}
              </View>

              <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
                {topicTitle ?? topic}
              </Text>

              <View className="flex-row items-center justify-center gap-2">
                <View className="h-8 px-3 rounded-full bg-background border border-border flex-row items-center">
                  <LanguageFlag name={languageLabel ?? language ?? "Language"} size="sm" />
                  <Text className="ml-2 text-sm font-semibold text-foreground">
                    {languageLabel ?? "Language"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShuffleEnabled((current) => !current)}
                  disabled={starting}
                  className={`w-8 h-8 rounded-full border items-center justify-center ${
                    shuffleEnabled ? "bg-primary border-primary" : "bg-background border-border"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={shuffleEnabled ? "Disable shuffle" : "Enable shuffle"}
                >
                  <Ionicons
                    name="shuffle"
                    size={15}
                    color={shuffleEnabled ? "#FFFFFF" : "#2F1E19"}
                  />
                </Pressable>
              </View>
            </View>

            <View className="h-px bg-border mt-6 mb-5" />

            <View className="items-center">
              <Text className="text-base font-medium text-muted mb-3">Difficulty</Text>
              <View className="flex-row justify-center gap-3">
                {availableDifficulties.map((value) => {
                  const selected = selectedDifficulty === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setSelectedDifficulty(value);
                        setStatus("ready");
                        setErrorMessage("");
                      }}
                      className={`w-11 h-11 rounded-full border items-center justify-center ${
                        selected ? "bg-accent border-primary" : "bg-background border-border"
                      }`}
                      disabled={starting || availableDifficulties.length === 0}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          selected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="h-px bg-border mt-5 mb-4" />

            <View className="flex-row items-center justify-center">
              <Text className="text-base font-medium text-foreground mr-4">Cards</Text>
              <View className="flex-row items-center">
                <Text className="w-9 text-center text-xl font-semibold text-foreground">
                  {cardCount}
                </Text>
                <View className="ml-1.5 rounded-xl border border-border bg-background overflow-hidden">
                  <Pressable
                    onPress={() => updateCardCount(1)}
                    disabled={starting || cardCount >= MAX_CARD_COUNT}
                    className="w-8 h-7 items-center justify-center"
                    style={{ opacity: cardCount >= MAX_CARD_COUNT ? 0.4 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={16} color="#2F1E19" />
                  </Pressable>
                  <View className="h-px bg-border" />
                  <Pressable
                    onPress={() => updateCardCount(-1)}
                    disabled={starting || cardCount <= MIN_CARD_COUNT}
                    className="w-8 h-7 items-center justify-center"
                    style={{ opacity: cardCount <= MIN_CARD_COUNT ? 0.4 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={16} color="#2F1E19" />
                  </Pressable>
                </View>
              </View>
            </View>

            {errorMessage ? (
              <Text
                className={`mt-5 text-center text-sm ${
                  status === "error" ? "text-primary" : "text-muted"
                }`}
              >
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              onPress={handleStart}
              disabled={!canStart}
              className={`mt-7 w-full py-4 rounded-2xl flex-row items-center justify-center ${
                canStart ? "bg-primary" : "bg-secondary"
              }`}
              style={
                canStart
                  ? {
                      shadowColor: "#E86A4A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 10,
                      elevation: 4,
                    }
                  : undefined
              }
            >
              {starting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text
                    className={`text-base font-semibold ${
                      canStart ? "text-primary-foreground" : "text-muted"
                    }`}
                  >
                    Start Practice
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={canStart ? "#FFFFFF" : "#8B6E66"}
                    style={{ marginLeft: 10 }}
                  />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
