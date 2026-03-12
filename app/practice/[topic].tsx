import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Flashcard, SessionCardResult } from "../../lib/types";
import { getCurrentCards } from "../../lib/storage";
import { saveCompletedSession } from "../../lib/storage";
import { speakChinese } from "../../lib/audio";
import { useAuth } from "../../lib/auth-context";
import { createSession, fetchSessions, fetchSessionStats } from "../../lib/api";
import { setCachedSessions, setCachedSessionStats } from "../../lib/storage";

export default function FlashcardPractice() {
  const { topic, topicTitle, language, languageLabel, apiLanguageId, apiCategoryId, apiLoaded } = useLocalSearchParams<{
    topic: string;
    topicTitle?: string;
    language?: string;
    languageLabel?: string;
    apiLanguageId?: string;
    apiCategoryId?: string;
    apiLoaded?: string;
  }>();
  const { profile, session } = useAuth();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<SessionCardResult[]>([]);

  // Swipe animation
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadCards() {
      const stored = await getCurrentCards(topic);
      setCards(stored ?? []);
    }
    loadCards();
  }, [topic]);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;

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

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowAnswer(false);
    }
  }

  function goNext() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
    }
  }

  async function handleResult(knew: boolean) {
    if (!currentCard) return;
    const newResults = [
      ...results,
      {
        cardId: currentCard.id,
        chinese: currentCard.chinese,
        pinyin: currentCard.pinyin,
        english: currentCard.english,
        knew,
      },
    ];
    setResults(newResults);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
    } else {
      const correct = newResults.filter((r) => r.knew).length;
      await saveCompletedSession({
        topic,
        topicTitle: topicTitle ?? topic,
        language: language ?? "",
        languageLabel: languageLabel ?? "",
        cards: newResults,
      });

      // Sync to API in the background — don't block navigation
      if (session?.access_token) {
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
              onPress={() => speakChinese(currentCard.chinese, profile?.audio_speed ?? 1.0)}
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
          {!showAnswer ? (
            <Pressable
              onPress={() => setShowAnswer(true)}
              className="py-4 bg-secondary rounded-2xl items-center"
            >
              <Text className="text-base font-medium text-foreground">
                Reveal Answer
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleResult(false)}
                className="flex-1 py-4 bg-secondary rounded-2xl items-center"
              >
                <Text className="text-base font-medium text-foreground">
                  Didn't Know
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleResult(true)}
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
                  I Knew It
                </Text>
              </Pressable>
            </View>
          )}
          <Text className="text-center text-xs text-muted">
            Swipe left or right to navigate
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
