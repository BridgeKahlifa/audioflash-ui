import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../lib/auth-context";
import { queryKeys } from "../../../lib/query-keys";
import {
  fetchDeck,
  generateDeckPreview,
  bulkCreateDeckCards,
  type ApiDeck,
  type ApiEphemeralDeckCard,
} from "../../../lib/api";

const CARD_COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [1, 2, 3, 4, 5];

const TOPIC_SUGGESTIONS = [
  "Greetings",
  "Numbers",
  "Food & drink",
  "Directions",
  "Shopping",
  "Weather",
  "Family",
  "Time & dates",
];

export default function DeckGenerate() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");

  const [deck, setDeck] = useState<ApiDeck | null>(null);
  const [topic, setTopic] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [cardCount, setCardCount] = useState(10);
  const [status, setStatus] = useState<"idle" | "generating" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Preview state
  const [previewCards, setPreviewCards] = useState<ApiEphemeralDeckCard[]>([]);
  // acceptedIds: set of _clientIds that are accepted (all accepted by default)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const inPreview = previewCards.length > 0;
  const canGenerate =
    topic.trim().length >= 2 && status !== "generating" && status !== "saving";
  const acceptedCards = previewCards.filter((c) => acceptedIds.has(c._clientId));
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  useEffect(() => {
    if ((!session && !isDevAuth) || !deckId) return;
    fetchDeck(session?.access_token, deckId).then(setDeck).catch(() => null);
  }, [deckId, isDevAuth, session, session?.access_token]);

  async function handleGenerate() {
    if (!canGenerate || (!session && !isDevAuth) || !deckId) return;
    setStatus("generating");
    setErrorMessage("");
    try {
      const result = await generateDeckPreview(session?.access_token, deckId, {
        topic: topic.trim(),
        card_count: cardCount,
        difficulty_level: difficultyLevel,
      });
      setPreviewCards(result.flashcards);
      // All cards accepted by default
      setAcceptedIds(new Set(result.flashcards.map((c) => c._clientId)));
      setStatus("idle");
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

  function toggleAccepted(clientId: string) {
    setAcceptedIds((prev) => {
      const s = new Set(prev);
      if (s.has(clientId)) s.delete(clientId);
      else s.add(clientId);
      return s;
    });
  }

  function handleRemoveCard(clientId: string) {
    setPreviewCards((prev) => prev.filter((c) => c._clientId !== clientId));
    setAcceptedIds((prev) => {
      const s = new Set(prev);
      s.delete(clientId);
      return s;
    });
  }

  async function handleSave() {
    if ((!session && !isDevAuth) || !deckId || acceptedCards.length === 0) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      await bulkCreateDeckCards(session?.access_token, deckId, {
        cards: acceptedCards.map(({ _clientId: _omit, ...card }) => card),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.back();
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't save cards. Please try again.");
    }
  }

  function handleBackToForm() {
    setPreviewCards([]);
    setAcceptedIds(new Set());
    setStatus("idle");
    setErrorMessage("");
  }

  // ── Preview ──────────────────────────────────────────────────────────────────
  if (inPreview) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={handleBackToForm}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                Review Cards
              </Text>
              <Text className="text-muted text-sm">
                {acceptedCards.length} of {previewCards.length} accepted · tap to toggle
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-3"
            showsVerticalScrollIndicator={false}
          >
            {previewCards.map((card) => {
              const isAccepted = acceptedIds.has(card._clientId);
              return (
                <Pressable
                  key={card._clientId}
                  onPress={() => toggleAccepted(card._clientId)}
                  className={`border rounded-2xl px-4 py-4 mb-3 ${
                    isAccepted
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border opacity-50"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-foreground mb-0.5">
                        {card.source_text}
                      </Text>
                      {card.romanization ? (
                        <Text className="text-sm text-primary mb-1">
                          {card.romanization}
                        </Text>
                      ) : null}
                      <Text className="text-sm text-muted">{card.translation}</Text>
                    </View>
                    <View className="items-end gap-2">
                      {isAccepted ? (
                        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View className="w-6 h-6 rounded-full bg-secondary items-center justify-center">
                          <Ionicons name="close" size={14} color="#737373" />
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemoveCard(card._clientId)}
                        hitSlop={8}
                        className="w-7 h-7 rounded-full bg-secondary items-center justify-center"
                      >
                        <Ionicons name="trash-outline" size={14} color="#737373" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {previewCards.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-muted text-sm">All cards removed.</Text>
                <Pressable onPress={handleBackToForm} className="mt-3">
                  <Text className="text-primary text-sm font-semibold">Regenerate</Text>
                </Pressable>
              </View>
            )}

            <View className="h-4" />
          </ScrollView>

          {/* Actions */}
          {previewCards.length > 0 && (
            <View className="px-6 pb-6 pt-3 gap-3">
              <Pressable
                onPress={() => void handleSave()}
                disabled={acceptedCards.length === 0 || status === "saving"}
                className={`py-4 rounded-2xl items-center ${
                  acceptedCards.length > 0 ? "bg-primary" : "bg-secondary"
                }`}
                style={
                  acceptedCards.length > 0
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
                {status === "saving" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      acceptedCards.length > 0
                        ? "text-primary-foreground"
                        : "text-muted"
                    }`}
                  >
                    Save {acceptedCards.length} Card
                    {acceptedCards.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleBackToForm}
                disabled={status === "saving"}
                className="py-3 rounded-2xl items-center bg-secondary"
              >
                <Text className="text-sm font-medium text-muted">Regenerate All</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
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
                Generate Cards
              </Text>
              <Text className="text-muted text-sm">
                {deck ? `For "${deck.name}"` : "AI builds cards from any topic"}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Topic */}
            <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Ordering coffee, At the airport…"
              placeholderTextColor="#A0A0A0"
              maxLength={150}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
              editable={status !== "generating"}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{topic.length}/150</Text>

            {/* Difficulty */}
            <Text className="text-sm font-semibold text-foreground mb-2">Difficulty</Text>
            <View className="flex-row gap-2 mb-5">
              {DIFFICULTY_OPTIONS.map((level) => {
                const selected = difficultyLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setDifficultyLevel(level)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? "text-primary-foreground" : "text-muted"
                      }`}
                    >
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Card count */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Number of Cards
            </Text>
            <View className="flex-row gap-2 mb-5">
              {CARD_COUNT_OPTIONS.map((count) => {
                const selected = cardCount === count;
                return (
                  <Pressable
                    key={count}
                    onPress={() => setCardCount(count)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected ? "text-primary-foreground" : "text-muted"
                      }`}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
                <Text className="text-muted text-sm">Building your cards…</Text>
              </View>
            )}
          </ScrollView>

          {/* Generate button */}
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              className={`py-4 rounded-2xl items-center ${
                canGenerate ? "bg-primary" : "bg-secondary"
              }`}
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
                <Text
                  className={`text-base font-semibold ${
                    canGenerate ? "text-primary-foreground" : "text-muted"
                  }`}
                >
                  Generate Cards
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
