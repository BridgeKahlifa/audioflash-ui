import { useEffect, useState, useRef, type ElementRef } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Flashcard, FlashcardDisplayMode } from "../../lib/types";
import { getCurrentCards, getLessonDisplayMode } from "../../lib/storage";
import { speakText } from "../../lib/audio";
import { useAuth } from "../../lib/auth-context";
import { fetchLessonSession, fetchLessonSessionFlashcards } from "../../lib/api";
import { useAnalytics } from "../../lib/analytics";
import { useSessionManager } from "../../lib/use-session-manager";
import {
  DEFAULT_FLASHCARD_DISPLAY_MODE,
  normalizeFlashcardDisplayMode,
} from "../../lib/flashcard-display-mode";

export default function FlashcardPractice() {
  const insets = useSafeAreaInsets();
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
    displayMode: displayModeParam,
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
    displayMode?: string;
  }>();

  const { session } = useAuth();
  const posthog = useAnalytics();

  // ── Card state ─────────────────────────────────────────────────────────────
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canRevealAnswer, setCanRevealAnswer] = useState(false);
  const [displayMode, setDisplayMode] = useState<FlashcardDisplayMode>(
    DEFAULT_FLASHCARD_DISPLAY_MODE,
  );
  const [displayModeResolved, setDisplayModeResolved] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [resolvedActivityId, setResolvedActivityId] = useState<string | null>(activityId ?? null);
  const [resolvedDifficulty, setResolvedDifficulty] = useState<number | null>(
    difficulty != null ? Number(difficulty) : null,
  );
  const [resumeCardsSeen, setResumeCardsSeen] = useState(0);
  const [resumeCardsCorrect, setResumeCardsCorrect] = useState(0);
  const shownAtRef = useRef(Date.now());
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAt = useRef(Date.now());
  const sliderRef = useRef<ElementRef<typeof View>>(null);
  const sliderPageXRef = useRef(0);
  const sliderMeasuredWidthRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const isResumeSession = resumeSession === "true";
  const isTraditionalMode = displayMode === "traditional";
  const initialResumeIndex = Number(initialCurrentIndex ?? 0);
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  // ── Session manager (all API orchestration) ────────────────────────────────
  const { submitting, submittingResult, attemptError, results, handleResult } = useSessionManager({
    cards,
    currentIndex,
    resolvedActivityId,
    categoryId: apiCategoryId,
    difficulty: resolvedDifficulty,
    displayMode,
    selectedConfidence,
    audioPlayCount,
    shownAtRef,
    sessionStartedAt,
    isResumeSession,
    resumeCardsSeen,
    resumeCardsCorrect,
    lessonSessionId,
    reviewId,
    topic,
    topicTitle,
    language,
    languageLabel,
  });

  // ── Load cards ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCards() {
      if (isResumeSession && lessonSessionId && session?.access_token) {
        try {
          const [lessonSession, sessionFlashcards] = await Promise.all([
            fetchLessonSession(session.access_token, lessonSessionId),
            fetchLessonSessionFlashcards(session.access_token, lessonSessionId),
          ]);
          const resolvedDisplayMode = normalizeFlashcardDisplayMode(
            lessonSession.session_mode ??
              displayModeParam ??
              (await getLessonDisplayMode(lessonSessionId)) ??
              DEFAULT_FLASHCARD_DISPLAY_MODE,
          );
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

          setDisplayMode(resolvedDisplayMode);
          setDisplayModeResolved(true);
          setCards(mappedCards);
          setResolvedActivityId(lessonSession.activity_id ?? lessonSession.session_id);
          setResumeCardsSeen(lessonSession.cards_seen ?? lessonSession.current_index ?? 0);
          setResumeCardsCorrect(lessonSession.cards_correct ?? 0);
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
            language: languageLabel ?? null,
            card_count: mappedCards.length,
            topic: topicTitle ?? topic,
            is_review: Boolean(reviewId),
            display_mode: resolvedDisplayMode,
            resumed: true,
            lesson_status: lessonSession.status ?? lessonStatus ?? null,
            current_index: lessonSession.current_index ?? initialResumeIndex,
          });
        } catch {
          setDisplayModeResolved(true);
          setCards([]);
        }
        return;
      }

      const resolvedDisplayMode = normalizeFlashcardDisplayMode(
        displayModeParam ??
          (lessonSessionId ? (await getLessonDisplayMode(lessonSessionId)) : null) ??
          DEFAULT_FLASHCARD_DISPLAY_MODE,
      );

      setDisplayMode(resolvedDisplayMode);
      setDisplayModeResolved(true);

      const stored = await getCurrentCards(topic);
      if (stored && stored.length > 0) {
        setCards(stored);
        setResolvedActivityId(activityId ?? null);
        setResumeCardsSeen(0);
        setResumeCardsCorrect(0);
        setResolvedDifficulty(difficulty != null ? Number(difficulty) : null);
        setCurrentIndex(0);
        posthog?.capture("session_started", {
          language: languageLabel ?? null,
          card_count: stored.length,
          topic: topicTitle ?? topic,
          is_review: Boolean(reviewId),
          display_mode: resolvedDisplayMode,
        });
      } else {
        setCards([]);
      }
    }
    void loadCards();
  }, [
    activityId,
    difficulty,
    displayModeParam,
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
    if (!displayModeResolved) {
      return;
    }

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
    if (!card?.sourceText || existingResult) {
      return;
    }

    if (isTraditionalMode) {
      setCanRevealAnswer(true);
      return;
    }

    revealTimerRef.current = setTimeout(() => {
      setCanRevealAnswer(true);
      revealTimerRef.current = null;
    }, 1500);
    speakText(card.sourceText, language ?? "chinese", playbackSpeed);
  // `results` is a dep because we read results[currentIndex] to restore state
  // when the user navigates back to a card they already answered.
  }, [currentIndex, cards, displayModeResolved, isTraditionalMode, results]);

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

  function updatePlaybackSpeedFromPosition(position: number, usableWidth: number) {
    if (usableWidth <= 0) return;
    const clampedPosition = Math.min(usableWidth, Math.max(0, position));
    const ratio = clampedPosition / usableWidth;
    const rawValue = minPlaybackSpeed + ratio * (maxPlaybackSpeed - minPlaybackSpeed);
    setPlaybackSpeed(rawValue);
  }

  function updatePlaybackSpeedFromPageX(
    pageX: number,
    measuredPageX = sliderPageXRef.current,
    measuredWidth = sliderMeasuredWidthRef.current,
  ) {
    const usableWidth = Math.max(measuredWidth - sliderThumbSize, 0);
    updatePlaybackSpeedFromPosition(pageX - measuredPageX - sliderThumbSize / 2, usableWidth);
  }

  function measureSlider(pageX?: number) {
    sliderRef.current?.measureInWindow((x, _y, width) => {
      sliderPageXRef.current = x;
      sliderMeasuredWidthRef.current = width;
      if (width > 0) setSliderWidth(width);
      if (typeof pageX === "number") {
        updatePlaybackSpeedFromPageX(pageX, x, width);
      }
    });
  }

  function handleSliderLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    sliderMeasuredWidthRef.current = width;
    setSliderWidth(width);
    requestAnimationFrame(() => measureSlider());
  }

  // ── Slider gestures ────────────────────────────────────────────────────────
  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event, gestureState) => {
        const pageX = event.nativeEvent.pageX || gestureState.x0;
        measureSlider(pageX);
        updatePlaybackSpeedFromPageX(pageX);
      },
      onPanResponderMove: (_, gestureState) => {
        updatePlaybackSpeedFromPageX(gestureState.moveX);
      },
    })
  ).current;

  const previousCardPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      currentIndex > 0 &&
      !submitting &&
      gestureState.dx > 35 &&
      Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25,
    onPanResponderGrant: () => {
      translateX.stopAnimation();
    },
    onPanResponderMove: (_, gestureState) => {
      translateX.setValue(Math.max(0, gestureState.dx));
    },
    onPanResponderRelease: (_, gestureState) => {
      if (
        currentIndex > 0 &&
        !submitting &&
        gestureState.dx > 80 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.25
      ) {
        Animated.timing(translateX, {
          toValue: 420,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          goPrev();
        });
        return;
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  function goPrev() {
    if (currentIndex > 0 && !submitting) {
      setCurrentIndex((i) => i - 1);
      setShowAnswer(false);
    }
  }

  async function onResult(knew: boolean) {
    const outcome = await handleResult(knew);
    if (!outcome || outcome.isComplete) return;
    setCurrentIndex(outcome.nextIndex);
    setShowAnswer(false);
  }

  function revealAnswer() {
    if (!canRevealAnswer || submitting) {
      return;
    }
    setShowAnswer(true);
  }

  function playCurrentCardAudio() {
    setAudioPlayCount((count) => count + 1);
    speakText(currentCard.sourceText, language ?? "chinese", playbackSpeed);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!displayModeResolved || cards.length === 0 || !currentCard) {
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
          <Animated.View
            {...previousCardPanResponder.panHandlers}
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
            {!showAnswer ? (
              isTraditionalMode ? (
                <Pressable
                  onPress={revealAnswer}
                  disabled={!canRevealAnswer || submitting}
                  className="w-full flex-1 items-center justify-center"
                  style={{ opacity: canRevealAnswer ? 1 : 0.7 }}
                >
                  <Text className="text-xs font-semibold text-muted tracking-wide uppercase mb-4">
                    Your Language
                  </Text>
                  <Text
                    className="text-4xl text-foreground text-center"
                    style={{ alignSelf: "stretch" }}
                  >
                    {currentCard.translation}
                  </Text>
                  <Text className="text-sm text-muted text-center mt-6">
                    Tap the card or press Reveal Answer
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={playCurrentCardAudio}
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

                  <View className="mt-4 w-full px-3">
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-sm text-muted">Slow</Text>
                      <Text className="text-sm font-semibold text-primary">
                        {playbackSpeed.toFixed(1)}x
                      </Text>
                      <Text className="text-sm text-muted">Normal</Text>
                    </View>
                    <View
                      ref={sliderRef}
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
                </>
              )
            ) : null}

            {showAnswer && (
              <View className="mt-8 items-center" style={{ alignSelf: "stretch" }}>
                {isTraditionalMode ? (
                  <Pressable
                    onPress={playCurrentCardAudio}
                    hitSlop={10}
                    className="mb-6 w-16 h-16 bg-primary rounded-full items-center justify-center"
                    style={{
                      alignSelf: "center",
                      shadowColor: "#FF6B4A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Ionicons name="volume-high" size={28} color="#FFFFFF" />
                  </Pressable>
                ) : null}
                <Text className="text-4xl text-foreground text-center mb-3" style={{ alignSelf: "stretch" }}>
                  {currentCard.sourceText}
                </Text>
                {currentCard.romanization ? (
                  <Text className="text-xl text-muted text-center mb-6" style={{ alignSelf: "stretch" }}>
                    {currentCard.romanization}
                  </Text>
                ) : null}
                <Text className="text-xl text-foreground text-center" style={{ alignSelf: "stretch" }}>
                  {currentCard.translation}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Actions */}
        <View className="px-4 gap-3" style={{ paddingBottom: actionBarPaddingBottom }}>
          {shouldShowRevealButton ? (
            <Pressable
              onPress={revealAnswer}
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

        </View>
      </View>
    </SafeAreaView>
  );
}
