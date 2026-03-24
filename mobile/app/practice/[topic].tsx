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
import { Flashcard, SessionCardResult } from "../../lib/types";
import { getCurrentCards } from "../../lib/storage";
import { saveCompletedSession } from "../../lib/storage";
import { speakText } from "../../lib/audio";
import { useAuth } from "../../lib/auth-context";
import {
  createFlashcardAttempt,
  createSession,
  endLesson,
  fetchSessions,
  fetchSessionStats,
} from "../../lib/api";
import { setCachedSessions, setCachedSessionStats } from "../../lib/storage";

export default function FlashcardPractice() {
  const {
    topic,
    topicTitle,
    language,
    languageLabel,
    apiLanguageId,
    apiCategoryId,
    apiLoaded,
    lessonSessionId,
  } = useLocalSearchParams<{
    topic: string;
    topicTitle?: string;
    language?: string;
    languageLabel?: string;
    apiLanguageId?: string;
    apiCategoryId?: string;
    apiLoaded?: string;
    lessonSessionId?: string;
  }>();
  const { profile, session } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canRevealAnswer, setCanRevealAnswer] = useState(false);
  const [results, setResults] = useState<SessionCardResult[]>([]);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [submitting, setSubmitting] = useState(false);
  const [submittingResult, setSubmittingResult] = useState<"knew" | "didnt-know" | null>(null);
  const [attemptError, setAttemptError] = useState("");
  const [sliderWidth, setSliderWidth] = useState(0);
  const shownAtRef = useRef(Date.now());
  const submitLockRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadCards() {
      const stored = await getCurrentCards(topic);
      setCards(stored ?? []);
    }
    loadCards();
  }, [topic]);

  useEffect(() => {
    shownAtRef.current = Date.now();
    setAudioPlayCount(0);
    setSelectedConfidence(null);
    setAttemptError("");
    setSubmittingResult(null);
    setCanRevealAnswer(false);

    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;
  const shouldShowRevealButton = canRevealAnswer && !showAnswer;
  const shouldShowAnswerActions = canRevealAnswer && showAnswer;
  const shouldPersistAttempts = Boolean(lessonSessionId && currentCard?.dbId);
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
    const steppedValue = Math.round(rawValue * 10) / 10;
    setPlaybackSpeed(Math.min(maxPlaybackSpeed, Math.max(minPlaybackSpeed, steppedValue)));
  }

  function handleSliderLayout(event: LayoutChangeEvent) {
    setSliderWidth(event.nativeEvent.layout.width);
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -100) {
          // Swipe left → next
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            goNext();
          });
        } else if (gs.dx > 100) {
          // Swipe right → previous
          Animated.timing(translateX, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            goPrev();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const sliderPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      updatePlaybackSpeedFromPosition(event.nativeEvent.locationX - sliderThumbSize / 2);
    },
    onPanResponderMove: (event) => {
      updatePlaybackSpeedFromPosition(event.nativeEvent.locationX - sliderThumbSize / 2);
    },
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

  async function handleResult(knew: boolean) {
    if (!currentCard || submitting || submitLockRef.current) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmittingResult(knew ? "knew" : "didnt-know");
    setAttemptError("");
    const responseTimeMs = Math.max(0, Date.now() - shownAtRef.current);

    if (shouldPersistAttempts) {
      try {
        await createFlashcardAttempt(session?.access_token, {
          session_id: lessonSessionId!,
          flashcard_id: currentCard.dbId!,
          correct: knew,
          response_time_ms: responseTimeMs,
          audio_play_count: audioPlayCount,
          hint_used: false,
          confidence_rating: selectedConfidence,
        });
      } catch (error) {
        console.error("Failed to record flashcard attempt", error);
        setAttemptError("We couldn't save that answer. Please check your connection and try again.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return;
      }
    }

    const newResults = [
      ...results,
      {
        cardId: currentCard.id,
        chinese: currentCard.chinese,
        pinyin: currentCard.pinyin,
        english: currentCard.english,
        knew,
        confidenceRating: selectedConfidence,
      },
    ];
    setResults(newResults);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
      setSubmitting(false);
      setSubmittingResult(null);
      submitLockRef.current = false;
    } else {
      const correct = newResults.filter((r) => r.knew).length;

      if (shouldPersistAttempts) {
        const profileId = profile?.id ?? session?.user?.id;
        if (!profileId || !lessonSessionId) {
          setAttemptError("We couldn't finish this lesson because the lesson session is missing.");
          setSubmitting(false);
          setSubmittingResult(null);
          submitLockRef.current = false;
          return;
        }

        try {
          await endLesson(session?.access_token, {
            profile_id: profileId,
            session_id: lessonSessionId,
          });
        } catch (error) {
          console.error("Failed to end lesson session", error);
          setAttemptError("We couldn't finish the lesson right now. Please try again.");
          setSubmitting(false);
          setSubmittingResult(null);
          submitLockRef.current = false;
          return;
        }
      }

      await saveCompletedSession({
        topic,
        topicTitle: topicTitle ?? topic,
        language: language ?? "",
        languageLabel: languageLabel ?? "",
        cards: newResults,
      });

      // Sync to API in the background — don't block navigation
      if (shouldPersistAttempts && session?.access_token) {
        const token = session.access_token;
        Promise.all([
          createSession(token, {
            topic_title: topicTitle ?? topic,
            language_label: languageLabel,
            cards_attempted: newResults.length,
            cards_correct: correct,
            completed_at: new Date().toISOString(),
          }),
          fetchSessions(token),
          fetchSessionStats(token),
        ]).then(([, freshSessions, freshStats]) => {
          setCachedSessions(freshSessions);
          setCachedSessionStats(freshStats);
        }).catch(() => {
          // Non-critical — local storage still has the data
        });
      }

      setSubmitting(false);
      setSubmittingResult(null);
      submitLockRef.current = false;
      router.replace("/session-summary");
    }
  }

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
                  language: language,
                  languageLabel: languageLabel,
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
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        {/* Card */}
        <View className="flex-1 px-4 pb-4">
          <Animated.View
            {...panResponder.panHandlers}
            className="bg-card rounded-3xl p-8"
            style={{
              transform: [{ translateX }],
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <Pressable
              onPress={() => {
                setAudioPlayCount((count) => count + 1);
                if (!canRevealAnswer && !revealTimerRef.current) {
                  revealTimerRef.current = setTimeout(() => {
                    setCanRevealAnswer(true);
                    revealTimerRef.current = null;
                  }, 1000);
                }
                speakText(currentCard.chinese, language ?? "chinese", playbackSpeed);
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
                  <Text className="text-sm font-semibold text-primary">
                    {playbackSpeed.toFixed(1)}x
                  </Text>
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
                    style={{
                      height: sliderTrackHeight,
                      marginHorizontal: sliderThumbSize / 2,
                    }}
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
              <View className="mt-8 items-center">
                <Text className="text-4xl text-foreground text-center mb-3">
                  {currentCard.chinese}
                </Text>
                <Text className="text-xl text-muted text-center mb-6">
                  {currentCard.pinyin}
                </Text>
                <Text className="text-xl text-foreground text-center">
                  {currentCard.english}
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
              <Text className="text-base font-medium text-muted">
                Reveal Answer
              </Text>
            </Pressable>
          ) : null}
          {shouldShowAnswerActions ? (
            <>
              <View className="items-center gap-3">
                <Text className="text-sm font-medium text-muted">
                  How confident were you?
                </Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = selectedConfidence === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setSelectedConfidence(value)}
                        className={`w-11 h-11 rounded-full items-center justify-center border ${
                          selected
                            ? "bg-primary border-primary"
                            : "bg-secondary border-border"
                        }`}
                        disabled={submitting}
                      >
                        <Text
                          className={`font-semibold ${
                            selected ? "text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleResult(false)}
                  disabled={submitting}
                  className="flex-1 py-4 bg-secondary rounded-2xl items-center"
                >
                  <Text className="text-base font-medium text-foreground">
                    {submittingResult === "didnt-know" ? "Saving..." : "Didn't Know"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleResult(true)}
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
                <Text className="text-center text-sm text-red-500">
                  {attemptError}
                </Text>
              ) : null}
            </>
          ) : null}
          <Text className="text-center text-xs text-muted">
            Swipe left or right to navigate
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
