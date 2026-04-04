import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Flashcard } from "../../lib/types";
import { getCurrentCards } from "../../lib/storage";
import { speakText } from "../../lib/audio";
import { useAuth } from "../../lib/auth-context";
import { fetchLessonSession, fetchLessonSessionFlashcards } from "../../lib/api";
import { useAnalytics } from "../../lib/analytics";
import { useSessionManager } from "../../lib/use-session-manager";

export default function FlashcardPractice() {
  const {
    topic,
    topicTitle,
    language,
    languageLabel,
    apiLanguageId,
    apiCategoryId,
    difficulty,
    apiLoaded,
    lessonSessionId,
    activityId,
    reviewId,
    resumeSession,
    initialCurrentIndex,
    lessonStatus,
  } = useLocalSearchParams<{
    topic: string;
    topicTitle?: string;
    language?: string;
    languageLabel?: string;
    apiLanguageId?: string;
    apiCategoryId?: string;
    difficulty?: string;
    apiLoaded?: string;
    lessonSessionId?: string;
    activityId?: string;
    reviewId?: string;
    resumeSession?: string;
    initialCurrentIndex?: string;
    lessonStatus?: string;
  }>();

  const { session } = useAuth();
  const posthog = useAnalytics();

  // ── Card state ─────────────────────────────────────────────────────────────
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canRevealAnswer, setCanRevealAnswer] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [resolvedActivityId, setResolvedActivityId] = useState<string | null>(activityId ?? null);
  const [resolvedDifficulty, setResolvedDifficulty] = useState<number | null>(
    difficulty != null ? Number(difficulty) : null,
  );
  const shownAtRef = useRef(Date.now());
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAt = useRef(Date.now());
  const isResumeSession = resumeSession === "true";
  const initialResumeIndex = Number(initialCurrentIndex ?? 0);

  // ── Session manager (all API orchestration) ────────────────────────────────
  const { submitting, submittingResult, attemptError, results, handleResult } = useSessionManager({
    cards,
    currentIndex,
    resolvedActivityId,
    selectedConfidence,
    audioPlayCount,
    shownAtRef,
    sessionStartedAt,
    isResumeSession,
    lessonSessionId,
    reviewId,
    topic,
    topicTitle,
    language,
    languageLabel,
  });

  // ── Swipe animation ────────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(0)).current;

  // ── Load cards ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCards() {
      if (isResumeSession && lessonSessionId && session?.access_token) {
        try {
          const [lessonSession, sessionFlashcards] = await Promise.all([
            fetchLessonSession(session.access_token, lessonSessionId),
            fetchLessonSessionFlashcards(session.access_token, lessonSessionId),
          ]);
          const flashcardsById = new Map(
            sessionFlashcards.map((card) => [String(card.id), card]),
          );
          const ordered = lessonSession.card_ids
            .map((cardId) => flashcardsById.get(String(cardId)))
            .filter((card): card is (typeof sessionFlashcards)[number] => Boolean(card));
          const mappedCards: Flashcard[] = ordered.map((card, index) => ({
            id: index + 1,
            dbId: String(card.id),
            sourceText: card.source_text,
            romanization: card.romanization ?? "",
            translation: card.translation,
          }));

          setCards(mappedCards);
          setResolvedActivityId(lessonSession.activity_id ?? lessonSession.session_id);
          setResolvedDifficulty(
            typeof lessonSession.difficulty === "number"
              ? lessonSession.difficulty
              : typeof sessionFlashcards[0]?.difficulty === "number"
              ? sessionFlashcards[0].difficulty
              : difficulty != null
                ? Number(difficulty)
                : null,
          );
          setCurrentIndex(
            Math.max(
              0,
              Math.min(
                lessonSession.current_index ?? initialResumeIndex,
                Math.max(mappedCards.length - 1, 0),
              ),
            ),
          );
          posthog?.capture("session_started", {
            language: languageLabel,
            card_count: mappedCards.length,
            topic: topicTitle ?? topic,
            is_review: Boolean(reviewId),
            resumed: true,
            lesson_status: lessonSession.status ?? lessonStatus,
            current_index: lessonSession.current_index ?? initialResumeIndex,
          });
        } catch {
          setCards([]);
        }
        return;
      }

      const stored = await getCurrentCards(topic);
      if (stored && stored.length > 0) {
        setCards(stored);
        setResolvedActivityId(activityId ?? null);
        setResolvedDifficulty(difficulty != null ? Number(difficulty) : null);
        setCurrentIndex(0);
        posthog?.capture("session_started", {
          language: languageLabel,
          card_count: stored.length,
          topic: topicTitle ?? topic,
          is_review: Boolean(reviewId),
        });
      } else {
        setCards([]);
      }
    }
    void loadCards();
  }, [
    activityId,
    difficulty,
    initialResumeIndex,
    isResumeSession,
    languageLabel,
    lessonSessionId,
    lessonStatus,
    reviewId,
    session?.access_token,
    topic,
    topicTitle,
  ]);

  // ── Per-card setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    shownAtRef.current = Date.now();
    setAudioPlayCount(0);

    const existingResult = results[currentIndex];
    // Restore the confidence rating the user already picked for this card (if navigating back).
    setSelectedConfidence(existingResult?.confidenceRating ?? null);
    setCanRevealAnswer(Boolean(existingResult));
    setShowAnswer(Boolean(existingResult));

    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }

    const card = cards[currentIndex];
    if (card?.sourceText && !existingResult) {
      revealTimerRef.current = setTimeout(() => {
        setCanRevealAnswer(true);
        revealTimerRef.current = null;
      }, 1500);
      speakText(card.sourceText, language ?? "chinese", playbackSpeed);
    }
  // `results` is a dep because we read results[currentIndex] to restore state
  // when the user navigates back to a card they already answered.
  }, [currentIndex, cards, results]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // ── Derived display values ─────────────────────────────────────────────────
  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;
  const shouldShowRevealButton = canRevealAnswer && !showAnswer;
  const shouldShowAnswerActions = canRevealAnswer && showAnswer;

  // ── Playback speed slider ──────────────────────────────────────────────────
  const minPlaybackSpeed = 0.5;
  const maxPlaybackSpeed = 1.0;
  const sliderThumbSize = 28;
  const sliderTrackHeight = 3;
  const sliderUsableWidth = Math.max(sliderWidth - sliderThumbSize, 0);
  const sliderPosition =
    sliderUsableWidth > 0
      ? ((playbackSpeed - minPlaybackSpeed) / (maxPlaybackSpeed - minPlaybackSpeed)) * sliderUsableWidth
      : 0;

  function updatePlaybackSpeedFromPosition(position: number) {
    if (sliderUsableWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, position / sliderUsableWidth));
    const rawValue = minPlaybackSpeed + ratio * (maxPlaybackSpeed - minPlaybackSpeed);
    setPlaybackSpeed(Math.round(rawValue * 10) / 10);
  }

  function handleSliderLayout(event: LayoutChangeEvent) {
    setSliderWidth(event.nativeEvent.layout.width);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => translateX.setValue(gs.dx),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -100) {
          Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true })
            .start(() => { translateX.setValue(0); goNext(); });
        } else if (gs.dx > 100) {
          Animated.timing(translateX, { toValue: 400, duration: 200, useNativeDriver: true })
            .start(() => { translateX.setValue(0); goPrev(); });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const sliderPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => updatePlaybackSpeedFromPosition(e.nativeEvent.locationX - sliderThumbSize / 2),
    onPanResponderMove: (e) => updatePlaybackSpeedFromPosition(e.nativeEvent.locationX - sliderThumbSize / 2),
  });

  function goPrev() {
    if (currentIndex > 0 && !submitting) {
      setCurrentIndex((i) => i - 1);
      setShowAnswer(false);
    }
  }

  function goNext() {
    if (currentIndex < cards.length - 1 && !submitting) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
    }
  }

  async function onResult(knew: boolean) {
    const outcome = await handleResult(knew);
    if (!outcome || outcome.isComplete) return;
    setCurrentIndex(outcome.nextIndex);
    setShowAnswer(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (cards.length === 0 || !currentCard) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center max-w-md w-full mx-auto">
          <Text className="text-muted">Loading cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-2">
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/categories",
                params: {
                  language,
                  languageLabel,
                  apiLanguageId: apiLanguageId ?? "",
                  apiCategoryId: apiCategoryId ?? "",
                  apiLoaded: apiLoaded ?? "",
                },
              })
            }
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>
          <View className="w-10 h-10" />
        </View>
        <Text className="text-sm text-muted text-center mb-2">
          {currentIndex + 1} / {cards.length}
        </Text>

        {/* Progress bar */}
        <View className="mx-4 mb-4 h-1.5 bg-secondary rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full" style={{ width: `${progress * 100}%` }} />
        </View>

        {/* Card */}
        <View className="flex-1 px-4 pb-4">
          <Pressable
            onPress={goPrev}
            disabled={currentIndex === 0 || submitting}
            className="absolute left-4 top-4 z-10 w-11 h-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: currentIndex === 0 || submitting ? "#F5F5F5" : "#FFFFFF",
              opacity: currentIndex === 0 || submitting ? 0.9 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: currentIndex === 0 || submitting ? 0.04 : 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={currentIndex === 0 || submitting ? "#B8B8B8" : "#1A1A1A"}
            />
          </Pressable>

          <Animated.View
            {...panResponder.panHandlers}
            className="bg-card rounded-3xl"
            style={{
              transform: [{ translateX }],
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <Pressable
              onPress={() => {
                setAudioPlayCount((c) => c + 1);
                speakText(currentCard.sourceText, language ?? "chinese", playbackSpeed);
              }}
              hitSlop={10}
              className="w-20 h-20 bg-primary rounded-full items-center justify-center"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="volume-high" size={36} color="#FFFFFF" />
            </Pressable>

            {!showAnswer ? (
              <View className="mt-4 w-full px-3">
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Slow</Text>
                  <Text className="text-sm font-semibold text-primary">{playbackSpeed.toFixed(1)}x</Text>
                  <Text className="text-sm text-muted">Normal</Text>
                </View>
                <View
                  onLayout={handleSliderLayout}
                  className="justify-center"
                  style={{ height: sliderThumbSize }}
                  {...sliderPanResponder.panHandlers}
                >
                  <View
                    className="rounded-full bg-primary"
                    style={{ height: sliderTrackHeight, marginHorizontal: sliderThumbSize / 2 }}
                  />
                  <View
                    className="absolute rounded-full bg-primary"
                    style={{
                      width: sliderThumbSize,
                      height: sliderThumbSize,
                      left: sliderPosition,
                      shadowColor: "#FF6B4A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  />
                </View>
              </View>
            ) : null}

            {showAnswer && (
              <View className="mt-8 items-center" style={{ alignSelf: "stretch" }}>
                <Text className="text-4xl text-foreground text-center mb-3" style={{ alignSelf: "stretch" }}>
                  {currentCard.sourceText}
                </Text>
                <Text className="text-xl text-muted text-center mb-6" style={{ alignSelf: "stretch" }}>
                  {currentCard.romanization}
                </Text>
                <Text className="text-xl text-foreground text-center" style={{ alignSelf: "stretch" }}>
                  {currentCard.translation}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Actions */}
        <View className="px-4 pb-6 gap-3">
          {shouldShowRevealButton ? (
            <Pressable
              onPress={() => setShowAnswer(true)}
              className="py-4 bg-secondary rounded-2xl items-center"
              disabled={submitting}
            >
              <Text className="text-base font-medium text-muted">Reveal Answer</Text>
            </Pressable>
          ) : null}

          {shouldShowAnswerActions ? (
            <>
              <View className="items-center gap-3">
                <Text className="text-sm font-medium text-muted">How confident were you?</Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = selectedConfidence === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setSelectedConfidence(value)}
                        className={`w-11 h-11 rounded-full items-center justify-center border ${
                          selected ? "bg-primary border-primary" : "bg-secondary border-border"
                        }`}
                        disabled={submitting}
                      >
                        <Text className={`font-semibold ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => void onResult(false)}
                  disabled={submitting}
                  className="flex-1 py-4 bg-secondary rounded-2xl items-center"
                >
                  <Text className="text-base font-medium text-foreground">
                    {submittingResult === "didnt-know" ? "Saving..." : "Didn't Know"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onResult(true)}
                  disabled={submitting}
                  className="flex-1 py-4 bg-primary rounded-2xl items-center"
                  style={{
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text className="text-base font-semibold text-primary-foreground">
                    {submittingResult === "knew" ? "Saving..." : "I Knew It"}
                  </Text>
                </Pressable>
              </View>
              {attemptError ? (
                <Text className="text-center text-sm text-red-500">{attemptError}</Text>
              ) : null}
            </>
          ) : null}

          <Text className="text-center text-xs text-muted">Swipe left or right to navigate</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
