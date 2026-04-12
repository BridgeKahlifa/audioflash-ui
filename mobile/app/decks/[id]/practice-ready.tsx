import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getSettings, setCurrentCards, setLessonDisplayMode } from "../../../lib/storage";
import { setLessonTraditionalFlashcardFront } from "../../../lib/lesson-card-preferences";
import type { Flashcard, FlashcardDisplayMode } from "../../../lib/types";
import { startDeckPractice } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { useAnalytics } from "../../../lib/analytics";
import { useDeck, useDeckCards, useLanguages } from "../../../lib/queries";
import { DEFAULT_FLASHCARD_DISPLAY_MODE } from "../../../lib/flashcard-display-mode";
import {
  DEFAULT_TRADITIONAL_FLASHCARD_FRONT,
  type TraditionalFlashcardFront,
} from "../../../lib/traditional-flashcard-front";
import { LanguageFlag } from "../../../components/LanguageFlag";

const MIN_CARD_COUNT = 1;
const CARD_COUNT_STEP = 5;

export default function DeckPracticeReady() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth, profile } = useAuth();
  const posthog = useAnalytics();

  const { data: deck, isLoading: deckLoading } = useDeck(deckId ?? "");
  const { data: cards, isLoading: cardsLoading } = useDeckCards(deckId ?? "");
  const { data: languages } = useLanguages();

  const activeCards = cards?.filter((c) => !c.archived_at) ?? [];
  const maxCardCount = activeCards.length;

  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [displayMode, setDisplayMode] = useState<FlashcardDisplayMode>(
    DEFAULT_FLASHCARD_DISPLAY_MODE,
  );
  const displayModeInitializedRef = useRef(false);
  const [traditionalFront, setTraditionalFront] = useState<TraditionalFlashcardFront>(
    DEFAULT_TRADITIONAL_FLASHCARD_FRONT,
  );
  const [cardCount, setCardCount] = useState(
    profile?.cards_per_session ?? Math.min(10, maxCardCount || 10),
  );
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const startLockRef = useRef(false);

  // Clamp cardCount whenever the deck loads or maxCardCount changes
  useEffect(() => {
    if (displayModeInitializedRef.current) return;
    displayModeInitializedRef.current = true;
    getSettings().then((s) => {
      if (s.defaultDisplayMode) setDisplayMode(s.defaultDisplayMode);
    });
  }, []);

  useEffect(() => {
    if (maxCardCount > 0) {
      setCardCount((current) =>
        Math.min(maxCardCount, Math.max(MIN_CARD_COUNT, current)),
      );
    }
  }, [maxCardCount]);

  const languageName = deck
    ? (languages?.find((l) => l.id === deck.language_id)?.language ?? "")
    : "";
  const languageSlug = languageName.toLowerCase().replace(/\s+/g, "-");

  function updateCardCount(direction: 1 | -1) {
    setCardCount((current) =>
      Math.min(maxCardCount, Math.max(MIN_CARD_COUNT, current + direction * CARD_COUNT_STEP)),
    );
  }

  const canStart = !starting && maxCardCount > 0 && !!deck;

  async function handleStart() {
    if (!canStart || startLockRef.current || !deck) return;

    startLockRef.current = true;
    setStarting(true);
    setErrorMessage("");

    try {
      const topicKey = `deck-${deckId}`;

      // Respect card count and shuffle settings
      let selectedCards = [...activeCards];
      if (shuffleEnabled) {
        for (let i = selectedCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [selectedCards[i], selectedCards[j]] = [selectedCards[j], selectedCards[i]];
        }
      }
      selectedCards = selectedCards.slice(0, cardCount);

      const mappedCards: Flashcard[] = selectedCards.map((c, index) => ({
        id: index + 1,
        dbId: c.id,
        sourceText: c.source_text,
        romanization: c.romanization ?? "",
        translation: c.translation,
      }));

      const profileId = profile?.id ?? session?.user?.id;
      let deckSessionId: string | undefined;
      let activityId: string | undefined;

      if (profileId) {
        try {
          const started = await startDeckPractice(session?.access_token, deckId!, {
            profile_id: profileId,
          });
          deckSessionId = started.session_id;
          activityId = started.activity_id;
        } catch {
          // Fall back to local-only practice if the endpoint is unavailable.
        }
      }

      await Promise.all([
        setCurrentCards(topicKey, mappedCards),
        deckSessionId ? setLessonDisplayMode(deckSessionId, displayMode) : Promise.resolve(),
        deckSessionId
          ? setLessonTraditionalFlashcardFront(deckSessionId, traditionalFront)
          : Promise.resolve(),
      ]);

      posthog?.capture("deck_practice_started", {
        deck_id: deckId,
        language: languageName,
        card_count: mappedCards.length,
        requested_card_count: cardCount,
        shuffle: shuffleEnabled,
        display_mode: displayMode,
        traditional_front: traditionalFront,
      });

      router.push({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: deck.name,
          language: languageSlug,
          languageLabel: languageName,
          apiLanguageId: deck.language_id,
          deckId: deck.id,
          deckSessionId,
          activityId,
          apiLoaded: activityId ? "true" : "",
          displayMode,
          traditionalFront,
        },
      });
    } catch (error) {
      console.error("Failed to start deck practice", error);
      setErrorMessage("Couldn't start practice right now. Please try again.");
    } finally {
      setStarting(false);
      startLockRef.current = false;
    }
  }

  const isLoading = deckLoading || cardsLoading;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="px-6 pt-4 pb-2 max-w-md w-full mx-auto flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
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
            {/* Header */}
            <View className="items-center">
              <View className="w-14 h-14 bg-accent rounded-full items-center justify-center mb-4">
                {starting ? (
                  <ActivityIndicator size="large" color="#E86A4A" />
                ) : isLoading ? (
                  <ActivityIndicator size="large" color="#E86A4A" />
                ) : deck?.icon ? (
                  <Text style={{ fontSize: 28 }}>{deck.icon}</Text>
                ) : (
                  <Ionicons name="albums" size={28} color="#E86A4A" />
                )}
              </View>

              {isLoading ? (
                <View className="h-7 w-40 bg-secondary rounded-lg mb-3" />
              ) : (
                <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
                  {deck?.name ?? "Deck"}
                </Text>
              )}

              <View className="flex-row items-center justify-center gap-2">
                <View className="h-8 px-3 rounded-full bg-background border border-border flex-row items-center">
                  {languageName ? (
                    <>
                      <LanguageFlag name={languageName} size="sm" />
                      <Text className="ml-2 text-sm font-semibold text-foreground">
                        {languageName}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-sm font-semibold text-foreground">Language</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setShuffleEnabled((v) => !v)}
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

            {/* Card style */}
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
                    <Text className="text-base font-semibold text-foreground">Audio only</Text>
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

            {/* Card count */}
            <View className="flex-row items-center justify-center">
              <Text className="text-base font-medium text-foreground mr-4">Cards</Text>
              <View className="flex-row items-center">
                <Text className="w-9 text-center text-xl font-semibold text-foreground">
                  {Math.min(cardCount, maxCardCount || cardCount)}
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
                    disabled={starting || cardCount <= MIN_CARD_COUNT}
                    className="w-8 h-7 items-center justify-center"
                    style={{ opacity: cardCount <= MIN_CARD_COUNT ? 0.4 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={16} color="#2F1E19" />
                  </Pressable>
                </View>
              </View>
            </View>

            {maxCardCount > 0 ? (
              <Text className="text-center text-xs text-muted mt-2">
                {maxCardCount} card{maxCardCount !== 1 ? "s" : ""} in this deck
              </Text>
            ) : null}

            {errorMessage ? (
              <Text className="mt-5 text-center text-sm text-primary">{errorMessage}</Text>
            ) : null}

            {/* Start button */}
            <Pressable
              onPress={() => void handleStart()}
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
