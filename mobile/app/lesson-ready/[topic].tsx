import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { setCurrentCards, getSettings, setLessonDisplayMode } from "../../lib/storage";
import { Flashcard, FlashcardDisplayMode } from "../../lib/types";
import { createLessonSession, fetchLessonsByCategory } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { buildErrorProperties, useAnalytics } from "../../lib/analytics";
import { LanguageFlag } from "../../components/LanguageFlag";
import { useCategories } from "../../lib/queries";
import { DEFAULT_FLASHCARD_DISPLAY_MODE } from "../../lib/flashcard-display-mode";
import { useAppTheme } from "../../lib/theme-context";
import {
  DEFAULT_TRADITIONAL_FLASHCARD_FRONT,
  type TraditionalFlashcardFront,
} from "../../lib/traditional-flashcard-front";
import { setLessonTraditionalFlashcardFront } from "../../lib/lesson-card-preferences";

const DEFAULT_CARD_COUNT = 5;
const MIN_CARD_COUNT = 5;
const MAX_CARD_COUNT = 50;
const CARD_COUNT_STEP = 5;

function resolveAvailableCardCount(value?: string) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function resolveCardCountBounds(availableCardCount: number | null) {
  if (availableCardCount === null) {
    return { min: MIN_CARD_COUNT, max: MAX_CARD_COUNT };
  }

  const max = Math.min(MAX_CARD_COUNT, availableCardCount);
  const min = max < MIN_CARD_COUNT ? max : MIN_CARD_COUNT;
  return { min, max };
}

function clampCardCount(value: number, availableCardCount: number | null) {
  const { min, max } = resolveCardCountBounds(availableCardCount);
  return Math.min(max, Math.max(min, value));
}

export default function LessonReady() {
  const { profile, session } = useAuth();
  const posthog = useAnalytics();
  const { matrixMode } = useAppTheme();
  const { data: categories = [] } = useCategories();
  const {
    topic,
    topicTitle,
    language,
    languageLabel,
    apiLanguageId,
    apiCategoryId,
    apiLoaded,
    supportedDifficulties,
    availableCardCount: availableCardCountParam,
  } =
    useLocalSearchParams<{
      topic: string;
      topicTitle: string;
      language?: string;
      languageLabel?: string;
      apiLanguageId?: string;
      apiCategoryId?: string;
      apiLoaded?: string;
      supportedDifficulties?: string;
      availableCardCount?: string;
    }>();

  const [status, setStatus] = useState<"ready" | "empty" | "error">("ready");
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [displayMode, setDisplayMode] = useState<FlashcardDisplayMode>(
    DEFAULT_FLASHCARD_DISPLAY_MODE,
  );
  const displayModeInitializedRef = useRef(false);
  const [traditionalFront, setTraditionalFront] = useState<TraditionalFlashcardFront>(
    DEFAULT_TRADITIONAL_FLASHCARD_FRONT,
  );
  const [cardCount, setCardCount] = useState(profile?.cards_per_session ?? DEFAULT_CARD_COUNT);
  const startLockRef = useRef(false);
  const routeAvailableCardCount = resolveAvailableCardCount(availableCardCountParam);
  const categoryAvailableCardCount = categories.find(
    (category) => String(category.id) === String(apiCategoryId),
  )?.total_cards;
  const availableCardCount =
    routeAvailableCardCount ??
    (typeof categoryAvailableCardCount === "number" ? categoryAvailableCardCount : null);
  const { min: minCardCount, max: maxCardCount } = resolveCardCountBounds(availableCardCount);
  const availableDifficulties = (supportedDifficulties ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter((value, index, values) => Number.isFinite(value) && !values.slice(0, index).includes(value))
    .sort((a, b) => a - b);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(
    availableDifficulties[0] ?? null
  );
  const canStart =
    Boolean(apiCategoryId) &&
    selectedDifficulty !== null &&
    !starting &&
    maxCardCount > 0;
  const backButtonPalette = matrixMode
    ? {
        background: "#202020",
        icon: "#ff8c42",
      }
    : {
        background: "#FBE7DE",
        icon: "#1A1A1A",
      };

  useEffect(() => {
    setSelectedDifficulty(availableDifficulties[0] ?? null);
  }, [supportedDifficulties]);

  useEffect(() => {
    if (displayModeInitializedRef.current) return;
    displayModeInitializedRef.current = true;
    getSettings().then((s) => {
      if (s.defaultDisplayMode) setDisplayMode(s.defaultDisplayMode);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCardCount() {
      if (typeof profile?.cards_per_session === "number") {
        setCardCount(clampCardCount(profile.cards_per_session, availableCardCount));
        return;
      }

      const settings = await getSettings();
      if (mounted) {
        setCardCount(clampCardCount(settings.cardsPerSession, availableCardCount));
      }
    }

    void loadCardCount();

    return () => {
      mounted = false;
    };
  }, [availableCardCount, profile?.cards_per_session]);

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
    if (availableCardCount === 0) {
      setStatus("empty");
      setErrorMessage("No flashcards are available for this category yet.");
      return;
    }
    setStatus("ready");
    setErrorMessage("");
  }, [apiCategoryId, availableCardCount, supportedDifficulties]);

  function updateCardCount(direction: 1 | -1) {
    setCardCount((current) => clampCardCount(current + direction * CARD_COUNT_STEP, availableCardCount));
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/(tabs)/categories",
      params: {
        language,
        languageLabel,
        apiLanguageId: apiLanguageId ?? "",
        apiLoaded: apiLoaded ?? "",
        supportedDifficulties: supportedDifficulties ?? "",
        availableCardCount: availableCardCountParam ?? "",
      },
    });
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
      const requestedAvailableCardCount =
        typeof availableCardCount === "number" && Number.isFinite(availableCardCount)
          ? availableCardCount
          : cardCount;
      const requestedCardLimit = Math.max(
        MIN_CARD_COUNT,
        Math.min(cardCount, requestedAvailableCardCount),
      );

      const lessonCards = await fetchLessonsByCategory({
        token: session?.access_token ?? null,
        categoryId: apiCategoryId,
        languageId: apiLanguageId ?? undefined,
        limit: requestedCardLimit,
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
        display_mode: displayMode,
        started_at: new Date().toISOString(),
        card_ids: lessonCards.map((card) => String(card.id)),
        current_index: 0,
        status: "in_progress",
        completed: false,
      });

      await Promise.all([
        setCurrentCards(topic, mappedCards),
        setLessonDisplayMode(lessonSession.session_id, displayMode),
        setLessonTraditionalFlashcardFront(lessonSession.session_id, traditionalFront),
      ]);

      posthog?.capture("lesson_started", {
        language: languageLabel ?? language ?? null,
        topic: topicTitle ?? topic,
        difficulty: selectedDifficulty,
        card_count: mappedCards.length,
        requested_card_count: cardCount,
        shuffle: shuffleEnabled,
        display_mode: displayMode,
        traditional_front: traditionalFront,
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
          displayMode,
          traditionalFront,
        },
      });
    } catch (error) {
      console.error("Failed to prepare lesson", error);
      posthog?.capture(
        "lesson_ready_start_failed",
        buildErrorProperties(error, {
          category_id: apiCategoryId ?? null,
          difficulty: selectedDifficulty,
          requested_card_count: cardCount,
          topic,
          display_mode: displayMode,
          traditional_front: traditionalFront,
        }) as Record<string, string | number | boolean | null>,
      );
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
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: backButtonPalette.background }}
        >
          <Ionicons name="chevron-back" size={22} color={backButtonPalette.icon} />
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

            <View>
              <Text className="text-base font-medium text-muted mb-3 text-center">Card Style</Text>
              <View className="gap-3">
                <Pressable
                  onPress={() => setDisplayMode(DEFAULT_FLASHCARD_DISPLAY_MODE)}
                  disabled={starting}
                  className={`rounded-2xl border px-4 py-4 flex-row items-center gap-3 ${
                    displayMode === DEFAULT_FLASHCARD_DISPLAY_MODE
                      ? "bg-accent border-primary"
                      : "bg-background border-border"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Select audio-only flashcards"
                >
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      displayMode === DEFAULT_FLASHCARD_DISPLAY_MODE
                        ? "bg-primary border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    {displayMode === DEFAULT_FLASHCARD_DISPLAY_MODE ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Audio only
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      Hear the target-language audio first, then reveal the written answer.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setDisplayMode("traditional")}
                  disabled={starting}
                  className={`rounded-2xl border px-4 py-4 flex-row items-center gap-3 ${
                    displayMode === "traditional"
                      ? "bg-accent border-primary"
                      : "bg-background border-border"
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Select traditional flashcards"
                >
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      displayMode === "traditional"
                        ? "bg-primary border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    {displayMode === "traditional" ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Traditional flashcards
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      {traditionalFront === "target"
                        ? "Show your target-language text first, then reveal the translation."
                        : "Show your native-language text first, then reveal the target-language card."}
                    </Text>
                  </View>
                </Pressable>
              </View>
              {displayMode === "traditional" ? (
                <View className="mt-3 rounded-2xl bg-accent/50 px-3 py-3">
                  <Text className="text-xs font-medium uppercase tracking-wide text-muted text-center mb-2">
                    Front Side
                  </Text>
                  <View className="flex-row self-center rounded-full bg-background border border-border p-1">
                    {(["native", "target"] as const).map((value) => {
                      const selected = traditionalFront === value;
                      return (
                        <Pressable
                          key={value}
                          onPress={() => setTraditionalFront(value)}
                          disabled={starting}
                          className="rounded-full px-4 py-2"
                          style={{
                            backgroundColor: selected ? "#E86A4A" : "transparent",
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Show ${value} language first`}
                        >
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: selected ? "#FFFFFF" : "#8B6E66" }}
                          >
                            {value === "native" ? "Native" : "Target"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
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
                    disabled={starting || cardCount >= maxCardCount}
                    className="w-8 h-7 items-center justify-center"
                    style={{ opacity: cardCount >= maxCardCount ? 0.4 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={16} color="#2F1E19" />
                  </Pressable>
                  <View className="h-px bg-border" />
                  <Pressable
                    onPress={() => updateCardCount(-1)}
                    disabled={starting || cardCount <= minCardCount}
                    className="w-8 h-7 items-center justify-center"
                    style={{ opacity: cardCount <= minCardCount ? 0.4 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={16} color="#2F1E19" />
                  </Pressable>
                </View>
              </View>
            </View>

            {availableCardCount !== null ? (
              <Text className="text-center text-xs text-muted mt-2">
                {availableCardCount} cards available in this category
              </Text>
            ) : null}

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
                <Text
                  className={`text-base font-semibold ${
                    canStart ? "text-primary-foreground" : "text-muted"
                  }`}
                >
                  Start Practice
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
